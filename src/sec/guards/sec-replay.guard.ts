import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SecApiError, SecErrorCode } from '../core/sec-ghana.errors';
import { SecNonceStore } from '../core/sec-nonce-store';
import { SecRequest } from '../core/sec-request';

const MAX_CLOCK_SKEW_SECONDS = 300;
const NONCE_TTL_SECONDS = 600;

@Injectable()
export class SecReplayGuard implements CanActivate {
  constructor(private readonly nonces: SecNonceStore) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<SecRequest>();

    const timestamp = req.header('x-vamss-request-timestamp');
    if (!timestamp) throw new SecApiError(SecErrorCode.SIG_001);
    if (!/^\d{1,12}$/.test(timestamp)) {
      throw new SecApiError(SecErrorCode.SIG_002);
    }
    const skew = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (skew > MAX_CLOCK_SKEW_SECONDS) {
      throw new SecApiError(SecErrorCode.SIG_003);
    }

    const nonce = req.header('x-vamss-request-nonce');
    if (!nonce) throw new SecApiError(SecErrorCode.SIG_005);
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      throw new SecApiError(SecErrorCode.SIG_006);
    }

    if (!this.nonces.setIfAbsent(nonce.toLowerCase(), NONCE_TTL_SECONDS)) {
      throw new SecApiError(SecErrorCode.SIG_004);
    }
    return true;
  }
}
