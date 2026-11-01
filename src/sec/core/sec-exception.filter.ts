import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { SecApiError, SecErrorCode } from './sec-ghana.errors';
import { SecResponseSigner } from './sec-response-signer.service';
import { SecRequest, secContext, secLogFields } from './sec-request';

@Catch()
export class SecExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecExceptionFilter.name);

  constructor(private readonly signer: SecResponseSigner) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<SecRequest>();
    const res = http.getResponse<Response>();
    const { requestId } = secContext(req);

    // SEC's catalog says an unsigned response must only ever be SRV_004.
    const error = this.signer.canSign
      ? this.toSecError(exception)
      : new SecApiError(SecErrorCode.SRV_004);
    const status = error.status;

    const body = JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        request_id: requestId,
        field: error.field,
        ...(error.allowedValues && { allowed_values: error.allowedValues }),
      },
    });

    res.setHeader('X-Request-Id', requestId);
    if (this.signer.canSign) this.signer.sign(res, body);

    const logFields = {
      message: `SEC VAMSS request failed [${error.code}]`,
      code: error.code,
      ...secLogFields(req, status),
    };
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        logFields,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(logFields);
    }

    res.status(status).type('application/json').send(body);
  }

  private toSecError(exception: unknown): SecApiError {
    if (exception instanceof SecApiError) return exception;
    if (exception instanceof NotFoundException) {
      return new SecApiError(SecErrorCode.RES_001);
    }
    return new SecApiError(SecErrorCode.SRV_001, null, undefined, exception);
  }
}
