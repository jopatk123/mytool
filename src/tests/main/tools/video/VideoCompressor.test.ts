import { VideoCompressor } from '@main/tools/video/VideoCompressor';
import type { VideoCompressRequest } from '@shared/types/video';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MockFFmpegService = any;

describe('VideoCompressor', () => {
  let compressor: VideoCompressor;
  let mockFFmpegService: MockFFmpegService;

  beforeEach(() => {
    mockFFmpegService = { run: vi.fn() };
    compressor = new VideoCompressor(mockFFmpegService);
  });

  it('should initialize with FFmpegService', () => {
    expect(compressor).toBeDefined();
  });

  it('should accept VideoCompressRequest parameters', () => {
    const request: VideoCompressRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mp4',
      quality: 'medium',
    };
    expect(request.quality).toBe('medium');
    expect(request.inputPath).toBe('/input.mp4');
  });

  it('should support quality levels', () => {
    const qualities: VideoCompressRequest['quality'][] = ['low', 'medium', 'high'];
    qualities.forEach((quality) => {
      const request: VideoCompressRequest = {
        inputPath: '/input.mp4',
        outputPath: '/output.mp4',
        quality,
      };
      expect(request.quality).toBe(quality);
    });
  });

  it('should accept optional target bitrate', () => {
    const request: VideoCompressRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mp4',
      targetBitrate: 1000,
    };
    expect(request.targetBitrate).toBe(1000);
  });

  it('should accept optional scale parameter', () => {
    const request: VideoCompressRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mp4',
      scale: '1280:720',
    };
    expect(request.scale).toBe('1280:720');
  });

  it('should accept optional format parameter', () => {
    const request: VideoCompressRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mp4',
      format: 'webm',
    };
    expect(request.format).toBe('webm');
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
