import {
  applyDecorators,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SecApiKeyGuard } from '../guards/sec-api-key.guard';
import { SecClientCertGuard } from '../guards/sec-client-cert.guard';
import { SecIpAllowlistGuard } from '../guards/sec-ip-allowlist.guard';
import { SecReplayGuard } from '../guards/sec-replay.guard';
import { SecExceptionFilter } from './sec-exception.filter';
import { SecResponseInterceptor } from './sec-response.interceptor';

// Guard order decides which code SEC sees when several checks would fail.
export const SecApi = () =>
  applyDecorators(
    UseGuards(
      SecIpAllowlistGuard,
      SecApiKeyGuard,
      SecClientCertGuard,
      SecReplayGuard,
    ),
    UseInterceptors(SecResponseInterceptor),
    UseFilters(SecExceptionFilter),
  );
