import { Controller, Get } from '@nestjs/common';

// Unguarded and unrelated to the SEC API: no allowlist, API key, client cert,
// replay check or response signing.
@Controller('open')
export class OpenController {
  @Get()
  get() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
