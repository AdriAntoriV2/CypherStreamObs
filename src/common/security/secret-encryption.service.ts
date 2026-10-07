import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class SecretEncryptionService {
  private readonly key: Buffer;

  constructor(
    private readonly config: ConfigService,
  ) {
    const keyHex =
      this.config.getOrThrow<string>(
        'twitch.tokenEncryptionKey',
      );

    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error(
        'TWITCH_TOKEN_ENCRYPTION_KEY must be exactly 32 bytes encoded as 64 hexadecimal characters',
      );
    }

    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(value: string): string {
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(
      ALGORITHM,
      this.key,
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  decrypt(value: string): string {
    const parts = value.split('.');

    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted secret format',
      );
    }

    const [
      ivBase64,
      authTagBase64,
      encryptedBase64,
    ] = parts;

    const iv = Buffer.from(
      ivBase64,
      'base64',
    );

    const authTag = Buffer.from(
      authTagBase64,
      'base64',
    );

    const encrypted = Buffer.from(
      encryptedBase64,
      'base64',
    );

    if (
      iv.length !== IV_LENGTH ||
      authTag.length !== AUTH_TAG_LENGTH
    ) {
      throw new Error(
        'Invalid encrypted secret',
      );
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      iv,
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}