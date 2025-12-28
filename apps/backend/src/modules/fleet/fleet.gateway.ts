import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard, AuthenticatedSocket } from '../auth/guards/ws-auth.guard';
import { FleetService } from './fleet.service';
import { InfluxService } from '../../influx/influx.service';
import { RedisService } from '../../redis/redis.service';
import {
  HeartbeatEvent,
  InstanceStartedEvent,
  InstanceStoppedEvent,
  StartInstanceCommand,
  StopInstanceCommand,
  DrainNodeCommand,
} from '@distributed-compute/shared-types';

@WebSocketGateway({
  namespace: '/fleet',
  cors: {
    origin: '*',
  },
})
export class FleetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FleetGateway.name);
  private connectedAgents = new Map<string, Socket>(); // nodeId -> socket

  constructor(
    private readonly fleetService: FleetService,
    private readonly influxService: InfluxService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Verify API key from handshake
      const authHeader = client.handshake.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.warn(`Connection rejected: missing auth header`);
        client.disconnect();
        return;
      }

      const apiKey = authHeader.substring(7);
      const nodeInfo = await this.fleetService.verifyAndGetNode(apiKey);

      if (!nodeInfo) {
        this.logger.warn(`Connection rejected: invalid API key`);
        client.disconnect();
        return;
      }

      // Store node info in socket
      (client as AuthenticatedSocket).data = nodeInfo;

      // Register agent
      this.connectedAgents.set(nodeInfo.nodeId, client);
      await this.fleetService.setNodeOnline(nodeInfo.nodeId);

      this.logger.log(`Agent connected: nodeId=${nodeInfo.nodeId}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const nodeId = (client as AuthenticatedSocket).data?.nodeId;
    if (nodeId) {
      this.connectedAgents.delete(nodeId);
      await this.fleetService.setNodeOffline(nodeId);
      this.logger.log(`Agent disconnected: nodeId=${nodeId}`);
    }
  }

  // ==========================================
  // Agent → Backend Events
  // ==========================================

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @MessageBody() data: HeartbeatEvent['data'],
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const nodeId = client.data.nodeId;

    // Store metrics in InfluxDB
    await this.influxService.writeNodeMetrics(nodeId, data.metrics);

    // Update node status in Redis (TTL 15 seconds)
    await this.redisService.setNodeOnline(nodeId, 15);

    // Update last heartbeat timestamp
    await this.fleetService.updateHeartbeat(nodeId, data.status);

    return { success: true };
  }

  @SubscribeMessage('instance_started')
  async handleInstanceStarted(
    @MessageBody() data: InstanceStartedEvent['data'],
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.log(
      `Instance started: rentalId=${data.rentalId}, containerId=${data.containerId}`,
    );

    await this.fleetService.handleInstanceStarted(data);

    return { success: true };
  }

  @SubscribeMessage('instance_stopped')
  async handleInstanceStopped(
    @MessageBody() data: InstanceStoppedEvent['data'],
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.log(
      `Instance stopped: rentalId=${data.rentalId}, reason=${data.reason}`,
    );

    await this.fleetService.handleInstanceStopped(data);

    return { success: true };
  }

  // ==========================================
  // Backend → Agent Commands
  // ==========================================

  async sendStartInstance(
    nodeId: string,
    command: StartInstanceCommand['data'],
  ): Promise<boolean> {
    const socket = this.connectedAgents.get(nodeId);
    if (!socket) {
      this.logger.warn(`Cannot send start_instance: node ${nodeId} not connected`);
      return false;
    }

    socket.emit('start_instance', command);
    this.logger.log(`Sent start_instance to node ${nodeId}: rentalId=${command.rentalId}`);
    return true;
  }

  async sendStopInstance(
    nodeId: string,
    command: StopInstanceCommand['data'],
  ): Promise<boolean> {
    const socket = this.connectedAgents.get(nodeId);
    if (!socket) {
      this.logger.warn(`Cannot send stop_instance: node ${nodeId} not connected`);
      return false;
    }

    socket.emit('stop_instance', command);
    this.logger.log(`Sent stop_instance to node ${nodeId}: rentalId=${command.rentalId}`);
    return true;
  }

  async sendDrainNode(
    nodeId: string,
    command: DrainNodeCommand['data'],
  ): Promise<boolean> {
    const socket = this.connectedAgents.get(nodeId);
    if (!socket) {
      this.logger.warn(`Cannot send drain_node: node ${nodeId} not connected`);
      return false;
    }

    socket.emit('drain_node', command);
    this.logger.log(`Sent drain_node to node ${nodeId}`);
    return true;
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  isNodeConnected(nodeId: string): boolean {
    return this.connectedAgents.has(nodeId);
  }

  getConnectedNodeIds(): string[] {
    return Array.from(this.connectedAgents.keys());
  }
}
