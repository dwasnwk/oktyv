/**
 * LinkedIn Connector Unit Tests
 * Using Node.js built-in test runner
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { LinkedInConnector } from '../../../src/connectors/linkedin.js';
import { Platform, JobType, ExperienceLevel } from '../../../src/types/job.js';
import { OktyvErrorCode } from '../../../src/types/mcp.js';
import type { BrowserSessionManager } from '../../../src/browser/session.js';
import type { RateLimiter } from '../../../src/browser/rate-limiter.js';
import type { Page } from 'puppeteer';

describe('LinkedInConnector', () => {
  let connector: LinkedInConnector;
  let mockSessionManager: BrowserSessionManager;
  let mockRateLimiter: RateLimiter;
  let mockPage: Page;

  beforeEach(() => {
    // Create mock page
    mockPage = {
      goto: mock.fn(),
      waitForSelector: mock.fn(),
      evaluate: mock.fn(),
      $: mock.fn(),
      $$: mock.fn(),
    } as unknown as Page;

    // Create mock session manager
    mockSessionManager = {
      getSession: mock.fn(async () => ({
        page: mockPage,
        state: 'READY',
        platform: Platform.LINKEDIN,
      })),
      detectLogin: mock.fn(async () => ({
        isLoggedIn: true,
        method: 'session',
      })),
      navigate: mock.fn(async () => undefined),
    } as unknown as BrowserSessionManager;

    // Create mock rate limiter
    mockRateLimiter = {
      waitForToken: mock.fn(async () => undefined),
    } as unknown as RateLimiter;

    // Create connector instance
    connector = new LinkedInConnector(mockSessionManager, mockRateLimiter);
  });

  describe('constructor', () => {
    it('should initialize with session manager and rate limiter', () => {
      assert.ok(connector);
      assert.ok(connector instanceof LinkedInConnector);
    });
  });

  describe('ensureLoggedIn', () => {
    it('should return immediately if already logged in', async () => {
      await connector.ensureLoggedIn();

      const getSessionCalls = (mockSessionManager.getSession as any).mock.calls;
      assert.equal(getSessionCalls.length, 1);
      assert.deepEqual(getSessionCalls[0].arguments[0], {
        platform: Platform.LINKEDIN,
        headless: true,
      });

      const detectLoginCalls = (mockSessionManager.detectLogin as any).mock.calls;
      assert.equal(detectLoginCalls.length, 1);

      const navigateCalls = (mockSessionManager.navigate as any).mock.calls;
      assert.equal(navigateCalls.length, 0);
    });

    it('should throw NOT_LOGGED_IN error if not logged in', async () => {
      // Mock not logged in
      (mockSessionManager.detectLogin as any) = mock.fn(async () => ({
        isLoggedIn: false,
        method: null,
      }));

      await assert.rejects(
        async () => await connector.ensureLoggedIn(),
        (err: any) => {
          assert.equal(err.code, OktyvErrorCode.NOT_LOGGED_IN);
          assert.equal(err.retryable, false);
          return true;
        }
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when session is READY', async () => {
      const isHealthy = await connector.healthCheck();
      assert.equal(isHealthy, true);
    });

    it('should return false when session fails to load', async () => {
      (mockSessionManager.getSession as any) = mock.fn(async () => {
        throw new Error('Session failed');
      });

      const isHealthy = await connector.healthCheck();
      assert.equal(isHealthy, false);
    });
  });
});
