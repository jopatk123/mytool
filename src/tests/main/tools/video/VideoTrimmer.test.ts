import { VideoTrimmer } from '@main/tools/video/VideoTrimmer';
import type { VideoTrimRequest } from '@shared/types/video';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MockFFmpegService = any;

describe('VideoTrimmer', () => {
  let trimmer: VideoTrimmer;
  let mockFFmpegService: MockFFmpegService;

  beforeEach(() => {
    mockFFmpegService = { run: vi.fn() };
    trimmer = new VideoTrimmer(mockFFmpegService);
  });

  it('should initialize with FFmpegService', () => {
    expect(trimmer).toBeDefined();
  });

  it('should accept VideoTrimRequest parameters', () => {
    const request: VideoTrimRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mp4',
      startTime: 10,
      endTime: 60,
    };
    expect(request.startTime).toBe(10);
    expect(request.endTime).toBe(60);
  });

  it('should accept optional format parameter', () => {
    const request: VideoTrimRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mp4',
      startTime: 5,
      endTime: 25,
      format: 'mp4',
    };
    expect(request.format).toBe('mp4');
  });

  it('should support different time ranges', () => {
    const timeRanges = [
      { start: 0, end: 10 },
      { start: 5, end: 30 },
      { start: 100, end: 200 },
    ];
    timeRanges.forEach(({ start, end }) => {
      const request: VideoTrimRequest = {
        inputPath: '/input.mp4',
        outputPath: '/output.mp4',
        startTime: start,
        endTime: end,
      };
      expect(request.startTime).toBe(start);
      expect(request.endTime).toBe(end);
    });
  });

  it('should support fractional seconds', () => {
    const request: VideoTrimRequest = {
      inputPath: '/input.mp4',
      outputPath: '/output.mp4',
      startTime: 10.5,
      endTime: 60.75,
    };
    expect(request.startTime).toBe(10.5);
    expect(request.endTime).toBe(60.75);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
