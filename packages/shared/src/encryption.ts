/**
 * Simple encryption utilities for storing sensitive data
 * In production, consider using a proper key management service
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Simple XOR encryption (not for production use)
 * TODO: Replace with proper AES encryption and key management
 */
export function encrypt(text: string, key: string = ENCRYPTION_KEY): string {
  if (!text) return text;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  
  // Base64 encode
  return Buffer.from(result).toString('base64');
}

export function decrypt(encryptedText: string, key: string = ENCRYPTION_KEY): string {
  if (!encryptedText) return encryptedText;
  
  try {
    // Base64 decode
    const text = Buffer.from(encryptedText, 'base64').toString('binary');
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a string (one-way, for validation)
 */
export function hash(text: string): string {
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
