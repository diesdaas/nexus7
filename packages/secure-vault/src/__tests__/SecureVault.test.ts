import { SecureVault } from '../vault/SecureVault';

describe('SecureVault', () => {
  let vault: SecureVault;

  beforeEach(() => {
    vault = new SecureVault();
  });

  afterEach(() => {
    vault.cleanup();
  });

  describe('encryption', () => {
    it('should encrypt and decrypt data', () => {
      const plaintext = Buffer.from('confidential data');
      const encrypted = vault.encryptData(plaintext);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = vault.decryptData(encrypted);
      expect(decrypted.toString()).toBe('confidential data');
    });
  });

  describe('authentication', () => {
    it('should authenticate user', () => {
      const creds = vault.authenticate('user1', 'password');

      expect(creds.userId).toBe('user1');
      expect(creds.token).toBeDefined();
      expect(creds.expiresAt).toBeDefined();
    });

    it('should verify valid token', () => {
      const creds = vault.authenticate('user1', 'password');
      const verified = vault.verifyToken(creds.token);

      expect(verified.userId).toBe('user1');
    });

    it('should reject invalid token', () => {
      expect(() => vault.verifyToken('invalid-token')).toThrow();
    });
  });

  describe('key rotation', () => {
    it('should rotate encryption key', () => {
      const encrypted1 = vault.encryptData(Buffer.from('test'));
      vault.rotateEncryptionKey();
      const encrypted2 = vault.encryptData(Buffer.from('test'));

      // Both should decrypt successfully
      const decrypted1 = vault.decryptData(encrypted1);
      const decrypted2 = vault.decryptData(encrypted2);

      expect(decrypted1.toString()).toBe('test');
      expect(decrypted2.toString()).toBe('test');
    });
  });

  describe('reporting', () => {
    it('should provide security report', () => {
      vault.authenticate('user1', 'password');
      const report = vault.getSecurityReport();

      expect(report.timestamp).toBeDefined();
      expect(report.keys).toBeDefined();
      expect(report.audit).toBeDefined();
      expect(report.anomalies).toBeDefined();
    });

    it('should provide vault stats', () => {
      const stats = vault.getStats();

      expect(stats.keyStore).toBeDefined();
      expect(stats.credentials).toBe(0); // No tokens set
      expect(stats.auditLog).toBeDefined();
      expect(stats.anomalies).toBeDefined();
    });
  });
});
