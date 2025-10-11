import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppErrorCode } from '@shared/errors';
import { AudioTool } from '@main/tools/AudioTool';
import type { AudioBatchResult } from '@shared/types/audio';

const createMocks = () => {
  return {
    scanner: { scan: vi.fn() },
    transcoder: { convert: vi.fn() },
    trimmer: { trim: vi.fn() },
    batchProcessor: { process: vi.fn() },
    merger: { merge: vi.fn() },
    previewService: { createPreview: vi.fn() },
  } as const;
};

describe('AudioTool', () => {
  let mocks: ReturnType<typeof createMocks>;
  let tool: AudioTool;

  beforeEach(() => {
    mocks = createMocks();
    tool = new AudioTool({
      scanner: mocks.scanner as never,
      transcoder: mocks.transcoder as never,
      trimmer: mocks.trimmer as never,
      batchProcessor: mocks.batchProcessor as never,
      merger: mocks.merger as never,
      previewService: mocks.previewService as never,
    });
  });

  it('delegates scan action to scanner', async () => {
    const scanResult = { scanId: 'scan', directory: '/tmp', files: [], totalFiles: 0, filteredFiles: 0 };
    mocks.scanner.scan.mockResolvedValue(scanResult);

    const result = await tool.execute('scan', { directory: '/tmp' });

    expect(mocks.scanner.scan).toHaveBeenCalledWith({ directory: '/tmp' });
    expect(result).toBe(scanResult);
  });

  it('delegates convert action to transcoder and strips nested action field', async () => {
    mocks.transcoder.convert.mockResolvedValue('/tmp/out.wav');

    const result = await tool.execute('convert', {
      action: 'convert',
      sourcePath: '/tmp/in.mp3',
      options: { targetFormat: 'wav' },
    });

    expect(mocks.transcoder.convert).toHaveBeenCalledWith({
      sourcePath: '/tmp/in.mp3',
      options: { targetFormat: 'wav' },
    });
    expect(result).toBe('/tmp/out.wav');
  });

  it('delegates batchProcess action to batch processor', async () => {
    const batchResult: AudioBatchResult = { total: 1, succeeded: 1, failed: 0, items: [] };
    mocks.batchProcessor.process.mockResolvedValue(batchResult);

    const result = await tool.execute('batchProcess', {
      tasks: [{ sourcePath: '/tmp/in.mp3', operations: [] }],
    });

    expect(mocks.batchProcessor.process).toHaveBeenCalled();
    expect(result).toBe(batchResult);
  });

  it('delegates preview action to preview service', async () => {
    const preview = { fileUrl: 'local-file:///tmp/in.mp3', mimeType: 'audio/mpeg', path: '/tmp/in.mp3' };
    mocks.previewService.createPreview.mockResolvedValue(preview);

    const result = await tool.execute('preview', { sourcePath: '/tmp/in.mp3' });

    expect(mocks.previewService.createPreview).toHaveBeenCalledWith('/tmp/in.mp3');
    expect(result).toBe(preview);
  });

  it('throws on unknown action', async () => {
    await expect(tool.execute('unknown', {})).rejects.toMatchObject({
      code: AppErrorCode.INVALID_ARGUMENT,
    });
  });
});
