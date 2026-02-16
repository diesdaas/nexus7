import * as crypto from 'crypto';
import { createLogger } from '@nexus/shared';

const logger = createLogger('CryptoManager');

/**
 * Encryption/Decryption result
 */
export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

/**
 * Crypto Manager - Handles encryption and decryption
 */
export class CryptoManager {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256-bit key
  private ivLength = 16; // 128-bit IV
  private tagLength = 16; // 128-bit auth tag

  /**
   * Generate random key
   */
  public generateKey(): Buffer {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate random IV
   */
  public generateIV(): Buffer {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Encrypt data with key
   */
  public encrypt(plaintext: Buffer, key: Buffer): EncryptionResult {
    if (key.length !== this.keyLength) {
      throw new Error(`Invalid key length. Expected ${this.keyLength}, got ${key.length}`);
    }

    const iv = this.generateIV();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext);
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);

    const authTag = cipher.getAuthTag();

    logger.debug('Data encrypted', {
      algorithm: this.algorithm,
      plaintextLength: plaintext.length,
      ciphertextLength: ciphertext.length,
    });

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.algorithm,
    };
  }

  /**
   * Decrypt data with key
   */
  public decrypt(encryptionResult: EncryptionResult, key: Buffer): Buffer {
    if (key.length !== this.keyLength) {
      throw new Error(`Invalid key length. Expected ${this.keyLength}, got ${key.length}`);
    }

    const ciphertext = Buffer.from(encryptionResult.ciphertext, 'base64');
    const iv = Buffer.from(encryptionResult.iv, 'base64');
    const authTag = Buffer.from(encryptionResult.authTag, 'base64');

    const decipher = crypto.createDecipheriv(encryptionResult.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);

    logger.debug('Data decrypted', { ciphertextLength: ciphertext.length });

    return plaintext;
  }

  /**
   * Hash data using SHA256
   */
  public hash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC
   */
  public hmac(data: Buffer, key: Buffer): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Generate random token
   */
  public generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive key from password (PBKDF2)
   */
  public deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Generate salt
   */
  public generateSalt(): Buffer {
    return crypto.randomBytes(16);
  }
}
