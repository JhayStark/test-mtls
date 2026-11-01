import { HttpStatus } from '@nestjs/common';

export enum SecErrorCode {
  AUTH_001 = 'AUTH_001',
  AUTH_002 = 'AUTH_002',
  AUTH_003 = 'AUTH_003',
  AUTH_004 = 'AUTH_004',
  AUTH_005 = 'AUTH_005',
  AUTH_006 = 'AUTH_006',
  AUTH_007 = 'AUTH_007',
  AUTH_008 = 'AUTH_008',
  SIG_001 = 'SIG_001',
  SIG_002 = 'SIG_002',
  SIG_003 = 'SIG_003',
  SIG_004 = 'SIG_004',
  SIG_005 = 'SIG_005',
  SIG_006 = 'SIG_006',
  VAL_001 = 'VAL_001',
  VAL_002 = 'VAL_002',
  VAL_003 = 'VAL_003',
  VAL_004 = 'VAL_004',
  VAL_005 = 'VAL_005',
  VAL_006 = 'VAL_006',
  VAL_007 = 'VAL_007',
  VAL_009 = 'VAL_009',
  VAL_012 = 'VAL_012',
  RES_001 = 'RES_001',
  RES_002 = 'RES_002',
  SRV_001 = 'SRV_001',
  SRV_003 = 'SRV_003',
  SRV_004 = 'SRV_004',
}

// Messages are SEC Ghana's catalog wording verbatim. AUTH_009 (revoked
// certificate) is enforced by the ALB trust store's revocation list, so the
// app never raises it.
export const secErrorCatalog: Record<
  SecErrorCode,
  { status: HttpStatus; message: string }
> = {
  [SecErrorCode.AUTH_001]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'X-SEC-API-Key header is missing from the request.',
  },
  [SecErrorCode.AUTH_002]: {
    status: HttpStatus.UNAUTHORIZED,
    message:
      'X-SEC-API-Key is present but does not match the provisioned key for this exchange.',
  },
  [SecErrorCode.AUTH_003]: {
    status: HttpStatus.UNAUTHORIZED,
    message:
      'The API key has been revoked. Contact sandbox@sec.gov.gh to request a replacement.',
  },
  [SecErrorCode.AUTH_004]: {
    status: HttpStatus.UNAUTHORIZED,
    message:
      'The API key has expired. Keys must be rotated at least every 12 months.',
  },
  [SecErrorCode.AUTH_005]: {
    status: HttpStatus.FORBIDDEN,
    message:
      'mTLS client certificate is missing. All requests must present a valid SEC Ghana client certificate.',
  },
  [SecErrorCode.AUTH_006]: {
    status: HttpStatus.FORBIDDEN,
    message:
      'mTLS client certificate is not signed by the SEC Ghana Certificate Authority.',
  },
  [SecErrorCode.AUTH_007]: {
    status: HttpStatus.FORBIDDEN,
    message:
      'mTLS client certificate is valid but does not match the exchange registered for this API key.',
  },
  [SecErrorCode.AUTH_008]: {
    status: HttpStatus.FORBIDDEN,
    message:
      'mTLS client certificate has expired. Initiate certificate rotation with SEC Ghana.',
  },
  [SecErrorCode.SIG_001]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'X-VAMSS-Request-Timestamp header is missing.',
  },
  [SecErrorCode.SIG_002]: {
    status: HttpStatus.UNAUTHORIZED,
    message:
      'X-VAMSS-Request-Timestamp value is not a valid Unix epoch integer.',
  },
  [SecErrorCode.SIG_003]: {
    status: HttpStatus.UNAUTHORIZED,
    message:
      'X-VAMSS-Request-Timestamp is more than 300 seconds from the exchange server clock. Check NTP synchronisation.',
  },
  [SecErrorCode.SIG_004]: {
    status: HttpStatus.UNAUTHORIZED,
    message:
      'X-VAMSS-Request-Nonce has already been seen within the 600-second replay window. Replay attack rejected.',
  },
  [SecErrorCode.SIG_005]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'X-VAMSS-Request-Nonce header is missing.',
  },
  [SecErrorCode.SIG_006]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'X-VAMSS-Request-Nonce is not a valid 16-byte hex string.',
  },
  [SecErrorCode.VAL_001]: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'The since parameter is not a valid ISO 8601 UTC timestamp. Expected format: YYYY-MM-DDTHH:MM:SSZ.',
  },
  [SecErrorCode.VAL_002]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'The until parameter is not a valid ISO 8601 UTC timestamp.',
  },
  [SecErrorCode.VAL_003]: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'The from_date or to_date parameter is not a valid YYYY-MM-DD calendar date.',
  },
  [SecErrorCode.VAL_004]: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'A parameter value is not in the allowed enumeration. The response body will identify the field and the allowed values.',
  },
  [SecErrorCode.VAL_005]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'The limit parameter is outside the allowed range (1–500).',
  },
  [SecErrorCode.VAL_006]: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'The cursor has expired. Cursors are valid for 24 hours. Restart pagination from the beginning.',
  },
  [SecErrorCode.VAL_007]: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'The cursor is malformed or has been modified. Use the cursor value exactly as returned in next_cursor.',
  },
  [SecErrorCode.VAL_009]: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'A field value violates a format constraint (e.g. national_id_number format, E.164 phone format, ISO 3166-1 country code). The field name is included in the error response.',
  },
  [SecErrorCode.VAL_012]: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'A timestamp value uses a timezone offset rather than UTC (Z suffix). All timestamps must be UTC.',
  },
  [SecErrorCode.RES_001]: {
    status: HttpStatus.NOT_FOUND,
    message:
      'The requested resource was not found. The identifier in the path does not match any record. Also returned as 404 Not Found when the endpoint path itself does not exist.',
  },
  [SecErrorCode.RES_002]: {
    status: HttpStatus.FORBIDDEN,
    message:
      'The resource exists but is not accessible under the current API key’s exchange scope.',
  },
  [SecErrorCode.SRV_001]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      'Internal server error. The exchange encountered an unexpected error. Retry after a brief delay.',
  },
  [SecErrorCode.SRV_003]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      'Database read timeout. The exchange’s backend did not respond within the expected window. Retry with exponential backoff.',
  },
  [SecErrorCode.SRV_004]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      'Response could not be signed due to key management service unavailability. Do not rely on unsigned responses.',
  },
};

export class SecApiError extends Error {
  constructor(
    readonly code: SecErrorCode,
    readonly field: string | null = null,
    readonly allowedValues?: string[],
    readonly cause?: unknown,
  ) {
    super(secErrorCatalog[code].message);
    this.name = 'SecApiError';
  }

  get status(): HttpStatus {
    return secErrorCatalog[this.code].status;
  }
}
