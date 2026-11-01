import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { X509Certificate } from 'crypto';
import { secConfig } from '../sec.config';
import { isIssuedBySecCa, parseCaBundle } from '../core/sec-ca-bundle';
import { SecApiError, SecErrorCode } from '../core/sec-ghana.errors';
import { SecRequest, secContext } from '../core/sec-request';

const normalizeSubject = (subject: string) =>
  subject
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n');

// The ALB terminates mTLS and forwards the verified leaf in
// x-amzn-mtls-clientcert-leaf. Re-checking it here only holds if /sec/* is
// reachable solely through that listener; otherwise the header can be forged.
@Injectable()
export class SecClientCertGuard implements CanActivate {
  private readonly logger = new Logger(SecClientCertGuard.name);
  private readonly caCertificates: X509Certificate[];

  constructor(
    @Inject(secConfig.KEY)
    config: ConfigType<typeof secConfig>,
  ) {
    this.caCertificates = parseCaBundle(config.caBundlePem, this.logger);

    if (!this.caCertificates.length) {
      this.logger.warn(
        'SEC_VAMSS_CA_BUNDLE has no usable certificates; every SEC VAMSS request will be rejected',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<SecRequest>();
    const ctx = secContext(req);
    const rawLeaf = req.header('x-amzn-mtls-clientcert-leaf');
    if (!rawLeaf) throw new SecApiError(SecErrorCode.AUTH_005);

    let leaf: X509Certificate;
    try {
      leaf = new X509Certificate(decodeURIComponent(rawLeaf));
    } catch {
      throw new SecApiError(SecErrorCode.AUTH_006);
    }
    ctx.certSerial = leaf.serialNumber;

    if (!isIssuedBySecCa(leaf, this.caCertificates))
      throw new SecApiError(SecErrorCode.AUTH_006);

    const now = Date.now();
    if (now < Date.parse(leaf.validFrom) || now > Date.parse(leaf.validTo)) {
      throw new SecApiError(SecErrorCode.AUTH_008);
    }

    if (
      normalizeSubject(leaf.subject) !==
      normalizeSubject(ctx.client?.clientCertSubject ?? '')
    ) {
      throw new SecApiError(SecErrorCode.AUTH_007);
    }

    return true;
  }
}
