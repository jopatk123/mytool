import { describe, it, expect, vi } from 'vitest';
import { AudioBatchProcessor } from '@main/tools/audio/AudioBatchProcessor';

describe('AudioBatchProcessor', () => {
  it('processes convert and trim operations sequentially', async () => {
    const convertMock = vi.fn().mockResolvedValue('/tmp/converted.wav');
    const trimMock = vi.fn().mockResolvedValue('/tmp/trimmed.wav');

    const processor = new AudioBatchProcessor(
      { convert: convertMock } as never,
      { trim: trimMock } as never,
    );

    const result = await processor.process({
      tasks: [
        {
          sourcePath: '/tmp/source.mp3',
          operations: [
            { type: 'convert', options: { targetFormat: 'wav' } },
            { type: 'trim', options: { startTime: 0, duration: 5 } },
          ],
        },
      ],
      options: { concurrency: 2 },
    });

    expect(convertMock).toHaveBeenCalledWith({
      sourcePath: '/tmp/source.mp3',
      options: expect.objectContaining({ targetFormat: 'wav' }),
    });
    expect(trimMock).toHaveBeenCalledWith({
      sourcePath: '/tmp/converted.wav',
      options: expect.objectContaining({ startTime: 0, duration: 5 }),
    });
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.items[0].outputPaths).toEqual(['/tmp/converted.wav', '/tmp/trimmed.wav']);
  });

  it('captures errors and reports failed items', async () => {
    const error = new Error('conversion failed');
    const convertMock = vi.fn().mockRejectedValue(error);
    const trimMock = vi.fn();

    const processor = new AudioBatchProcessor(
      { convert: convertMock } as never,
      { trim: trimMock } as never,
    );

    const result = await processor.process({
      tasks: [
        {
          sourcePath: '/tmp/source.mp3',
          operations: [{ type: 'convert', options: { targetFormat: 'wav' } }],
        },
      ],
    });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.items[0].errors[0]).toContain('conversion failed');
    expect(trimMock).not.toHaveBeenCalled();
  });

  it('throws when request is invalid', async () => {
    const processor = new AudioBatchProcessor(
      { convert: vi.fn() } as never,
      { trim: vi.fn() } as never,
    );

    await expect(processor.process({ tasks: [] })).rejects.toThrow('缺少有效的批处理任务');
  });
});
