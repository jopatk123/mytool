import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { AudioScanner } from '@main/tools/audio/AudioScanner';
import { parseFile } from 'music-metadata';

describe('AudioScanner', () => {
  let tempDir: string;

  beforeAll(async () => {
    const parseFileMock = vi.mocked(parseFile);
    parseFileMock.mockReset();
    parseFileMock.mockResolvedValue({
      format: {
        duration: 12,
        bitrate: 128000,
        sampleRate: 44100,
        numberOfChannels: 2,
        codec: 'mp3',
        container: 'mp3',
      },
      common: {},
    });
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'audio-scanner-test-'));
    await fs.writeFile(path.join(tempDir, 'track.mp3'), 'dummy');
    await fs.writeFile(path.join(tempDir, 'notes.txt'), 'not audio');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('scans directory and returns audio files only', async () => {
    const scanner = new AudioScanner();
    const result = await scanner.scan({ directory: tempDir });

    expect(result.files.length).toBe(1);
    expect(result.files[0]?.name).toBe('track.mp3');
    expect(result.filteredFiles).toBe(1);
  });
});
