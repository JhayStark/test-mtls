import { registerAs } from '@nestjs/config';

export interface SecConfig {
  signingSecret: string | undefined;
  caBundlePem: string | undefined;
  allowedCidrs: string[];
  apiKeyHash: string | undefined;
  apiKeyPrefix: string | undefined;
  apiKeyExpiresAt: Date | undefined;
  apiKeyRevoked: boolean;
  clientCertSubject: string | undefined;
}

export const secConfig = registerAs('sec', (): SecConfig => ({
  signingSecret: process.env.SEC_VAMSS_SIGNING_SECRET || undefined,
  caBundlePem: process.env.SEC_VAMSS_CA_BUNDLE
    ? Buffer.from(process.env.SEC_VAMSS_CA_BUNDLE, 'base64').toString('utf8')
    : undefined,
  allowedCidrs: (process.env.SEC_VAMSS_ALLOWED_CIDRS ?? '')
    .split(',')
    .map((cidr) => cidr.trim())
    .filter(Boolean),
  apiKeyHash: process.env.SEC_VAMSS_API_KEY_HASH?.toLowerCase() || undefined,
  apiKeyPrefix: process.env.SEC_VAMSS_API_KEY_PREFIX || undefined,
  apiKeyExpiresAt: process.env.SEC_VAMSS_API_KEY_EXPIRES_AT
    ? new Date(process.env.SEC_VAMSS_API_KEY_EXPIRES_AT)
    : undefined,
  apiKeyRevoked: process.env.SEC_VAMSS_API_KEY_REVOKED === 'true',
  // Env values can't hold real newlines in most consoles, so the subject's
  // RDN separator may be written as a literal \n.
  clientCertSubject:
    process.env.SEC_VAMSS_CLIENT_CERT_SUBJECT?.replace(/\\n/g, '\n') ||
    undefined,
}));
