import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Consul = require('consul');

@Injectable()
export class ConsulHelperService {
  private consul: Consul;
  constructor(private readonly configService: ConfigService) {
    this.consul = new Consul({
      host: this.configService.get<string>('CONSUL_HOST') || 'localhost',
      port: this.configService.get<number>('CONSUL_PORT') || 8500,
    });
  }

  async getServiceConnectionInfo(
    serviceName: string,
  ): Promise<{ host: string; port: number }> {
    try {
      const result: any[] = await this.consul.health.service(serviceName);

      if (!result || result.length === 0) {
        throw new ServiceUnavailableException(
          `${serviceName} servisi bulunamadi`,
        );
      }

      const healthyInstances = result.filter((entry) => {
        return entry.Checks.every((check: any) => check.Status === 'passing');
      });

      if (healthyInstances.length === 0) {
        throw new ServiceUnavailableException(
          `${serviceName} servisi icin saglikli instance bulunamadi`,
        );
      }

      const selectedInstance =
        healthyInstances[Math.floor(Math.random() * healthyInstances.length)];

      let host = selectedInstance.Service.Address || selectedInstance.Address;
      if (host === 'host.docker.internal') {
        host = 'localhost';
      }

      return {
        host: host,
        port: selectedInstance.Service.Port,
      };
    } catch (error) {
      console.log(`ConsulHelper'da bir hata ${error}`);
      throw new ServiceUnavailableException(
        `${serviceName} servisine baglanilamadi`,
      );
    }
  }
}
