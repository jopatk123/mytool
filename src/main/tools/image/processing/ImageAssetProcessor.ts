import { createReadStream, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import type {
  ImageAsset,
  ImageBatchOperation,
  ImageJobItemResult,
} from '../../../../shared/types';
import { JobOptions } from '../job/JobOptions';

type HashRenameOperation = Extract<ImageBatchOperation, { type: 'hashRename' }>;
type OperationType = ImageBatchOperation['type'];

export interface ImageAssetProcessorConfig {
  jobId: string;
  options: JobOptions;
  operations: ImageBatchOperation[];
}

export class ImageAssetProcessor {
  private readonly jobId: string;
  private readonly options: JobOptions;
  private readonly operations: ImageBatchOperation[];

  constructor(config: ImageAssetProcessorConfig) {
    this.jobId = config.jobId;
    this.options = config.options;
    this.operations = config.operations;
  }

  async process(asset: ImageAsset): Promise<ImageJobItemResult> {
    if (this.options.dryRun) {
      return {
        assetId: asset.id,
        originalPath: asset.filePath,
        outputPath: asset.filePath,
        operationsApplied: this.operations.map(operation => operation.type),
      };
    }

  let workingPath = asset.filePath;
  let workingPathIsTemp = false;
    const warnings: string[] = [];
    const operationsApplied: OperationType[] = [];

    const resizeOp = this.operations.find(op => op.type === 'resize');
    const compressOp = this.operations.find(op => op.type === 'compress');
  const hashOp = this.operations.find(op => op.type === 'hashRename') as HashRenameOperation | undefined;

  const normalizedOriginalExt = normalizeExtension(asset.extension);

  let finalExtension = asset.extension;
  let targetFormat = asset.extension;

    if (compressOp?.type === 'compress') {
      targetFormat = guessExtension(compressOp.targetFormat, finalExtension);
      if (hashOp) {
        if (normalizeExtension(targetFormat) !== normalizedOriginalExt) {
          warnings.push('哈希刷新时将保留原始格式，已忽略压缩操作中指定的输出格式');
        }
        targetFormat = normalizedOriginalExt;
        finalExtension = asset.extension;
      } else if (!this.options.overwrite || this.options.outputDirectory) {
        finalExtension = targetFormat;
      }
    }

    if (resizeOp || compressOp) {
      const pipeline = sharp(asset.filePath, { failOn: 'none' });

      if (resizeOp?.type === 'resize') {
        pipeline.resize({
          width: resizeOp.width,
          height: resizeOp.height,
          fit: resizeOp.fit ?? 'cover',
          withoutEnlargement: resizeOp.withoutEnlargement ?? true,
          fastShrinkOnLoad: true,
        });
        operationsApplied.push('resize');
      }

      if (compressOp?.type === 'compress') {
        const quality = clampQuality(compressOp.quality);
        const sharpFormat = normalizeSharpFormat(targetFormat) ?? 'jpeg';

        switch (sharpFormat) {
          case 'jpeg':
            pipeline.jpeg({ quality, mozjpeg: true });
            break;
          case 'png':
            pipeline.png({ compressionLevel: Math.round((9 * (100 - quality)) / 100) });
            break;
          case 'webp':
            pipeline.webp({ quality });
            break;
          default:
            pipeline.toFormat(sharpFormat);
            warnings.push(`格式 ${sharpFormat} 不支持自定义压缩质量，已使用默认配置`);
            break;
        }

        operationsApplied.push('compress');
      }

      const tempPath = createTempFilePath(this.jobId, targetFormat);
      await ensureDirectory(path.dirname(tempPath));
      await pipeline.toFile(tempPath);
      workingPath = tempPath;
      workingPathIsTemp = true;
    }

    let outputPath = hashOp ? asset.filePath : buildOutputPath(asset, this.options, finalExtension);

    const shouldOverwrite = hashOp ? true : this.options.overwrite;
    if (!shouldOverwrite) {
      outputPath = await generateUniquePath(outputPath);
    }

    if (hashOp && !workingPathIsTemp) {
      const tempPath = createTempFilePath(this.jobId, finalExtension);
      await ensureDirectory(path.dirname(tempPath));
      await fs.copyFile(workingPath, tempPath);
      workingPath = tempPath;
      workingPathIsTemp = true;
    }

    if (hashOp) {
      await applyHashRefresh(workingPath, finalExtension);
      operationsApplied.push('hashRename');
    }

    if (workingPath !== outputPath) {
      await moveFileSafe(workingPath, outputPath, shouldOverwrite);
      workingPathIsTemp = false;
    } else if (!hashOp && outputPath !== asset.filePath) {
      await ensureDirectory(path.dirname(outputPath));
      await fs.copyFile(asset.filePath, outputPath);
    }

    let hash: string | undefined;
    if (hashOp) {
      hash = await computeHash(outputPath, hashOp.algorithm);
    }

    return {
      assetId: asset.id,
      originalPath: asset.filePath,
      outputPath,
      operationsApplied,
      hash,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

const ensureDirectory = async (targetDir: string): Promise<void> => {
  await fs.mkdir(targetDir, { recursive: true });
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const moveFileSafe = async (tempPath: string, destination: string, overwrite: boolean): Promise<void> => {
  await ensureDirectory(path.dirname(destination));

  if (!overwrite) {
    const exists = await fileExists(destination);
    if (exists) {
      throw new Error(`目标文件已存在: ${destination}`);
    }
  }

  await fs.rename(tempPath, destination);
};

const createTempFilePath = (jobId: string, extension: string): string => {
  const normalized = extension.startsWith('.') ? extension : `.${extension}`;
  const safeExt = normalized === '.' ? '' : normalized;
  return path.join(tmpdir(), `${jobId}-${randomUUID()}${safeExt}`);
};

const guessExtension = (format: string | undefined, fallback: string): string => {
  if (!format) return fallback;
  return format.toLowerCase();
};

const normalizeSharpFormat = (format: string): keyof sharp.FormatEnum | null => {
  const lower = format.toLowerCase();
  if (lower === 'jpg') return 'jpeg';
  if (lower === 'tif') return 'tiff';
  if (lower === 'svg') return null;
  if (lower in sharp.format) {
    return lower as keyof sharp.FormatEnum;
  }
  return null;
};

const clampQuality = (value: number | undefined, fallback = 80): number => {
  if (typeof value !== 'number') return fallback;
  return ensureWithin(Math.round(value), 1, 100);
};

const ensureWithin = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const buildOutputPath = (asset: ImageAsset, options: JobOptions, extension: string): string => {
  const baseDir = options.outputDirectory ? path.resolve(options.outputDirectory) : path.dirname(asset.filePath);
  const relativeDir = options.outputDirectory ? path.dirname(asset.relativePath) : '';
  const directory = options.outputDirectory ? path.join(baseDir, relativeDir) : baseDir;
  const fileName = path.basename(asset.filePath, path.extname(asset.filePath));
  const finalExt = extension.startsWith('.') ? extension : `.${extension}`;
  return path.join(directory, `${fileName}${finalExt}`);
};

const generateUniquePath = async (filePath: string): Promise<string> => {
  if (!(await fileExists(filePath))) {
    return filePath;
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);

  for (let i = 1; i < 1000; i += 1) {
    const candidate = path.join(dir, `${name}_${i}${ext}`);
    if (!(await fileExists(candidate))) {
      return candidate;
    }
  }

  throw new Error('无法为文件生成唯一名称');
};

const computeHash = async (filePath: string, algorithm: HashRenameOperation['algorithm'] = 'sha256'): Promise<string> => {
  const hash = createHash(algorithm ?? 'sha256');
  return await new Promise<string>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};
const normalizeExtension = (value: string): string => {
  if (!value) {
    return '';
  }
  return value.startsWith('.') ? value.slice(1).toLowerCase() : value.toLowerCase();
};

const applyHashRefresh = async (filePath: string, extension: string): Promise<void> => {
  const normalized = normalizeExtension(extension);
  const marker = `hash-refresh:${randomUUID()}`;

  switch (normalized) {
    case 'jpeg':
    case 'jpg':
      await injectJpegComment(filePath, marker);
      return;
    case 'png':
      await injectPngTextChunk(filePath, marker);
      return;
    case 'webp':
      await injectWebpMetadataChunk(filePath, marker);
      return;
    default: {
      const payload = Buffer.from(`\n${marker}\n`, 'utf8');
      await fs.appendFile(filePath, payload);
    }
  }
};

const injectJpegComment = async (filePath: string, marker: string): Promise<void> => {
  const buffer = await fs.readFile(filePath);
  if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    await fs.appendFile(filePath, Buffer.from(`\n${marker}\n`, 'utf8'));
    return;
  }

  const commentData = Buffer.from(marker, 'utf8');
  const length = commentData.length + 2;
  const segment = Buffer.concat([
    Buffer.from([0xff, 0xfe, (length >> 8) & 0xff, length & 0xff]),
    commentData,
  ]);

  const result = Buffer.concat([buffer.slice(0, 2), segment, buffer.slice(2)]);
  await fs.writeFile(filePath, result);
};

const injectPngTextChunk = async (filePath: string, marker: string): Promise<void> => {
  const buffer = await fs.readFile(filePath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < signature.length || !buffer.slice(0, 8).equals(signature)) {
    await fs.appendFile(filePath, Buffer.from(`\n${marker}\n`, 'utf8'));
    return;
  }

  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.slice(offset + 4, offset + 8).toString('ascii');
    if (chunkType === 'IEND') {
      const keyword = Buffer.from('Comment', 'utf8');
      const nullSeparator = Buffer.from([0]);
      const text = Buffer.from(marker, 'utf8');
      const data = Buffer.concat([keyword, nullSeparator, text]);
      const dataLength = data.length;
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32BE(dataLength, 0);
      const typeBuffer = Buffer.from('tEXt', 'ascii');
      const crcValue = crc32(Buffer.concat([typeBuffer, data]));
      const crcBuffer = Buffer.alloc(4);
      crcBuffer.writeUInt32BE(crcValue >>> 0, 0);
      const newChunk = Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
      const before = buffer.slice(0, offset);
      const after = buffer.slice(offset);
      const result = Buffer.concat([before, newChunk, after]);
      await fs.writeFile(filePath, result);
      return;
    }
    offset += 8 + chunkLength + 4;
  }

  await fs.appendFile(filePath, Buffer.from(`\n${marker}\n`, 'utf8'));
};

const injectWebpMetadataChunk = async (filePath: string, marker: string): Promise<void> => {
  const buffer = await fs.readFile(filePath);
  if (buffer.length < 12 || buffer.slice(0, 4).toString('ascii') !== 'RIFF' || buffer.slice(8, 12).toString('ascii') !== 'WEBP') {
    await fs.appendFile(filePath, Buffer.from(`\n${marker}\n`, 'utf8'));
    return;
  }

  const packet = createXmpPacket(marker);
  const chunkHeader = Buffer.alloc(8);
  chunkHeader.write('XMP ', 0, 'ascii');
  chunkHeader.writeUInt32LE(packet.length, 4);
  const pad = packet.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);

  const updated = Buffer.from(buffer);
  const newSize = buffer.length - 8 + chunkHeader.length + packet.length + pad.length;
  updated.writeUInt32LE(newSize, 4);

  const result = Buffer.concat([updated, chunkHeader, packet, pad]);
  await fs.writeFile(filePath, result);
};

const createXmpPacket = (marker: string): Buffer => {
  const payload = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">` +
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<dc:description>` +
    `<rdf:Alt>` +
    `<rdf:li xml:lang="x-default">${marker}</rdf:li>` +
    `</rdf:Alt>` +
    `</dc:description>` +
    `</rdf:Description>` +
    `</rdf:RDF>` +
    `</x:xmpmeta>` +
    `<?xpacket end="w"?>`;
  return Buffer.from(payload, 'utf8');
};

const crc32 = (data: Buffer): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    const byte = data[i];
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();
