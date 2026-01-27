/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import Consul from 'consul';
import { AllExceptionsToRpcFilter } from '@atomic-seat/shared';

async function bootstrap() {
  const logger = new Logger('PaymentService');
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3003,
    },
  });

  const consul = new Consul({ host: 'localhost', port: 8500 });
  const serviceAddress = 'host.docker.internal';
  const servicePort = 3003;

  try {
    await consul.agent.service.register({
      name: 'payment-service',
      id: 'payment-service-1',
      address: serviceAddress,
      port: servicePort,
      check: {
        name: 'payment-service TCP check',
        tcp: `${serviceAddress}:${servicePort}`,
        interval: '10s',
        timeout: '5s',
        deregistercriticalserviceafter: '1m',
      },
    });

    console.log("✅ Consul'a başarıyla kaydedildi: payment-service");
    logger.log("✅ Consul'a başarıyla kaydedildi: payment-service");
  } catch (error) {
    logger.log('Payment Service Consul kayit hatasi: ' + error);
    console.log('Payment Service Consul kayit hatasi: ', error);
  }

  app.useGlobalFilters(new AllExceptionsToRpcFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  await app.startAllMicroservices();
  await app.listen(3005);
  Logger.log(
    `🚀 (TCP) Payment Microservice is running on TCP port: ${servicePort}`,
  );
  Logger.log(`🚀 (HTTP) Payment Microservice is running on HTTP port: ${3005}`);
}

bootstrap().catch((err) => {
  console.error('Error during Payment Service bootstrap:', err);
  process.exit(1);
});
