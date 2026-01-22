/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AllExceptionsToRpcFilter } from '@atomic-seat/shared';
import Consul from 'consul';

async function bootstrap() {
  const logger = new Logger('BookingService');
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3002,
    },
  });

  const consul = new Consul({ host: 'localhost', port: 8500 });
  const serviceAddress = 'host.docker.internal';
  const servicePort = 3002;

  try {
    await consul.agent.service.register({
      name: 'booking-service',
      id: 'booking-service-1',
      address: serviceAddress,
      port: 3002,
      check: {
        name: 'booking-service TCP check',
        tcp: `${serviceAddress}:${servicePort}`,
        interval: '10s',
        timeout: '5s',
        deregistercriticalserviceafter: '1m',
      },
    });

    console.log("✅ Consul'a başarıyla kaydedildi: booking-service");
    logger.log("✅ Consul'a başarıyla kaydedildi: booking-service");
  } catch (error) {
    logger.log('Consul kayit hatasi: ' + error);
    console.log('Consul kayit hatasi: ', error);
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
  logger.log(`🚀 Booking Microservice is running on TCP port: ${servicePort}`);
}

bootstrap().catch((err) => {
  console.log('Error starting microservice: ', err);
  process.exit(1);
});
