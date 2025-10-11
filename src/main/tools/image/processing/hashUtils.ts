import { randomUUID, createHash } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';

const normalizeExtension = (value: string): string => {
  if (!value) {
    return '';
  }
  return value.startsWith('.') ? value.slice(1).toLowerCase() : value.toLowerCase();
};

const computeHash = async (
  filePath: string,
  algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256',
): Promise<string> => {
  const hash = createHash(algorithm ?? 'sha256');
  return await new Promise<string>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
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
  if (
    buffer.length < 12 ||
    buffer.slice(0, 4).toString('ascii') !== 'RIFF' ||
    buffer.slice(8, 12).toString('ascii') !== 'WEBP'
  ) {
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
  const payload =
    `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
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
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export { applyHashRefresh, computeHash, normalizeExtension };
