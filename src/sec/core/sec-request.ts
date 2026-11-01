import { randomUUID } from 'crypto';
import { Request } from 'express';

export interface SecClient {
  keyPrefix: string | undefined;
  clientCertSubject: string;
  expiresAt: Date;
}

export interface SecRequest extends Request {
  secContext?: {
    requestId: string;
    startedAt: number;
    clientIp?: string;
    client?: SecClient;
    certSerial?: string;
  };
}

export const secContext = (req: SecRequest) =>
  (req.secContext ??= { requestId: randomUUID(), startedAt: Date.now() });

// The ALB appends the connecting address as the last X-Forwarded-For entry;
// earlier entries are client-supplied and can't be trusted.
export const secClientIp = (req: Request): string | undefined => {
  const forwarded = req.header('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',').pop()?.trim()
    : req.socket?.remoteAddress;
  return ip?.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
};

export const secLogFields = (req: SecRequest, statusCode: number) => {
  const ctx = secContext(req);
  return {
    requestId: ctx.requestId,
    keyPrefix: ctx.client?.keyPrefix,
    certSerial: ctx.certSerial,
    ip: ctx.clientIp,
    method: req.method,
    path: req.path,
    statusCode,
    latencyMs: Date.now() - ctx.startedAt,
  };
};
