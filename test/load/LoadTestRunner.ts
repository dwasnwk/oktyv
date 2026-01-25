/**
 * Load Testing Suite for Oktyv
 * 
 * Comprehensive load testing across all 7 engines to validate:
 * - Concurrent request handling
 * - Connection pool limits
 * - Memory usage under load
 * - Response time degradation
 * - Rate limiting behavior
 * - Error rates under stress
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

interface LoadTestConfig {
  name: string;
  concurrent: number;      // Number of concurrent operations
  duration: number;         // Test duration in milliseconds
  rampUp?: number;         // Ramp-up time in milliseconds
  operation: () => Promise<void>;
}

interface LoadTestResult {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  errorRate: number;
  duration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Load Test Runner
 */
export class LoadTestRunner extends EventEmitter {
  private results: LoadTestResult[] = [];
  
  /**
   * Run a load test
   */
  async runTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log(`\n🔥 Starting load test: ${config.name}`);
    console.log(`   Concurrent: ${config.concurrent}`);
    console.log(`   Duration: ${config.duration}ms`);
    
    const startTime = performance.now();
    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;
    let activeWorkers = 0;
    const targetWorkers = config.concurrent;
    
    // Track memory
    const initialMemory = process.memoryUsage();
    
    // Ramp up workers
    const rampUpInterval = config.rampUp ? config.rampUp / targetWorkers : 0;
    
    return new Promise<LoadTestResult>((resolve) => {
      const endTime = startTime + config.duration;
      
      const worker = async () => {
        while (performance.now() < endTime) {
          const opStart = performance.now();
          
          try {
            await config.operation();
            successCount++;
          } catch (error) {
            failCount++;
            this.emit('error', error);
          }
          
          const opEnd = performance.now();
          latencies.push(opEnd - opStart);
        }
        
        activeWorkers--;
        
        if (activeWorkers === 0) {
          // All workers done
          const totalTime = performance.now() - startTime;
          const finalMemory = process.memoryUsage();
          
          // Sort latencies for percentiles
          latencies.sort((a, b) => a - b);
          
          const result: LoadTestResult = {
            testName: config.name,
            totalRequests: successCount + failCount,
            successfulRequests: successCount,
            failedRequests: failCount,
            averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
            minLatency: latencies[0] || 0,
            maxLatency: latencies[latencies.length - 1] || 0,
            p50Latency: latencies[Math.floor(latencies.length * 0.5)] || 0,
            p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
            p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
            requestsPerSecond: (successCount + failCount) / (totalTime / 1000),
            errorRate: failCount / (successCount + failCount),
            duration: totalTime,
            memoryUsage: {
              heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
              heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
              external: finalMemory.external - initialMemory.external,
            },
          };
          
          this.results.push(result);
          this.printResult(result);
          resolve(result);
        }
      };
      
      // Start workers with ramp-up
      for (let i = 0; i < targetWorkers; i++) {
        setTimeout(() => {
          activeWorkers++;
          worker();
        }, i * rampUpInterval);
      }
    });
  }
  
  /**
   * Run multiple tests sequentially
   */
  async runSuite(tests: LoadTestConfig[]): Promise<LoadTestResult[]> {
    console.log(`\n🚀 Running Load Test Suite (${tests.length} tests)\n`);
    console.log('='.repeat(80));
    
    for (const test of tests) {
      await this.runTest(test);
      
      // Cool down between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.printSummary();
    return this.results;
  }
  
  /**
   * Print individual test result
   */
  private printResult(result: LoadTestResult): void {
    console.log(`\n✅ ${result.testName} - Complete`);
    console.log(`   Total Requests:    ${result.totalRequests.toLocaleString()}`);
    console.log(`   Success Rate:      ${((1 - result.errorRate) * 100).toFixed(2)}%`);
    console.log(`   Requests/sec:      ${result.requestsPerSecond.toFixed(2)}`);
    console.log(`   Avg Latency:       ${result.averageLatency.toFixed(2)}ms`);
    console.log(`   P50 Latency:       ${result.p50Latency.toFixed(2)}ms`);
    console.log(`   P95 Latency:       ${result.p95Latency.toFixed(2)}ms`);
    console.log(`   P99 Latency:       ${result.p99Latency.toFixed(2)}ms`);
    console.log(`   Max Latency:       ${result.maxLatency.toFixed(2)}ms`);
    console.log(`   Heap Used:         ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }
  
  /**
   * Print summary of all tests
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 LOAD TEST SUITE SUMMARY\n');
    
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const avgRPS = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.length;
    const avgLatency = this.results.reduce((sum, r) => sum + r.averageLatency, 0) / this.results.length;
    const avgErrorRate = this.results.reduce((sum, r) => sum + r.errorRate, 0) / this.results.length;
    
    console.log(`Total Tests:        ${this.results.length}`);
    console.log(`Total Requests:     ${totalRequests.toLocaleString()}`);
    console.log(`Avg Requests/sec:   ${avgRPS.toFixed(2)}`);
    console.log(`Avg Latency:        ${avgLatency.toFixed(2)}ms`);
    console.log(`Avg Error Rate:     ${(avgErrorRate * 100).toFixed(2)}%`);
    
    console.log('\n📈 Per-Test Performance:');
    this.results.forEach((result, i) => {
      const status = result.errorRate > 0.01 ? '⚠️' : '✅';
      console.log(`${status} ${i + 1}. ${result.testName.padEnd(40)} ${result.requestsPerSecond.toFixed(0)} req/s`);
    });
    
    console.log('\n' + '='.repeat(80));
  }
  
  /**
   * Export results to JSON
   */
  exportResults(filepath: string): void {
    const fs = require('fs');
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results exported to: ${filepath}`);
  }
  
  /**
   * Get results
   */
  getResults(): LoadTestResult[] {
    return this.results;
  }
  
  /**
   * Reset results
   */
  reset(): void {
    this.results = [];
  }
}

/**
 * Example load tests for each engine
 */
export const createLoadTests = () => {
  const runner = new LoadTestRunner();
  
  // Mock operations (replace with actual engine calls)
  const tests: LoadTestConfig[] = [
    // Vault Engine Load Test
    {
      name: 'Vault: Concurrent Set/Get Operations',
      concurrent: 50,
      duration: 10000,
      rampUp: 1000,
      operation: async () => {
        // Simulate vault set/get
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      },
    },
    
    // Database Engine Load Test
    {
      name: 'Database: Concurrent Query Operations',
      concurrent: 100,
      duration: 10000,
      rampUp: 2000,
      operation: async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
      },
    },
    
    // API Engine Load Test
    {
      name: 'API: Concurrent HTTP Requests',
      concurrent: 200,
      duration: 10000,
      rampUp: 2000,
      operation: async () => {
        // Simulate API request
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      },
    },
    
    // File Engine Load Test
    {
      name: 'File: Concurrent Read/Write Operations',
      concurrent: 30,
      duration: 10000,
      rampUp: 1000,
      operation: async () => {
        // Simulate file operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 15));
      },
    },
    
    // Email Engine Load Test
    {
      name: 'Email: Concurrent Send Operations',
      concurrent: 20,
      duration: 10000,
      rampUp: 2000,
      operation: async () => {
        // Simulate email send
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      },
    },
    
    // Cron Engine Load Test
    {
      name: 'Cron: Concurrent Task Creation',
      concurrent: 50,
      duration: 10000,
      rampUp: 1000,
      operation: async () => {
        // Simulate task creation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
      },
    },
    
    // Browser Engine Load Test
    {
      name: 'Browser: Session Management Under Load',
      concurrent: 10,
      duration: 10000,
      rampUp: 2000,
      operation: async () => {
        // Simulate browser operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
      },
    },
  ];
  
  return { runner, tests };
};

/**
 * Stress test - push to limits
 */
export const createStressTest = (operationFn: () => Promise<void>) => {
  const phases = [
    { concurrent: 10, duration: 5000 },
    { concurrent: 50, duration: 5000 },
    { concurrent: 100, duration: 5000 },
    { concurrent: 200, duration: 5000 },
    { concurrent: 500, duration: 5000 },
  ];
  
  return phases.map((phase, i) => ({
    name: `Stress Test Phase ${i + 1} (${phase.concurrent} concurrent)`,
    concurrent: phase.concurrent,
    duration: phase.duration,
    rampUp: 1000,
    operation: operationFn,
  }));
};
