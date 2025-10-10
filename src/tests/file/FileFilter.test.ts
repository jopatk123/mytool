import { describe, it, expect } from 'vitest';
import { FileFilter } from '@main/tools/file/FileFilter';
import type { FileInfo, FileFilterOptions } from '@shared/types';

describe('FileFilter', () => {
  const mockFiles: FileInfo[] = [
    {
      id: '1',
      name: 'image1.jpg',
      path: '/test/image1.jpg',
      relativePath: 'image1.jpg',
      size: 1024 * 1024, // 1MB
      extension: '.jpg',
      lastModified: Date.now(),
      directory: '/test',
    },
    {
      id: '2',
      name: 'document.pdf',
      path: '/test/document.pdf',
      relativePath: 'document.pdf',
      size: 5 * 1024 * 1024, // 5MB
      extension: '.pdf',
      lastModified: Date.now(),
      directory: '/test',
    },
    {
      id: '3',
      name: 'large-file.zip',
      path: '/test/large-file.zip',
      relativePath: 'large-file.zip',
      size: 150 * 1024 * 1024, // 150MB
      extension: '.zip',
      lastModified: Date.now(),
      directory: '/test',
    },
    {
      id: '4',
      name: 'test-image.png',
      path: '/test/test-image.png',
      relativePath: 'test-image.png',
      size: 2 * 1024 * 1024, // 2MB
      extension: '.png',
      lastModified: Date.now(),
      directory: '/test',
    },
  ];

  describe('applyFilters', () => {
    it('should return all files when no filters are applied', () => {
      const result = FileFilter.applyFilters(mockFiles);
      expect(result).toEqual(mockFiles);
    });

    it('should filter by file size', () => {
      const options: FileFilterOptions = {
        enableSizeFilter: true,
        minSize: 2 * 1024 * 1024, // 2MB
        maxSize: 10 * 1024 * 1024, // 10MB
      };

      const result = FileFilter.applyFilters(mockFiles, options);
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.id)).toContain('2'); // document.pdf 5MB
      expect(result.map((f) => f.id)).toContain('4'); // test-image.png 2MB
    });

    it('should filter by extension', () => {
      const options: FileFilterOptions = {
        enableExtensionFilter: true,
        extensions: ['.jpg', '.png'],
      };

      const result = FileFilter.applyFilters(mockFiles, options);
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.extension)).toContain('.jpg');
      expect(result.map((f) => f.extension)).toContain('.png');
    });

    it('should filter by name keyword', () => {
      const options: FileFilterOptions = {
        enableNameFilter: true,
        nameKeyword: 'test',
      };

      const result = FileFilter.applyFilters(mockFiles, options);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-image.png');
    });

    it('should apply multiple filters', () => {
      const options: FileFilterOptions = {
        enableSizeFilter: true,
        maxSize: 10 * 1024 * 1024, // 10MB
        enableExtensionFilter: true,
        extensions: ['.jpg', '.png'],
      };

      const result = FileFilter.applyFilters(mockFiles, options);
      expect(result).toHaveLength(2); // image1.jpg (1MB) and test-image.png (2MB)
    });
  });

  describe('matchesFilter', () => {
    it('should return true when no filters are applied', () => {
      expect(FileFilter.matchesFilter(mockFiles[0])).toBe(true);
    });

    it('should check size filter', () => {
      const options: FileFilterOptions = {
        enableSizeFilter: true,
        minSize: 2 * 1024 * 1024,
        maxSize: 10 * 1024 * 1024,
      };

      expect(FileFilter.matchesFilter(mockFiles[0], options)).toBe(false); // 1MB, below min
      expect(FileFilter.matchesFilter(mockFiles[1], options)).toBe(true); // 5MB
      expect(FileFilter.matchesFilter(mockFiles[2], options)).toBe(false); // 150MB, above max
    });

    it('should check extension filter', () => {
      const options: FileFilterOptions = {
        enableExtensionFilter: true,
        extensions: ['.jpg', '.png'],
      };

      expect(FileFilter.matchesFilter(mockFiles[0], options)).toBe(true); // .jpg
      expect(FileFilter.matchesFilter(mockFiles[1], options)).toBe(false); // .pdf
    });

    it('should check name keyword filter', () => {
      const options: FileFilterOptions = {
        enableNameFilter: true,
        nameKeyword: 'image',
      };

      expect(FileFilter.matchesFilter(mockFiles[0], options)).toBe(true); // image1.jpg
      expect(FileFilter.matchesFilter(mockFiles[1], options)).toBe(false); // document.pdf
      expect(FileFilter.matchesFilter(mockFiles[3], options)).toBe(true); // test-image.png
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(FileFilter.formatFileSize(0)).toBe('0 B');
      expect(FileFilter.formatFileSize(500)).toBe('500.00 B');
      expect(FileFilter.formatFileSize(1024)).toBe('1.00 KB');
      expect(FileFilter.formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(FileFilter.formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('getExtension', () => {
    it('should extract file extension', () => {
      expect(FileFilter.getExtension('/path/to/file.txt')).toBe('.txt');
      expect(FileFilter.getExtension('/path/to/file.tar.gz')).toBe('.gz');
      expect(FileFilter.getExtension('/path/to/file')).toBe('');
    });
  });
});
