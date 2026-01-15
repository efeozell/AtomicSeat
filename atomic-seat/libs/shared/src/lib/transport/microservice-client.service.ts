import { Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { ConsulHelperService } from '../consul/consul-helper.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MicroserviceClientService {
  private clientCache = new Map<string, ClientProxy>();
  constructor(private readonly consulHelperService: ConsulHelperService) {}

  async send<TResult = any, TInput = any>(
    serviceName: string,
    pattern: any,
    data: TInput,
  ): Promise<TResult> {
    const client = await this.getClient(serviceName);

    try {
      return await firstValueFrom(client.send<TResult, TInput>(pattern, data));
    } catch (error) {
      console.log(`Microservice error (${serviceName}):`, error);
      throw error;
    }
  }

  private async getClient(serviceName: string): Promise<ClientProxy> {
    if (this.clientCache.has(serviceName)) {
      return this.clientCache.get(serviceName)!;
    }

    const { host, port } =
      await this.consulHelperService.getServiceConnectionInfo(serviceName);

    console.log(`TCP Client Oluşturuluyor -> ${serviceName} @${host}:${port}`);

    const newClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: host,
        port: port,
      },
    });

    this.clientCache.set(serviceName, newClient);
    return newClient;
  }
}
