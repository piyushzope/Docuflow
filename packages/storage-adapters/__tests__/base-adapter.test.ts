import { describe, it, expect, beforeEach } from 'vitest';
import { BaseStorageAdapter } from '../src/base-adapter';

// Create a test implementation of BaseStorageAdapter
class TestAdapter extends BaseStorageAdapter {
  async uploadFile(): Promise<{ path: string; url?: string }> {
    return { path: 'test/path' };
  }
  
  async downloadFile(): Promise<Buffer> {
    return Buffer.from('test content');
  }
  
  async deleteFile(): Promise<void> {
    // Test implementation
  }
  
  async fileExists(): Promise<boolean> {
    return true;
  }
  
  async listFiles(): Promise<any[]> {
    return [];
  }
  
  async createFolder(): Promise<string> {
    return 'test/folder';
  }
  
  async getPublicUrl(): Promise<string | null> {
    return 'https://example.com/file';
  }
  
  async testConnection(): Promise<boolean> {
    return true;
  }
}

describe('BaseStorageAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe('normalizePath', () => {
    it('should normalize paths correctly', () => {
      expect((adapter as any).normalizePath('/test/path/')).toBe('test/path');
      expect((adapter as any).normalizePath('test/path/')).toBe('test/path');
      expect((adapter as any).normalizePath('test//path')).toBe('test/path');
      expect((adapter as any).normalizePath('')).toBe('');
    });
  });

  describe('joinPath', () => {
    it('should join paths correctly', () => {
      expect((adapter as any).joinPath('parent', 'child')).toBe('parent/child');
      expect((adapter as any).joinPath('parent/', 'child')).toBe('parent/child');
      expect((adapter as any).joinPath('', 'child')).toBe('child');
      expect((adapter as any).joinPath('parent', '')).toBe('parent');
    });
  });

  describe('parsePath edge cases', () => {
    it('should handle root paths', () => {
      const result = (adapter as any).parsePath('/');
      expect(result.folder).toBe('');
      expect(result.filename).toBe('');
    });

    it('should handle deeply nested paths', () => {
      const result = (adapter as any).parsePath('a/b/c/d/e/file.txt');
      expect(result.folder).toBe('a/b/c/d/e');
      expect(result.filename).toBe('file.txt');
    });
  });

  describe('parsePath', () => {
    it('should parse full paths correctly', () => {
      const result1 = (adapter as any).parsePath('folder/subfolder/file.pdf');
      expect(result1.folder).toBe('folder/subfolder');
      expect(result1.filename).toBe('file.pdf');

      const result2 = (adapter as any).parsePath('file.pdf');
      expect(result2.folder).toBe('');
      expect(result2.filename).toBe('file.pdf');

      const result3 = (adapter as any).parsePath('/folder/file.pdf');
      expect(result3.folder).toBe('folder');
      expect(result3.filename).toBe('file.pdf');
    });
  });

  describe('generateUniqueFilename', () => {
    it('should return original filename if overwrite is true', async () => {
      const result = await (adapter as any).generateUniqueFilename('folder', 'file.pdf', true);
      expect(result).toBe('folder/file.pdf');
    });

    it('should handle paths without folders', async () => {
      const result = await (adapter as any).generateUniqueFilename('', 'file.pdf', true);
      expect(result).toBe('file.pdf');
    });
  });
});

