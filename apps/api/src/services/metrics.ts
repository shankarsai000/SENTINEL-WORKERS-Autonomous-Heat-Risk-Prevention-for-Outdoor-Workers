export class MetricsRegistry {
  private static instance: MetricsRegistry;

  public request_count: number = 0;
  public request_error_count: number = 0;

  public fortyguard_requests: number = 0;
  public fortyguard_failures: number = 0;
  public fortyguard_timeouts: number = 0;
  public fortyguard_rate_limits: number = 0;
  public fortyguard_cache_hits: number = 0;

  public risk_calculations: number = 0;
  public risk_failures: number = 0;

  public predictions: number = 0;
  public prediction_failures: number = 0;

  public actions: number = 0;
  public action_failures: number = 0;
  public action_deduplicated: number = 0;

  public acknowledgements: number = 0;
  public escalations: number = 0;
  public incidents: number = 0;

  public websocket_connections: number = 0;
  public websocket_reconnects: number = 0;

  private startTime: number = Date.now();

  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  public getSnapshot() {
    return {
      uptime_seconds: Math.round((Date.now() - this.startTime) / 1000),
      requests: {
        total: this.request_count,
        errors: this.request_error_count,
        error_rate: this.request_count > 0 ? Number((this.request_error_count / this.request_count).toFixed(4)) : 0,
      },
      fortyguard: {
        total_requests: this.fortyguard_requests,
        failures: this.fortyguard_failures,
        timeouts: this.fortyguard_timeouts,
        rate_limits: this.fortyguard_rate_limits,
        cache_hits: this.fortyguard_cache_hits,
      },
      risk_engine: {
        calculations: this.risk_calculations,
        failures: this.risk_failures,
      },
      prediction_engine: {
        predictions: this.predictions,
        failures: this.prediction_failures,
      },
      action_engine: {
        issued: this.actions,
        failures: this.action_failures,
        deduplicated: this.action_deduplicated,
        acknowledgements: this.acknowledgements,
        escalations: this.escalations,
      },
      incidents: {
        total: this.incidents,
      },
      websockets: {
        connections: this.websocket_connections,
        reconnects: this.websocket_reconnects,
      },
      memory: process.memoryUsage(),
    };
  }

  public reset(): void {
    this.request_count = 0;
    this.request_error_count = 0;
    this.fortyguard_requests = 0;
    this.fortyguard_failures = 0;
    this.fortyguard_timeouts = 0;
    this.fortyguard_rate_limits = 0;
    this.fortyguard_cache_hits = 0;
    this.risk_calculations = 0;
    this.risk_failures = 0;
    this.predictions = 0;
    this.prediction_failures = 0;
    this.actions = 0;
    this.action_failures = 0;
    this.action_deduplicated = 0;
    this.acknowledgements = 0;
    this.escalations = 0;
    this.incidents = 0;
    this.websocket_connections = 0;
    this.websocket_reconnects = 0;
    this.startTime = Date.now();
  }
}

export const metrics = MetricsRegistry.getInstance();
