import { CryptoManager } from '../crypto/CryptoManager';

describe('CryptoManager', () => {
  let crypto: CryptoManager;

  beforeEach(() => {
    crypto = new CryptoManager();
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt data', () => {
      const key = crypto.generateKey();
      const plaintext = Buffer.from('secret message');

      const encrypted = crypto.encrypt(plaintext, key);
      expect(encrypted.ciphertext).not.toBe(plaintext.toString());
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = crypto.decrypt(encrypted, key);
      expect(decrypted.toString()).toBe('secret message');
    });

    it('should fail decryption with wrong key', () => {
      const key1 = crypto.generateKey();
      const key2 = crypto.generateKey();
      const plaintext = Buffer.from('secret');

      const encrypted = crypto.encrypt(plaintext, key1);
      expect(() => crypto.decrypt(encrypted, key2)).toThrow();
    });
  });

  describe('hashing', () => {
    it('should hash data consistently', () => {
      const data = Buffer.from('test data');
      const hash1 = crypto.hash(data);
      const hash2 = crypto.hash(data);

      expect(hash1).toBe(hash2);
    });
  });

  describe('tokens', () => {
    it('should generate unique tokens', () => {
      const token1 = crypto.generateToken();
      const token2 = crypto.generateToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes hex = 64 chars
    });
  });

  describe('key derivation', () => {
    it('should derive consistent keys', () => {
      const password = 'mypassword';
      const salt = crypto.generateSalt();

      const key1 = crypto.deriveKey(password, salt);
      const key2 = crypto.deriveKey(password, salt);

      expect(key1.toString('hex')).toBe(key2.toString('hex'));
    });

    it('should derive different keys with different salts', () => {
      const password = 'mypassword';
      const salt1 = crypto.generateSalt();
      const salt2 = crypto.generateSalt();

      const key1 = crypto.deriveKey(password, salt1);
      const key2 = crypto.deriveKey(password, salt2);

      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });
  });
});
