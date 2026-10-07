import { Global, Module } from '@nestjs/common';
import { SecretEncryptionService } from './secret-encryption.service.js';

@Global()
@Module({
  providers: [
    SecretEncryptionService,
  ],
  exports: [
    SecretEncryptionService,
  ],
})
export class SecurityModule {}