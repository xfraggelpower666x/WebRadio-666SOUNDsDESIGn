'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

function createSoundCloudCredentialStore(safeStorage, getDirectory) {
  const file = () => path.join(getDirectory(), 'soundcloud-credentials.enc');
  const validate = value => {
    if (!value || typeof value.clientId !== 'string' || typeof value.clientSecret !== 'string') {
      throw new Error('soundcloud_credentials_invalid');
    }
    const clientId = value.clientId.trim();
    const clientSecret = value.clientSecret.trim();
    if (!clientId || !clientSecret || clientId.length > 512 || clientSecret.length > 512) {
      throw new Error('soundcloud_credentials_invalid');
    }
    return { clientId, clientSecret };
  };
  const requireEncryption = async () => {
    if (!await safeStorage.isAsyncEncryptionAvailable()) throw new Error('soundcloud_secure_storage_unavailable');
  };
  return {
    async read() {
      let ciphertext;
      try {
        ciphertext = fs.readFileSync(file());
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
      await requireEncryption();
      try {
        const decrypted = await safeStorage.decryptStringAsync(ciphertext);
        return validate(JSON.parse(decrypted.result));
      } catch {
        throw new Error('soundcloud_credentials_decryption_failed');
      }
    },
    async save(value) {
      const credentials = validate(value);
      await requireEncryption();
      const ciphertext = await safeStorage.encryptStringAsync(JSON.stringify(credentials));
      const target = file();
      const temporary = target + '.' + randomBytes(8).toString('hex') + '.tmp';
      try {
        fs.writeFileSync(temporary, ciphertext, { flag: 'wx', mode: 0o600 });
        fs.renameSync(temporary, target);
      } finally {
        try {
          fs.unlinkSync(temporary);
        } catch (error) {
          if (error.code !== 'ENOENT') console.error('SoundCloud credential temporary file cleanup failed:', error.message);
        }
      }
    },
    clear() {
      try {
        fs.unlinkSync(file());
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
    stored() {
      return fs.existsSync(file());
    }
  };
}

module.exports = { createSoundCloudCredentialStore };
