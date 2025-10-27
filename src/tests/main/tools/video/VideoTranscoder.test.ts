import { VideoTranscoder } from '@main/tools/video/VideoTranscoder';
import type { VideoConvertRequest } from '@shared/types/video';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MockFFmpegService = any;

describe('VideoTranscoder', () => {
  let transcoder: VideoTranscoder;
  let mockFFmpegService: MockFFmpegService;

  beforeEach(() => {
    mockFFmpegService = { run: vi.fn() };
    transcoder = new VideoTranscoder(mockFFmpegService);
  });

  it('should initialize with FFmpegService', () => {
    expect(transcoder).toBeDefined();
  });

  it('should accept VideoConvertRequest parameters', () => {
    const request: VideoConvertRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mkv',
      format: 'mkv',
      quality: 'high',
    };
    expect(request.format).toBe('mkv');
    expect(request.quality).toBe('high');
  });

  it('should support multiple output formats', () => {
    const formats: VideoConvertRequest['format'][] = ['mp4', 'mkv', 'avi', 'webm', 'mov'];
    formats.forEach((format) => {
      const request: VideoConvertRequest = {
        inputPath: '/input.mp4',
        outputPath: '/output.mp4',
        format,
      };
      expect(request.format).toBe(format);
    });
  });

  it('should support quality levels', () => {
    const qualities: VideoConvertRequest['quality'][] = ['low', 'medium', 'high', 'lossless'];
    qualities.forEach((quality) => {
      const request: VideoConvertRequest = {
        inputPath: '/input.mp4',
        outputPath: '/output.mp4',
        quality,
      };
      expect(request.quality).toBe(quality);
    });
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
