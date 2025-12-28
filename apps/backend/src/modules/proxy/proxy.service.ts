import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PortAllocatorService } from './port-allocator.service';

export interface TunnelConfig {
  sshPort: number;
  jupyterPort?: number;
  additionalPorts: Record<string, number>;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly frpServerAddr: string;
  private readonly frpServerPort: number;
  private readonly frpAuthToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly portAllocator: PortAllocatorService,
  ) {
    this.frpServerAddr = this.configService.get('FRP_SERVER_ADDR', 'localhost');
    this.frpServerPort = this.configService.get('FRP_SERVER_PORT', 7000);
    this.frpAuthToken = this.configService.get('FRP_AUTH_TOKEN', '');
  }

  /**
   * Allocate proxy ports for a new rental
   * Returns a mapping of container port -> public port
   */
  async allocatePortsForRental(
    nodeId: string,
  ): Promise<Record<string, number>> {
    const portMapping: Record<string, number> = {};

    // Allocate SSH port (22)
    const sshPort = await this.portAllocator.allocatePort(nodeId);
    portMapping['22'] = sshPort;

    // Allocate Jupyter port (8888)
    const jupyterPort = await this.portAllocator.allocatePort(nodeId);
    portMapping['8888'] = jupyterPort;

    this.logger.log(
      `Allocated ports for node ${nodeId}: SSH=${sshPort}, Jupyter=${jupyterPort}`,
    );

    return portMapping;
  }

  /**
   * Release all ports allocated for a rental
   */
  async releasePortsForRental(rentalId: string): Promise<void> {
    await this.portAllocator.releasePortsByRental(rentalId);
    this.logger.log(`Released ports for rental ${rentalId}`);
  }

  /**
   * Get connection info for a rental
   */
  getConnectionInfo(portMapping: Record<string, number>): {
    sshHost: string;
    sshPort: number;
    sshUser: string;
    jupyterUrl?: string;
    additionalPorts: Record<string, number>;
  } {
    const sshPort = portMapping['22'];
    const jupyterPort = portMapping['8888'];
    const additionalPorts: Record<string, number> = {};

    // Collect additional ports (excluding SSH and Jupyter)
    for (const [containerPort, publicPort] of Object.entries(portMapping)) {
      if (containerPort !== '22' && containerPort !== '8888') {
        additionalPorts[containerPort] = publicPort;
      }
    }

    return {
      sshHost: this.frpServerAddr,
      sshPort,
      sshUser: 'root',
      jupyterUrl: jupyterPort
        ? `http://${this.frpServerAddr}:${jupyterPort}`
        : undefined,
      additionalPorts,
    };
  }

  /**
   * Generate frpc config for agent
   */
  generateFrpcConfig(
    rentalId: string,
    portMapping: Record<string, number>,
  ): string {
    let config = `[common]
server_addr = ${this.frpServerAddr}
server_port = ${this.frpServerPort}
token = ${this.frpAuthToken}

`;

    for (const [containerPort, publicPort] of Object.entries(portMapping)) {
      const serviceName = this.getServiceName(containerPort);
      config += `[${rentalId}_${serviceName}]
type = tcp
local_ip = 127.0.0.1
local_port = ${containerPort}
remote_port = ${publicPort}

`;
    }

    return config;
  }

  /**
   * Get FRP server info for agent connection
   */
  getFrpServerInfo(): { addr: string; port: number; token: string } {
    return {
      addr: this.frpServerAddr,
      port: this.frpServerPort,
      token: this.frpAuthToken,
    };
  }

  private getServiceName(port: string): string {
    switch (port) {
      case '22':
        return 'ssh';
      case '8888':
        return 'jupyter';
      default:
        return `port_${port}`;
    }
  }
}
