import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, hash } from '../src/encryption';

describe('encryption utilities', () => {
  const testKey = 'test-encryption-key-32-chars-long';
  const testText = 'sensitive-data-123';

  describe('encrypt', () => {
    it('should encrypt text successfully', () => {
      const encrypted = encrypt(testText, testKey);
      expect(encrypted).not.toBe(testText);
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
    });

    it('should produce base64 encoded output', () => {
      const encrypted = encrypt(testText, testKey);
      // Base64 strings contain only A-Z, a-z, 0-9, +, /, =
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('', testKey);
      expect(encrypted).toBe('');
    });

    it('should handle special characters', () => {
      const specialText = 'test@example.com!$%^&*()';
      const encrypted = encrypt(specialText, testKey);
      expect(encrypted).toBeTruthy();
      
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(specialText);
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(1000);
      const encrypted = encrypt(longText, testKey);
      expect(encrypted).toBeTruthy();
      
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(longText);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text correctly', () => {
      const encrypted = encrypt(testText, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(testText);
    });

    it('should fail with wrong key', () => {
      const encrypted = encrypt(testText, testKey);
      const wrongKey = 'wrong-key';
      
      const decrypted = decrypt(encrypted, wrongKey);
      expect(decrypted).not.toBe(testText);
    });

    it('should handle empty string', () => {
      const decrypted = decrypt('', testKey);
      expect(decrypted).toBe('');
    });

    it('should throw error on invalid base64', () => {
      expect(() => {
        decrypt('invalid-base64!!!', testKey);
      }).toThrow();
    });

    it('should be idempotent (encrypt then decrypt)', () => {
      const original = 'test-data-123';
      const encrypted = encrypt(original, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(original);
    });
  });

  describe('encrypt/decrypt round trip', () => {
    it('should correctly encrypt and decrypt various inputs', () => {
      const testCases = [
        'simple text',
        'text with spaces',
        'text@with.special.chars',
        '12345',
        'Unicode: 测试 テスト 🎉',
        'newlines\ntabs\tand\rcarriage returns',
      ];

      testCases.forEach((text) => {
        const encrypted = encrypt(text, testKey);
        const decrypted = decrypt(encrypted, testKey);
        expect(decrypted).toBe(text);
      });
    });

    it('should work with different keys', () => {
      const text = 'test-data';
      const key1 = 'key-one-32-characters-long!!';
      const key2 = 'key-two-32-characters-long!!';
      
      const encrypted1 = encrypt(text, key1);
      const encrypted2 = encrypt(text, key2);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      expect(decrypt(encrypted1, key1)).toBe(text);
      expect(decrypt(encrypted2, key2)).toBe(text);
      expect(decrypt(encrypted1, key2)).not.toBe(text);
    });
  });

  describe('hash', () => {
    it('should produce a hash string', () => {
      const hashed = hash(testText);
      expect(hashed).toBeTruthy();
      expect(typeof hashed).toBe('string');
    });

    it('should produce consistent hashes for same input', () => {
      const hash1 = hash(testText);
      const hash2 = hash(testText);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hash('text1');
      const hash2 = hash('text2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hashed = hash('');
      expect(hashed).toBeTruthy();
      expect(typeof hashed).toBe('string');
    });

    it('should produce alphanumeric hash', () => {
      const hashed = hash(testText);
      // Hash uses base36 encoding (0-9, a-z)
      expect(hashed).toMatch(/^[a-z0-9]+$/);
    });
  });
});

