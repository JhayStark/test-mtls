import {
  Controller,
  Get,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SecExceptionFilter } from './core/sec-exception.filter';
import { SecResponseInterceptor } from './core/sec-response.interceptor';
import { SecIpAllowlistGuard } from './guards/sec-ip-allowlist.guard';
import { SEC_API_VERSION, toSecTimestamp } from './utils/sec-format';

// SEC polls this without credentials, so only the IP allowlist applies, and it
// does no I/O. This must be registered before SecController, whose catch-all
// would answer.
@UseGuards(SecIpAllowlistGuard)
@UseInterceptors(SecResponseInterceptor)
@UseFilters(SecExceptionFilter)
@Controller('sec/v1')
export class SecHealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      timestamp: toSecTimestamp(new Date()),
      version: SEC_API_VERSION,
      message: null,
    };
  }
}
