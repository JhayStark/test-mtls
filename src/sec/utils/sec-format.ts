export const SEC_API_VERSION = '1.0';

export const toSecTimestamp = (date: Date): string =>
  date.toISOString().replace(/\.\d{3}Z$/, 'Z');
