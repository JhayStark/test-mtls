import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BlockList, isIP } from 'net';
import { secConfig } from '../sec.config';
import { SecApiError, SecErrorCode } from '../core/sec-ghana.errors';
import { SecRequest, secClientIp, secContext } from '../core/sec-request';

@Injectable()
export class SecIpAllowlistGuard implements CanActivate {
  private readonly logger = new Logger(SecIpAllowlistGuard.name);
  private readonly allowList = new BlockList();
  private readonly hasRules: boolean;

  constructor(
    @Inject(secConfig.KEY)
    config: ConfigType<typeof secConfig>,
  ) {
    for (const cidr of config.allowedCidrs) {
      const [address, prefix] = cidr.split('/');
      const family = isIP(address);
      if (!family) {
        this.logger.error({
          message: 'Ignoring invalid SEC_VAMSS_ALLOWED_CIDRS entry',
          cidr,
        });
        continue;
      }
      const type = family === 4 ? 'ipv4' : 'ipv6';
      if (prefix === undefined) {
        this.allowList.addAddress(address, type);
      } else {
        this.allowList.addSubnet(address, Number(prefix), type);
      }
    }
    this.hasRules = config.allowedCidrs.length > 0;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<SecRequest>();
    const ctx = secContext(req);
    ctx.clientIp = secClientIp(req);

    if (this.isAllowed(ctx.clientIp)) return true;

    this.logger.warn({
      message: 'SEC VAMSS request from IP outside allowlist',
      requestId: ctx.requestId,
      ip: ctx.clientIp,
    });
    throw new SecApiError(SecErrorCode.RES_002);
  }

  private isAllowed(ip: string | undefined): boolean {
    if (!this.hasRules) return process.env.NODE_ENV !== 'production';

    if (!ip) return false;
    const family = isIP(ip);
    if (!family) return false;
    return this.allowList.check(ip, family === 4 ? 'ipv4' : 'ipv6');
  }
}
