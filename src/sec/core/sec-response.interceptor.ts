import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SecResponseSigner } from './sec-response-signer.service';
import { SecRequest, secContext, secLogFields } from './sec-request';

// Serializes once and returns the string, so the bytes Express sends are
// exactly the bytes that were signed.
@Injectable()
export class SecResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecResponseInterceptor.name);

  constructor(private readonly signer: SecResponseSigner) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<string> {
    const http = context.switchToHttp();
    const req = http.getRequest<SecRequest>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const body = JSON.stringify(data ?? null);
        res.setHeader('X-Request-Id', secContext(req).requestId);
        this.signer.sign(res, body);
        res.type('application/json');
        this.logger.log({
          message: 'SEC VAMSS request completed',
          ...secLogFields(req, res.statusCode),
        });
        return body;
      }),
    );
  }
}
