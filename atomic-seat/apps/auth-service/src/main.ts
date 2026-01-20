/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import Consul from 'consul';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3004,
    },
  });

  const configService = app.get(ConfigService);

  const consul = new Consul({ host: 'localhost', port: 8500 });
  const serviceAddress =
    configService.get<string>('consulServiceAddress') || 'host.docker.internal';
  const servicePort = Number(configService.get<number>('authTcpPort')) || 3004;

  try {
    await consul.agent.service.register({
      name: 'auth-service',
      id: 'auth-service-1',
      address: serviceAddress,
      port: servicePort,
      check: {
        name: 'auth-service TCP check',
        tcp: `${serviceAddress}:${servicePort}`,
        interval: '10s',
        timeout: '5s',
        deregistercriticalserviceafter: '1m',
      },
    });
    console.log("✅ Consul'a başarıyla kaydedildi: auth-service");
    logger.log("✅ Consul'a başarıyla kaydedildi: auth-service");
  } catch (error) {
    logger.log('Consul kayit hatasi: ' + error);
    console.log('Consul kayit hatasi: ', error);
  }

  await app.startAllMicroservices();
  Logger.log(`🚀 Auth Microservice is running on TCP port: ${servicePort}`);
}

bootstrap().catch((err) => {
  console.log('Error starting microservice: ', err);
  process.exit(1);
});
