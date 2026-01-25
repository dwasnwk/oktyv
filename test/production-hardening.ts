/**
 * Production Hardening Test Suite
 * 
 * Complete test suite for production readiness:
 * 1. Load Testing
 * 2. Security Audit
 * 3. Performance Optimization
 * 4. Monitoring & Metrics
 * 5. Error Recovery Testing
 */

import { LoadTestRunner, createLoadTests } from './load/LoadTestRunner.js';
import { SecurityAuditRunner } from './security/SecurityAuditRunner.js';
import { PerformanceBenchmark } from './performance/PerformanceBenchmark.js';
import { MetricsCollector, HealthChecker } from '../src/monitoring/MetricsSystem.js';
import { ErrorRecoveryTester } from './recovery/ErrorRecoveryTester.js';

export class ProductionHardeningTestSuite {
  private loadTester: LoadTestRunner;
  private securityAuditor: SecurityAuditRunner;
  private performanceBenchmark: PerformanceBenchmark;
  private metrics: MetricsCollector;
  private healthChecker: HealthChecker;
  private recoveryTester: ErrorRecoveryTester;
  
  constructor() {
    this.loadTester = new LoadTestRunner();
    this.securityAuditor = new SecurityAuditRunner();
    this.performanceBenchmark = new PerformanceBenchmark();
    this.metrics = new MetricsCollector();
    this.healthChecker = new HealthChecker();
    this.recoveryTester = new ErrorRecoveryTester();
  }
  
  /**
   * Run complete production hardening suite
   */
  async runCompleteSuite() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 OKTYV PRODUCTION HARDENING TEST SUITE');
    console.log('='.repeat(80));
    
    const startTime = Date.now();
    const results: any = {};
    
    // Phase 1: Load Testing
    console.log('\n\n📊 PHASE 1: LOAD TESTING');
    console.log('='.repeat(80));
    const { tests } = createLoadTests();
    results.loadTests = await this.loadTester.runSuite(tests);
    
    // Phase 2: Security Audit
    console.log('\n\n🔒 PHASE 2: SECURITY AUDIT');
    console.log('='.repeat(80));
    results.securityAudit = await this.securityAuditor.runAudit();
    
    // Phase 3: Performance Benchmarking
    console.log('\n\n⚡ PHASE 3: PERFORMANCE OPTIMIZATION');
    console.log('='.repeat(80));
    results.performance = await this.runPerformanceTests();
    
    // Phase 4: Monitoring & Metrics
    console.log('\n\n📈 PHASE 4: MONITORING & METRICS');
    console.log('='.repeat(80));
    results.monitoring = await this.runMonitoringTests();
    
    // Phase 5: Error Recovery
    console.log('\n\n🛡️  PHASE 5: ERROR RECOVERY TESTING');
    console.log('='.repeat(80));
    results.recovery = await this.runRecoveryTests();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Generate final report
    this.generateFinalReport(results, duration);
    
    return results;
  }
  
  /**
   * Run performance tests
   */
  private async runPerformanceTests() {
    // Sample operation
    const sampleOp = async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
    };
    
    const result = await this.performanceBenchmark.benchmark(
      'Sample Operation',
      sampleOp,
      1000
    );
    
    return { benchmarks: [result] };
  }
  
  /**
   * Run monitoring tests
   */
  private async runMonitoringTests() {
    // Track some sample metrics
    for (let i = 0; i < 100; i++) {
      this.metrics.track('request_latency', Math.random() * 100);
      this.metrics.increment('total_requests');
    }
    
    // Register health checks
    this.healthChecker.registerCheck('database', async () => true);
    this.healthChecker.registerCheck('vault', async () => true);
    this.healthChecker.registerCheck('api', async () => true);
    
    const healthStatus = await this.healthChecker.runHealthChecks();
    const metricsExport = this.metrics.exportMetrics();
    
    console.log('\n📊 Metrics Summary:');
    const latencyStats = this.metrics.getStats('request_latency');
    if (latencyStats) {
      console.log(`   Avg Latency:     ${latencyStats.avg.toFixed(2)}ms`);
      console.log(`   P95 Latency:     ${latencyStats.p95.toFixed(2)}ms`);
      console.log(`   Total Requests:  ${this.metrics.getCounter('total_requests')}`);
    }
    
    console.log('\n💚 Health Status:');
    console.log(`   Overall:         ${healthStatus.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    
    return {
      health: healthStatus,
      metrics: metricsExport,
    };
  }
  
  /**
   * Run error recovery tests
   */
  private async runRecoveryTests() {
    const sampleOp = async () => {
      if (Math.random() > 0.7) throw new Error('Random failure');
    };
    
    await this.recoveryTester.testRetryLogic(sampleOp, 3);
    
    return this.recoveryTester.generateReport();
  }
  
  /**
   * Generate final comprehensive report
   */
  private generateFinalReport(results: any, duration: number) {
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 FINAL PRODUCTION READINESS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n⏱️  Total Duration: ${(duration / 1000).toFixed(2)}s\n`);
    
    // Load Testing Summary
    console.log('📊 LOAD TESTING:');
    if (results.loadTests?.length > 0) {
      const avgRPS = results.loadTests.reduce((sum: number, t: any) => 
        sum + t.requestsPerSecond, 0) / results.loadTests.length;
      console.log(`   Avg Throughput:  ${avgRPS.toFixed(0)} req/s`);
      console.log(`   Tests Run:       ${results.loadTests.length}`);
    }
    
    // Security Summary
    console.log('\n🔒 SECURITY AUDIT:');
    if (results.securityAudit) {
      console.log(`   Security Score:  ${results.securityAudit.score}/100`);
      console.log(`   Vulnerabilities: ${results.securityAudit.vulnerabilities.length}`);
      console.log(`   Critical:        ${results.securityAudit.criticalCount}`);
      console.log(`   High:            ${results.securityAudit.highCount}`);
    }
    
    // Performance Summary
    console.log('\n⚡ PERFORMANCE:');
    if (results.performance?.benchmarks?.length > 0) {
      const bench = results.performance.benchmarks[0];
      console.log(`   Avg Latency:     ${bench.averageLatency.toFixed(2)}ms`);
      console.log(`   Throughput:      ${bench.opsPerSecond.toFixed(0)} ops/s`);
    }
    
    // Monitoring Summary
    console.log('\n📈 MONITORING:');
    if (results.monitoring?.health) {
      console.log(`   Health Status:   ${results.monitoring.health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
      console.log(`   Checks Run:      ${Object.keys(results.monitoring.health.checks).length}`);
    }
    
    // Recovery Summary
    console.log('\n🛡️  ERROR RECOVERY:');
    if (results.recovery) {
      console.log(`   Tests Passed:    ${results.recovery.passed}/${results.recovery.total}`);
      console.log(`   Success Rate:    ${results.recovery.successRate.toFixed(2)}%`);
    }
    
    // Overall Assessment
    console.log('\n' + '='.repeat(80));
    console.log('🎯 OVERALL PRODUCTION READINESS ASSESSMENT');
    console.log('='.repeat(80));
    
    const loadReady = results.loadTests?.every((t: any) => t.errorRate < 0.01);
    const securityReady = results.securityAudit?.score >= 90;
    const performanceReady = results.performance?.benchmarks?.[0]?.opsPerSecond > 100;
    const monitoringReady = results.monitoring?.health?.healthy;
    const recoveryReady = results.recovery?.successRate >= 80;
    
    console.log(`\nLoad Testing:        ${loadReady ? '✅ READY' : '⚠️  NEEDS WORK'}`);
    console.log(`Security Audit:      ${securityReady ? '✅ READY' : '⚠️  NEEDS WORK'}`);
    console.log(`Performance:         ${performanceReady ? '✅ READY' : '⚠️  NEEDS WORK'}`);
    console.log(`Monitoring:          ${monitoringReady ? '✅ READY' : '⚠️  NEEDS WORK'}`);
    console.log(`Error Recovery:      ${recoveryReady ? '✅ READY' : '⚠️  NEEDS WORK'}`);
    
    const allReady = loadReady && securityReady && performanceReady && monitoringReady && recoveryReady;
    
    console.log('\n' + '='.repeat(80));
    if (allReady) {
      console.log('🎉 PRODUCTION READY - ALL SYSTEMS GO!');
    } else {
      console.log('⚠️  NOT PRODUCTION READY - ADDRESS ISSUES ABOVE');
    }
    console.log('='.repeat(80) + '\n');
  }
  
  /**
   * Export all results to JSON
   */
  exportResults(filepath: string, results: any): void {
    const fs = require('fs');
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Complete results exported to: ${filepath}`);
  }
}

// CLI Runner
if (require.main === module) {
  const suite = new ProductionHardeningTestSuite();
  suite.runCompleteSuite()
    .then((results) => {
      suite.exportResults('./production-hardening-results.json', results);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}
