/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import Consul from 'consul';
import { AllExceptionsToRpcFilter } from '@atomic-seat/shared';

async function bootstrap() {
  const logger = new Logger('CatalogService');
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001,
    },
  });

  const configService = app.get(ConfigService);

  const consul = new Consul({ host: 'localhost', port: 8500 });
  const serviceAddress =
    configService.get<string>('consulServiceAddress') || 'host.docker.internal';
  const servicePort = 3001;

  try {
    await consul.agent.service.register({
      name: 'catalog-service',
      id: 'catalog-service-1',
      address: serviceAddress,
      port: 3001,
      check: {
        name: 'catalog-service TCP check',
        tcp: `${serviceAddress}:${servicePort}`,
        interval: '10s',
        timeout: '5s',
        deregistercriticalserviceafter: '1m',
      },
    });
    console.log("✅ Consul'a başarıyla kaydedildi: catalog-service");
    logger.log("✅ Consul'a başarıyla kaydedildi: catalog-service");
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
  logger.log(`🚀 Catalog Microservice is running on TCP port: ${servicePort}`);
}

bootstrap().catch((err) => {
  console.log('Error starting microservice: ', err);
  process.exit(1);
});
