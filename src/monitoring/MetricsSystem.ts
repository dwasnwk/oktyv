/**
 * Monitoring & Metrics System for Oktyv
 * 
 * Real-time monitoring and metrics collection:
 * - Request latency tracking
 * - Error rate monitoring
 * - Resource utilization metrics
 * - Health check endpoints
 * - Alerting system
 */

export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private counters: Map<string, number> = new Map();
  
  /** Track metric value */
  track(metric: string, value: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(value);
  }
  
  /** Increment counter */
  increment(counter: string, by = 1): void {
    this.counters.set(counter, (this.counters.get(counter) || 0) + by);
  }
  
  /** Get metric stats */
  getStats(metric: string) {
    const values = this.metrics.get(metric) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  /** Get counter value */
  getCounter(counter: string): number {
    return this.counters.get(counter) || 0;
  }
  
  /** Export all metrics */
  exportMetrics() {
    const metrics: any = {};
    
    for (const [key] of this.metrics) {
      metrics[key] = this.getStats(key);
    }
    
    for (const [key, value] of this.counters) {
      metrics[`counter_${key}`] = value;
    }
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
      },
    };
  }
  
  /** Reset all metrics */
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
  }
}

export class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();
  
  /** Register health check */
  registerCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }
  
  /** Run all health checks */
  async runHealthChecks() {
    const results: any = {};
    let healthy = true;
    
    for (const [name, check] of this.checks) {
      try {
        const pass = await check();
        results[name] = { status: pass ? 'healthy' : 'unhealthy' };
        if (!pass) healthy = false;
      } catch (error: any) {
        results[name] = { status: 'error', error: error.message };
        healthy = false;
      }
    }
    
    return {
      healthy,
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }
}

export class AlertManager {
  private thresholds: Map<string, { value: number; callback: () => void }> = new Map();
  
  /** Set alert threshold */
  setThreshold(metric: string, value: number, callback: () => void): void {
    this.thresholds.set(metric, { value, callback });
  }
  
  /** Check if metric exceeds threshold */
  check(metric: string, value: number): void {
    const threshold = this.thresholds.get(metric);
    if (threshold && value > threshold.value) {
      threshold.callback();
    }
  }
}
