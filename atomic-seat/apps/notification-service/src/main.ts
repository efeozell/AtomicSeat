/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('NotificationService');

  const app = await NestFactory.create(AppModule);

  // Global ayarlar (opsiyonel, ihtiyaca göre bırakılabilir)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();

  logger.log(
    '🚀 Notification Service started. RabbitMQ bağlantısı manuel olarak yönetilecek.',
  );
}

bootstrap().catch((err) => {
  console.log(`Error starting notification service: ${err}`);
  process.exit(1);
});
