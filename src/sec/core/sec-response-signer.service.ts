import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';
import { Response } from 'express';
import { secConfig } from '../sec.config';
import { SecApiError, SecErrorCode } from './sec-ghana.errors';

@Injectable()
export class SecResponseSigner {
  constructor(
    @Inject(secConfig.KEY)
    private readonly config: ConfigType<typeof secConfig>,
  ) {}

  get canSign(): boolean {
    return !!this.config.signingSecret;
  }

  sign(res: Response, body: string): void {
    if (!this.config.signingSecret) {
      throw new SecApiError(SecErrorCode.SRV_004);
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    const signature = createHmac('sha256', this.config.signingSecret)
      .update(`${timestamp}.${nonce}.${body}`)
      .digest('hex');

    res.setHeader('X-VAMSS-Timestamp', timestamp);
    res.setHeader('X-VAMSS-Nonce', nonce);
    res.setHeader('X-VAMSS-Signature', `v1=${signature}`);
  }
}
