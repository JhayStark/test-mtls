import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const MTLS_HEADERS = [
  'x-amzn-mtls-clientcert',
  'x-amzn-mtls-clientcert-leaf',
  'x-amzn-mtls-clientcert-serial-number',
  'x-amzn-mtls-clientcert-issuer',
  'x-amzn-mtls-clientcert-subject',
  'x-amzn-mtls-clientcert-validity',
];

// Sandbox-only: records which mTLS headers the ALB forwarded, which is what
// this app exists to find out. Certificates themselves are never logged.
@Injectable()
export class SecMtlsHeaderLogger implements NestMiddleware {
  private readonly logger = new Logger(SecMtlsHeaderLogger.name);

  use(req: Request, _res: Response, next: NextFunction) {
    this.logger.debug({
      message: 'SEC VAMSS mTLS headers received',
      path: req.originalUrl,
      present: MTLS_HEADERS.filter((name) => req.header(name) !== undefined),
      serial: req.header('x-amzn-mtls-clientcert-serial-number'),
      subject: req.header('x-amzn-mtls-clientcert-subject'),
      issuer: req.header('x-amzn-mtls-clientcert-issuer'),
      validity: req.header('x-amzn-mtls-clientcert-validity'),
    });
    next();
  }
}
