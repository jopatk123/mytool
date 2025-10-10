import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { FileExporter } from '@main/tools/file/FileExporter';
import type { FileInfo, FileExportRequest } from '@shared/types';

vi.mock('fs/promises');

describe('FileExporter', () => {
  const mockFiles: FileInfo[] = [
    {
      id: '1',
      name: 'test1.txt',
      path: '/test/test1.txt',
      relativePath: 'test1.txt',
      size: 1024,
      extension: '.txt',
      lastModified: 1640000000000,
      directory: '/test',
    },
    {
      id: '2',
      name: 'test2.pdf',
      path: '/test/test2.pdf',
      relativePath: 'test2.pdf',
      size: 2048,
      extension: '.pdf',
      lastModified: 1640000001000,
      directory: '/test',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportToCSV', () => {
    it('should export files to CSV format', async () => {
      const request: FileExportRequest = {
        files: mockFiles,
        outputPath: '/test/output.csv',
      };

      vi.mocked(fs.writeFile).mockResolvedValue();

      await FileExporter.exportToCSV(request);

      expect(fs.writeFile).toHaveBeenCalledWith(
        request.outputPath,
        expect.stringContaining('完整路径'),
        'utf-8'
      );
    });

    it('should include BOM for UTF-8', async () => {
      const request: FileExportRequest = {
        files: mockFiles,
        outputPath: '/test/output.csv',
      };

      vi.mocked(fs.writeFile).mockResolvedValue();

      await FileExporter.exportToCSV(request);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const content = writeCall[1] as string;
      
      // Check BOM
      expect(content.charCodeAt(0)).toBe(0xFEFF);
    });
  });

  describe('generateDefaultFileName', () => {
    it('should generate valid filename with timestamp', () => {
      const filename = FileExporter.generateDefaultFileName();
      
      expect(filename).toMatch(/^file-list-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    });
  });
});
