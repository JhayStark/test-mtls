import { All, Controller, Get } from '@nestjs/common';
import { SecApi } from './core/sec-api.decorator';
import { SecApiError, SecErrorCode } from './core/sec-ghana.errors';
import { toSecTimestamp } from './utils/sec-format';

@SecApi()
@Controller('sec/v1')
export class SecController {
  @Get('ping')
  ping() {
    return { status: 'ok', server_time: toSecTimestamp(new Date()) };
  }

  // Must stay the last method: routes register in declaration order, so any
  // route below it is shadowed. Unknown paths still pass the SEC guards and
  // get a signed RES_001.
  @All('*path')
  notFound(): never {
    throw new SecApiError(SecErrorCode.RES_001);
  }
}
