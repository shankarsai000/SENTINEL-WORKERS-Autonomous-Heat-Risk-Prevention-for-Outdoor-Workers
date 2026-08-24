import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import pino from 'pino';

const logger = pino({ name: 'websocket-server' });

export type SentinelWsMessageType =
  | 'CONNECTED'
  | 'SIMULATION_STATUS'
  | 'THERMAL_OBSERVATION'
  | 'RISK_STATE_UPDATE'
  | 'ACTION_EVENT'
  | 'INCIDENT_EVENT'
  | 'AUDIT_EVENT'
  | 'PONG';

export interface SentinelWsEnvelope {
  type: SentinelWsMessageType;
  timestamp: string;
  payload: any;
}

export class SentinelWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      logger.info({ event: 'WS_CLIENT_CONNECTED', totalClients: this.clients.size });

      // Send initial welcome/connected envelope
      this.sendToClient(ws, {
        type: 'CONNECTED',
        timestamp: new Date().toISOString(),
        payload: {
          message: 'Connected to Sentinel Workers Realtime Event Stream',
          serverTime: new Date().toISOString(),
        },
      });

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PING') {
            this.sendToClient(ws, {
              type: 'PONG',
              timestamp: new Date().toISOString(),
              payload: { clientTimestamp: parsed.timestamp },
            });
          }
        } catch (e) {
          // Ignore invalid messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info({ event: 'WS_CLIENT_DISCONNECTED', totalClients: this.clients.size });
      });

      ws.on('error', (err) => {
        logger.error({ event: 'WS_CLIENT_ERROR', error: err.message });
      });
    });

    // Setup periodic ping
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        }
      }
    }, 30000);
  }

  public broadcast(type: SentinelWsMessageType, payload: any): void {
    const envelope: SentinelWsEnvelope = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    const message = JSON.stringify(envelope);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  private sendToClient(ws: WebSocket, envelope: SentinelWsEnvelope): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(envelope));
    }
  }

  public getConnectedClientCount(): number {
    return this.clients.size;
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}
