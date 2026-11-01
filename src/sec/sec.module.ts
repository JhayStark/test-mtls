import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecExceptionFilter } from './core/sec-exception.filter';
import { SecMtlsHeaderLogger } from './core/sec-mtls-header.logger';
import { SecNonceStore } from './core/sec-nonce-store';
import { SecResponseSigner } from './core/sec-response-signer.service';
import { SecResponseInterceptor } from './core/sec-response.interceptor';
import { SecApiKeyGuard } from './guards/sec-api-key.guard';
import { SecClientCertGuard } from './guards/sec-client-cert.guard';
import { SecIpAllowlistGuard } from './guards/sec-ip-allowlist.guard';
import { SecReplayGuard } from './guards/sec-replay.guard';
import { SecHealthController } from './sec-health.controller';
import { SecController } from './sec.controller';
import { secConfig } from './sec.config';

@Module({
  imports: [ConfigModule.forFeature(secConfig)],
  // SecHealthController first: SecController's catch-all would otherwise
  // answer /sec/v1/health behind the SEC guards.
  controllers: [SecHealthController, SecController],
  providers: [
    SecNonceStore,
    SecResponseSigner,
    SecResponseInterceptor,
    SecExceptionFilter,
    SecIpAllowlistGuard,
    SecApiKeyGuard,
    SecClientCertGuard,
    SecReplayGuard,
  ],
})
export class SecModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecMtlsHeaderLogger).forRoutes('sec/*path');
  }
}
