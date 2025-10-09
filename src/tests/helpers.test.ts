import { describe, it, expect } from 'vitest';
import { formatFileSize, formatDate, getFileExtension } from '../shared/utils/helpers';

describe('Helper Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('getFileExtension', () => {
    it('should get file extension', () => {
      expect(getFileExtension('test.txt')).toBe('txt');
      expect(getFileExtension('image.png')).toBe('png');
      expect(getFileExtension('noextension')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('file.tar.gz')).toBe('gz');
    });

    it('should be case insensitive', () => {
      expect(getFileExtension('TEST.PNG')).toBe('png');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const timestamp = new Date('2024-01-01').getTime();
      const formatted = formatDate(timestamp);
      expect(formatted).toContain('2024');
    });
  });
});
