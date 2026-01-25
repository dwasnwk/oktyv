/**
 * Performance Optimization & Benchmarking Suite for Oktyv
 * 
 * Comprehensive performance analysis and optimization:
 * - CPU profiling
 * - Memory profiling
 * - Latency benchmarking
 * - Throughput measurement
 * - Resource utilization tracking
 * - Bottleneck identification
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import * as v8 from 'v8';

interface PerformanceMetrics {
  operation: string;
  duration: number;
  cpuTime: number;
  memoryUsed: number;
  timestamp: number;
}

interface BenchmarkResult {
  testName: string;
  operations: number;
  totalDuration: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  opsPerSecond: number;
  memoryDelta: number;
  cpuUsage: NodeJS.CpuUsage;
}

interface OptimizationRecommendation {
  area: string;
  issue: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  estimatedImprovement: string;
}

/**
 * Performance Benchmark Runner
 */
export class PerformanceBenchmark {
  private metrics: PerformanceMetrics[] = [];
  private observer: PerformanceObserver;
  
  constructor() {
    // Set up performance observer
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log(`⏱️  ${entry.name}: ${entry.duration.toFixed(2)}ms`);
      });
    });
    this.observer.observe({ entryTypes: ['measure'] });
  }
  
  /**
   * Benchmark an operation
   */
  async benchmark(
    name: string,
    operation: () => Promise<void>,
    iterations = 1000
  ): Promise<BenchmarkResult> {
    console.log(`\n🔬 Benchmarking: ${name}`);
    console.log(`   Iterations: ${iterations}`);
    
    const latencies: number[] = [];
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();
    const startTime = performance.now();
    
    // Warm-up
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await operation();
    }
    
    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      await operation();
      const opEnd = performance.now();
      latencies.push(opEnd - opStart);
    }
    
    const endTime = performance.now();
    const endCpu = process.cpuUsage(startCpu);
    const endMemory = process.memoryUsage();
    
    const totalDuration = endTime - startTime;
    latencies.sort((a, b) => a - b);
    
    const result: BenchmarkResult = {
      testName: name,
      operations: iterations,
      totalDuration,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      minLatency: latencies[0],
      maxLatency: latencies[latencies.length - 1],
      opsPerSecond: (iterations / totalDuration) * 1000,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      cpuUsage: endCpu,
    };
    
    this.printBenchmarkResult(result);
    return result;
  }
  
  /**
   * Profile memory usage
   */
  async profileMemory<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; heapSnapshot: any }> {
    console.log(`\n🧠 Memory Profiling: ${name}`);
    
    // Force GC if available
    if (global.gc) {
      global.gc();
    }
    
    const before = process.memoryUsage();
    const beforeHeap = v8.getHeapStatistics();
    
    performance.mark(`${name}-start`);
    const result = await operation();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const after = process.memoryUsage();
    const afterHeap = v8.getHeapStatistics();
    
    const snapshot = {
      before,
      after,
      delta: {
        heapUsed: after.heapUsed - before.heapUsed,
        heapTotal: after.heapTotal - before.heapTotal,
        external: after.external - before.external,
        arrayBuffers: after.arrayBuffers - before.arrayBuffers,
      },
      heap: {
        totalHeapSize: afterHeap.total_heap_size,
        usedHeapSize: afterHeap.used_heap_size,
        heapSizeLimit: afterHeap.heap_size_limit,
        mallocedMemory: afterHeap.malloced_memory,
      },
    };
    
    console.log(`   Heap Delta:      ${(snapshot.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   External Delta:  ${(snapshot.delta.external / 1024 / 1024).toFixed(2)}MB`);
    
    return { result, heapSnapshot: snapshot };
  }
  
  /**
   * Profile CPU usage
   */
  async profileCPU<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; cpuUsage: NodeJS.CpuUsage }> {
    console.log(`\n⚡ CPU Profiling: ${name}`);
    
    const startCpu = process.cpuUsage();
    const startTime = performance.now();
    
    const result = await operation();
    
    const endTime = performance.now();
    const endCpu = process.cpuUsage(startCpu);
    
    const duration = endTime - startTime;
    const cpuPercent = ((endCpu.user + endCpu.system) / 1000) / duration * 100;
    
    console.log(`   Duration:        ${duration.toFixed(2)}ms`);
    console.log(`   User CPU:        ${(endCpu.user / 1000).toFixed(2)}ms`);
    console.log(`   System CPU:      ${(endCpu.system / 1000).toFixed(2)}ms`);
    console.log(`   CPU Usage:       ${cpuPercent.toFixed(2)}%`);
    
    return { result, cpuUsage: endCpu };
  }
  
  /**
   * Analyze performance bottlenecks
   */
  async analyzeBottlenecks(operations: Array<{
    name: string;
    fn: () => Promise<void>;
  }>): Promise<OptimizationRecommendation[]> {
    console.log('\n🔍 Analyzing Performance Bottlenecks\n');
    
    const results = await Promise.all(
      operations.map(op => this.benchmark(op.name, op.fn, 100))
    );
    
    const recommendations: OptimizationRecommendation[] = [];
    
    // Analyze each operation
    results.forEach((result) => {
      // Check for slow operations
      if (result.averageLatency > 100) {
        recommendations.push({
          area: result.testName,
          issue: `High average latency: ${result.averageLatency.toFixed(2)}ms`,
          impact: 'HIGH',
          recommendation: 'Consider caching, async processing, or optimization',
          estimatedImprovement: '50-70% latency reduction',
        });
      }
      
      // Check for memory leaks
      if (result.memoryDelta > 10 * 1024 * 1024) { // 10MB
        recommendations.push({
          area: result.testName,
          issue: `High memory consumption: ${(result.memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          impact: 'MEDIUM',
          recommendation: 'Check for memory leaks, implement object pooling',
          estimatedImprovement: '30-50% memory reduction',
        });
      }
      
      // Check for low throughput
      if (result.opsPerSecond < 100) {
        recommendations.push({
          area: result.testName,
          issue: `Low throughput: ${result.opsPerSecond.toFixed(0)} ops/sec`,
          impact: 'MEDIUM',
          recommendation: 'Consider batching, connection pooling, or parallelization',
          estimatedImprovement: '2-3x throughput increase',
        });
      }
    });
    
    this.printOptimizationReport(recommendations);
    return recommendations;
  }
  
  /**
   * Test connection pool efficiency
   */
  async testConnectionPooling(
    createConnection: () => Promise<void>,
    useConnection: () => Promise<void>,
    closeConnection: () => Promise<void>
  ): Promise<{
    withPool: BenchmarkResult;
    withoutPool: BenchmarkResult;
    improvement: number;
  }> {
    console.log('\n🔌 Testing Connection Pool Efficiency');
    
    // Without pooling
    console.log('\n   Without Connection Pooling:');
    const withoutPool = await this.benchmark(
      'Without Pool',
      async () => {
        await createConnection();
        await useConnection();
        await closeConnection();
      },
      50
    );
    
    // With pooling (reuse connection)
    console.log('\n   With Connection Pooling:');
    await createConnection(); // Create once
    const withPool = await this.benchmark(
      'With Pool',
      async () => {
        await useConnection();
      },
      50
    );
    await closeConnection(); // Close once
    
    const improvement = ((withoutPool.averageLatency - withPool.averageLatency) / withoutPool.averageLatency) * 100;
    
    console.log(`\n   📈 Improvement: ${improvement.toFixed(2)}% faster with pooling`);
    
    return { withPool, withoutPool, improvement };
  }
  
  /**
   * Test caching effectiveness
   */
  async testCachingEffectiveness(
    uncachedOperation: () => Promise<void>,
    cachedOperation: () => Promise<void>
  ): Promise<{
    uncached: BenchmarkResult;
    cached: BenchmarkResult;
    speedup: number;
  }> {
    console.log('\n💾 Testing Cache Effectiveness');
    
    const uncached = await this.benchmark('Uncached Operation', uncachedOperation, 100);
    const cached = await this.benchmark('Cached Operation', cachedOperation, 100);
    
    const speedup = uncached.averageLatency / cached.averageLatency;
    
    console.log(`\n   ⚡ Speedup: ${speedup.toFixed(2)}x faster with cache`);
    
    return { uncached, cached, speedup };
  }
  
  /**
   * Print benchmark result
   */
  private printBenchmarkResult(result: BenchmarkResult): void {
    console.log(`   Operations:      ${result.operations.toLocaleString()}`);
    console.log(`   Total Duration:  ${result.totalDuration.toFixed(2)}ms`);
    console.log(`   Avg Latency:     ${result.averageLatency.toFixed(3)}ms`);
    console.log(`   Min Latency:     ${result.minLatency.toFixed(3)}ms`);
    console.log(`   Max Latency:     ${result.maxLatency.toFixed(3)}ms`);
    console.log(`   Ops/sec:         ${result.opsPerSecond.toFixed(0)}`);
    console.log(`   Memory Delta:    ${(result.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
  }
  
  /**
   * Print optimization recommendations
   */
  private printOptimizationReport(recommendations: OptimizationRecommendation[]): void {
    if (recommendations.length === 0) {
      console.log('\n✅ No optimization opportunities identified');
      return;
    }
    
    console.log('\n📋 OPTIMIZATION RECOMMENDATIONS\n');
    
    recommendations
      .sort((a, b) => {
        const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      })
      .forEach((rec, i) => {
        const impactEmoji = rec.impact === 'HIGH' ? '🔴' : rec.impact === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`${i + 1}. ${impactEmoji} ${rec.area} [${rec.impact} IMPACT]`);
        console.log(`   Issue:            ${rec.issue}`);
        console.log(`   Recommendation:   ${rec.recommendation}`);
        console.log(`   Est. Improvement: ${rec.estimatedImprovement}`);
        console.log('');
      });
  }
  
  /**
   * Clean up
   */
  dispose(): void {
    this.observer.disconnect();
  }
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  /**
   * Implement simple cache with TTL
   */
  static createCache<T>(ttl: number = 60000): {
    get: (key: string) => T | undefined;
    set: (key: string, value: T) => void;
    clear: () => void;
  } {
    const cache = new Map<string, { value: T; expires: number }>();
    
    return {
      get: (key: string) => {
        const entry = cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expires) {
          cache.delete(key);
          return undefined;
        }
        return entry.value;
      },
      set: (key: string, value: T) => {
        cache.set(key, {
          value,
          expires: Date.now() + ttl,
        });
      },
      clear: () => cache.clear(),
    };
  }
  
  /**
   * Implement object pool
   */
  static createObjectPool<T>(
    factory: () => T,
    reset: (obj: T) => void,
    maxSize = 100
  ): {
    acquire: () => T;
    release: (obj: T) => void;
  } {
    const pool: T[] = [];
    
    return {
      acquire: () => {
        return pool.pop() || factory();
      },
      release: (obj: T) => {
        if (pool.length < maxSize) {
          reset(obj);
          pool.push(obj);
        }
      },
    };
  }
  
  /**
   * Batch operations
   */
  static createBatcher<T, R>(
    batchFn: (items: T[]) => Promise<R[]>,
    options: {
      maxBatchSize?: number;
      maxWaitTime?: number;
    } = {}
  ): (item: T) => Promise<R> {
    const { maxBatchSize = 100, maxWaitTime = 10 } = options;
    
    let batch: T[] = [];
    let resolvers: Array<(result: R) => void> = [];
    let timer: NodeJS.Timeout | null = null;
    
    const flush = async () => {
      if (batch.length === 0) return;
      
      const currentBatch = batch;
      const currentResolvers = resolvers;
      batch = [];
      resolvers = [];
      
      try {
        const results = await batchFn(currentBatch);
        results.forEach((result, i) => {
          currentResolvers[i](result);
        });
      } catch (error) {
        // Handle error
        console.error('Batch operation failed:', error);
      }
    };
    
    return (item: T) => {
      return new Promise<R>((resolve) => {
        batch.push(item);
        resolvers.push(resolve);
        
        if (batch.length >= maxBatchSize) {
          if (timer) clearTimeout(timer);
          flush();
        } else if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            flush();
          }, maxWaitTime);
        }
      });
    };
  }
}
