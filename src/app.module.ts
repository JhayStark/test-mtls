import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { OpenController } from './open.controller';
import { SecModule } from './sec/sec.module';

// Target-group health check: the ALB probes the task directly, without a
// client certificate or an allowlisted IP, so this stays outside /sec/v1.
@Controller()
class InternalHealthController {
  @Get('healthz')
  check() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        autoLogging: false,
        quietReqLogger: true,
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    SecModule,
  ],
  controllers: [InternalHealthController, OpenController],
})
export class AppModule {}
