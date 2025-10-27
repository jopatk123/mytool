import type {
    VideoBatchRequest,
    VideoCompressRequest,
    VideoConvertRequest,
    VideoScanRequest,
    VideoScanResult,
    VideoTrimRequest,
} from '@shared/types/video';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoTool } from '../main/tools/VideoTool';
import { VideoBatchProcessor } from '../main/tools/video/VideoBatchProcessor';
import { VideoCompressor } from '../main/tools/video/VideoCompressor';
import { VideoFrameExtractor } from '../main/tools/video/VideoFrameExtractor';
import { VideoInfoExtractor } from '../main/tools/video/VideoInfoExtractor';
import { VideoScanner } from '../main/tools/video/VideoScanner';
import { VideoTranscoder } from '../main/tools/video/VideoTranscoder';
import { VideoTrimmer } from '../main/tools/video/VideoTrimmer';

describe('VideoTool', () => {
  let videoTool: VideoTool;

  beforeEach(() => {
    videoTool = new VideoTool();
  });

  it('should initialize without errors', async () => {
    await expect(videoTool.initialize()).resolves.not.toThrow();
  });

  it('should have correct config', () => {
    expect(videoTool.config.id).toBe('video-tool');
    expect(videoTool.config.name).toBe('视频处理工具');
    expect(videoTool.config.category).toBe('video');
    expect(videoTool.config.enabled).toBe(true);
    expect(videoTool.config.icon).toBe('🎬');
  });

  it('should execute scan action', async () => {
    const params: VideoScanRequest = {
      directory: '/tmp',
      recursive: false,
    };

    const result = await videoTool.execute('scan', params);

    expect(result).toBeDefined();
    const scanResult = result as VideoScanResult;
    expect(scanResult.directory).toBe('/tmp');
    expect(scanResult.totalFiles).toBeGreaterThanOrEqual(0);
  });

  it('should handle invalid scan parameters', async () => {
    const params = { invalid: 'params' };

    await expect(videoTool.execute('scan', params)).rejects.toThrow();
  });

  it('should handle unknown action', async () => {
    await expect(videoTool.execute('unknownAction', {})).rejects.toThrow();
  });

  it('should cleanup without errors', () => {
    expect(() => videoTool.cleanup()).not.toThrow();
  });
});

describe('VideoScanner', () => {
  let scanner: VideoScanner;

  beforeEach(() => {
    scanner = new VideoScanner();
  });

  it('should scan directory', async () => {
    const result = await scanner.scan({
      directory: '/tmp',
      recursive: false,
    });

    expect(result.directory).toBe('/tmp');
    expect(result.totalFiles).toBeGreaterThanOrEqual(0);
    expect(result.filteredFiles).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.videos)).toBe(true);
  });

  it('should handle recursive scanning', async () => {
    const result = await scanner.scan({
      directory: '/tmp',
      recursive: true,
    });

    expect(result.directory).toBe('/tmp');
    expect(Array.isArray(result.videos)).toBe(true);
  });
});

describe('VideoTranscoder', () => {
  let transcoder: VideoTranscoder;

  beforeEach(() => {
    transcoder = new VideoTranscoder();
  });

  it.skip('should convert video', async () => {
    const request: VideoConvertRequest = {
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.mkv',
      format: 'mkv',
      quality: 'high',
    };

    const result = await transcoder.convert(request);

    expect(result).toBe('/tmp/output.mkv');
  });

  it.skip('should handle different formats', async () => {
    const formats: Array<'mp4' | 'mkv' | 'avi' | 'webm' | 'mov'> = [
      'mp4',
      'mkv',
      'webm',
      'mov',
    ];

    for (const format of formats) {
      const request: VideoConvertRequest = {
        inputPath: '/tmp/input.mp4',
        outputPath: `/tmp/output.${format}`,
        format,
        quality: 'medium',
      };

      const result = await transcoder.convert(request);
      expect(result).toBe(`/tmp/output.${format}`);
    }
  });

  it.skip('should handle different quality presets', async () => {
    const qualities: Array<'low' | 'medium' | 'high' | 'lossless'> = [
      'low',
      'medium',
      'high',
      'lossless',
    ];

    for (const quality of qualities) {
      const request: VideoConvertRequest = {
        inputPath: '/tmp/input.mp4',
        outputPath: '/tmp/output.mp4',
        format: 'mp4',
        quality,
      };

      const result = await transcoder.convert(request);
      expect(result).toBe('/tmp/output.mp4');
    }
  });
});

describe('VideoTrimmer', () => {
  let trimmer: VideoTrimmer;

  beforeEach(() => {
    trimmer = new VideoTrimmer();
  });

  it.skip('should trim video', async () => {
    const request: VideoTrimRequest = {
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.mp4',
      startTime: 10,
      endTime: 30,
    };

    const result = await trimmer.trim(request);

    expect(result).toBe('/tmp/output.mp4');
  });

  it('should reject invalid time range', async () => {
    const request: VideoTrimRequest = {
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.mp4',
      startTime: 30,
      endTime: 10, // startTime >= endTime
    };

    await expect(trimmer.trim(request)).rejects.toThrow();
  });

  it('should reject negative time values', async () => {
    const request: VideoTrimRequest = {
      inputPath: '/tmp/input.mp4',
      outputPath: '/tmp/output.mp4',
      startTime: -5,
      endTime: 10,
    };

    await expect(trimmer.trim(request)).rejects.toThrow();
  });
});

describe('VideoInfoExtractor', () => {
  let extractor: VideoInfoExtractor;

  beforeEach(() => {
    extractor = new VideoInfoExtractor();
  });

  it.skip('should extract video info', async () => {
    const result = await extractor.extract('/tmp/video.mp4');

    expect(result.file).toBe('/tmp/video.mp4');
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.width).toBeGreaterThanOrEqual(0);
    expect(result.height).toBeGreaterThanOrEqual(0);
    expect(result.fps).toBeGreaterThanOrEqual(0);
    expect(typeof result.codec).toBe('string');
    expect(result.bitrate).toBeGreaterThanOrEqual(0);
  });
});

describe('VideoFrameExtractor', () => {
  let extractor: VideoFrameExtractor;

  beforeEach(() => {
    extractor = new VideoFrameExtractor();
  });

  it.skip('should extract frames', async () => {
    const result = await extractor.extractFrames({
      inputPath: '/tmp/video.mp4',
      outputDir: '/tmp/frames',
      interval: 1,
    });

    expect(result.outputDir).toBe('/tmp/frames');
    expect(result.totalFrames).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.frameFiles)).toBe(true);
  });

  it.skip('should extract frames with custom interval', async () => {
    const result = await extractor.extractFrames({
      inputPath: '/tmp/video.mp4',
      outputDir: '/tmp/frames',
      interval: 2,
      startTime: 0,
      endTime: 60,
    });

    expect(result.outputDir).toBe('/tmp/frames');
    expect(Array.isArray(result.frameFiles)).toBe(true);
  });
});

describe('VideoBatchProcessor', () => {
  let processor: VideoBatchProcessor;

  beforeEach(() => {
    processor = new VideoBatchProcessor();
  });

  it('should process batch convert', async () => {
    const request: VideoBatchRequest = {
      files: ['/tmp/video1.mp4', '/tmp/video2.mp4'],
      operation: 'convert',
      params: {
        inputPath: '',
        outputPath: '/tmp/output.mkv',
        format: 'mkv',
      } as VideoConvertRequest,
    };

    const result = await processor.process(request);

    expect(result.successful).toBeGreaterThanOrEqual(0);
    expect(result.failed).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(2);
  });

  it('should process batch trim', async () => {
    const request: VideoBatchRequest = {
      files: ['/tmp/video1.mp4'],
      operation: 'trim',
      params: {
        inputPath: '',
        outputPath: '/tmp/output.mp4',
        startTime: 10,
        endTime: 30,
      } as VideoTrimRequest,
    };

    const result = await processor.process(request);

    expect(result.successful + result.failed).toBe(1);
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('should process batch frame extraction', async () => {
    const request: VideoBatchRequest = {
      files: ['/tmp/video1.mp4'],
      operation: 'extractFrames',
      params: {
        inputPath: '',
        outputDir: '/tmp/frames',
        interval: 1,
      } as unknown as VideoConvertRequest,
    };

    const result = await processor.process(request);

    expect(result.successful + result.failed).toBe(1);
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('should process batch compression', async () => {
    const mockCompressor: Pick<VideoCompressor, 'compress'> = {
      compress: vi.fn().mockResolvedValue({
        success: true,
        inputPath: '/tmp/video1.mp4',
        outputPath: '/tmp/video1_compressed.mp4',
        originalSize: 1024,
        compressedSize: 512,
        compressionRatio: 50,
        message: '压缩成功',
      }),
    };

    const customProcessor = new VideoBatchProcessor({ compressor: mockCompressor as VideoCompressor });

    const request: VideoBatchRequest = {
      files: ['/tmp/video1.mp4'],
      operation: 'compress',
      params: {
        inputPath: '',
        outputPath: '/tmp/video1_compressed.mp4',
        quality: 'medium',
      } as VideoCompressRequest,
    };

    const result = await customProcessor.process(request);

    expect(mockCompressor.compress).toHaveBeenCalledTimes(1);
    expect(mockCompressor.compress).toHaveBeenCalledWith({
      inputPath: '/tmp/video1.mp4',
      outputPath: '/tmp/video1_compressed.mp4',
      quality: 'medium',
    });
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results[0]).toEqual({
      file: '/tmp/video1.mp4',
      success: true,
      output: '/tmp/video1_compressed.mp4',
    });
  });
});

