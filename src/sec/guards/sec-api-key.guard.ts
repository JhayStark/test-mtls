import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { SecApiError, SecErrorCode } from '../core/sec-ghana.errors';
import { SecRequest, secContext } from '../core/sec-request';
import { secConfig } from '../sec.config';

// Production looks the key up in SecVamssApiKey; the sandbox has one key,
// configured by its hash.
@Injectable()
export class SecApiKeyGuard implements CanActivate {
  constructor(
    @Inject(secConfig.KEY)
    private readonly config: ConfigType<typeof secConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<SecRequest>();
    const apiKey = req.header('x-sec-api-key');
    if (!apiKey) throw new SecApiError(SecErrorCode.AUTH_001);

    const keyHash = createHash('sha256').update(apiKey).digest();
    const expected = Buffer.from(this.config.apiKeyHash ?? '', 'hex');
    if (
      expected.length !== keyHash.length ||
      !timingSafeEqual(keyHash, expected)
    ) {
      throw new SecApiError(SecErrorCode.AUTH_002);
    }

    if (this.config.apiKeyRevoked) throw new SecApiError(SecErrorCode.AUTH_003);
    const expiresAt = this.config.apiKeyExpiresAt;
    if (!expiresAt || !(expiresAt > new Date())) {
      throw new SecApiError(SecErrorCode.AUTH_004);
    }

    secContext(req).client = {
      keyPrefix: this.config.apiKeyPrefix,
      clientCertSubject: this.config.clientCertSubject ?? '',
      expiresAt,
    };
    return true;
  }
}
