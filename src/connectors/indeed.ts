/**
 * Indeed Connector
 * 
 * Base connector for Indeed automation with intelligent navigation,
 * login detection, and error handling.
 */

import { createLogger } from '../utils/logger.js';
import type { BrowserSessionManager } from '../browser/session.js';
import type { RateLimiter } from '../browser/rate-limiter.js';
import type { Job, JobSearchParams } from '../types/job.js';
import type { Company } from '../types/company.js';
import { OktyvErrorCode, type OktyvError } from '../types/mcp.js';
import { extractJobListings, scrollToLoadMore } from '../tools/indeed-search.js';
import { extractJobDetail } from '../tools/indeed-job.js';
import { extractCompanyDetail } from '../tools/indeed-company.js';

const logger = createLogger('indeed-connector');

/**
 * Indeed-specific URLs
 */
const INDEED_URLS = {
  BASE: 'https://www.indeed.com',
  JOBS_SEARCH: 'https://www.indeed.com/jobs',
  JOB_DETAIL: (jobKey: string) => `https://www.indeed.com/viewjob?jk=${jobKey}`,
  COMPANY: (companyName: string) => `https://www.indeed.com/cmp/${companyName}`,
};

/**
 * Indeed connector for job search and data extraction
 */
export class IndeedConnector {
  private sessionManager: BrowserSessionManager;
  private rateLimiter: RateLimiter;
  private platform: 'INDEED' = 'INDEED';

  constructor(sessionManager: BrowserSessionManager, rateLimiter: RateLimiter) {
    this.sessionManager = sessionManager;
    this.rateLimiter = rateLimiter;
    logger.info('IndeedConnector initialized');
  }

  /**
   * Ensure browser session is ready for Indeed
   * Note: Indeed doesn't require login for most operations
   */
  async ensureReady(): Promise<void> {
    logger.debug('Checking Indeed session readiness');

    // Get or create session
    await this.sessionManager.getSession({
      platform: this.platform,
      headless: true,
    });

    logger.info('Indeed session ready');
  }

  /**
   * Search for jobs on Indeed
   */
  async searchJobs(params: JobSearchParams): Promise<Job[]> {
    logger.info('Searching Indeed jobs', { params });

    // Check rate limit
    await this.rateLimiter.waitForToken(this.platform);

    // Ensure session ready
    await this.ensureReady();

    // Get session
    const session = await this.sessionManager.getSession({
      platform: this.platform,
      headless: true,
    });

    try {
      // Navigate to search with parameters
      const searchUrl = this.buildJobSearchUrl(params);
      
      await this.sessionManager.navigate(this.platform, {
        url: searchUrl,
        waitForSelector: '#mosaic-provider-jobcards',
        timeout: 30000,
      });

      // Scroll to load more results if needed
      const targetCount = params.limit || 10;
      if (targetCount > 15) {
        await scrollToLoadMore(session.page, targetCount);
      }

      // Extract job listings
      const jobs = await extractJobListings(session.page, params);

      logger.info('Job search complete', { count: jobs.length });
      return jobs;

    } catch (error) {
      logger.error('Job search failed', { error });
      
      // If it's already an OktyvError, rethrow it
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      // Otherwise wrap in PARSE_ERROR
      throw {
        code: OktyvErrorCode.PARSE_ERROR,
        message: 'Failed to search Indeed jobs',
        details: error,
        retryable: true,
      } as OktyvError;
    }
  }

  /**
   * Get detailed job information
   */
  async getJob(jobKey: string, includeCompany: boolean = false): Promise<{ job: Job; company?: Company }> {
    logger.info('Fetching Indeed job', { jobKey, includeCompany });

    // Check rate limit
    await this.rateLimiter.waitForToken(this.platform);

    // Ensure session ready
    await this.ensureReady();

    // Get session
    const session = await this.sessionManager.getSession({
      platform: this.platform,
      headless: true,
    });

    try {
      // Navigate to job detail page
      const jobUrl = INDEED_URLS.JOB_DETAIL(jobKey);
      
      await this.sessionManager.navigate(this.platform, {
        url: jobUrl,
        waitForSelector: '.jobsearch-JobInfoHeader-title',
        timeout: 30000,
      });

      // Extract job details
      const job = await extractJobDetail(session.page, jobKey);

      logger.info('Job fetch complete', { jobKey, title: job.title });

      // Fetch company details if requested
      let company: Company | undefined;
      if (includeCompany && job.companyId) {
        try {
          logger.info('Fetching company details', { companyId: job.companyId });
          company = await this.getCompany(job.companyId);
        } catch (error) {
          logger.warn('Failed to fetch company details, continuing without it', { 
            companyId: job.companyId, 
            error 
          });
        }
      }

      return { job, company };

    } catch (error) {
      logger.error('Job fetch failed', { jobKey, error });
      
      // If it's already an OktyvError, rethrow it
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      // Otherwise wrap in PARSE_ERROR
      throw {
        code: OktyvErrorCode.PARSE_ERROR,
        message: 'Failed to fetch Indeed job',
        details: error,
        retryable: true,
      } as OktyvError;
    }
  }

  /**
   * Get company information
   */
  async getCompany(companyName: string): Promise<Company> {
    logger.info('Fetching Indeed company', { companyName });

    // Check rate limit
    await this.rateLimiter.waitForToken(this.platform);

    // Ensure session ready
    await this.ensureReady();

    // Get session
    const session = await this.sessionManager.getSession({
      platform: this.platform,
      headless: true,
    });

    try {
      // Navigate to company page
      const companyUrl = INDEED_URLS.COMPANY(companyName);
      
      await this.sessionManager.navigate(this.platform, {
        url: companyUrl,
        waitForSelector: '[data-testid="companyInfo-name"]',
        timeout: 30000,
      });

      // Extract company details
      const company = await extractCompanyDetail(session.page, companyName);

      logger.info('Company fetch complete', { companyName, name: company.name });
      return company;

    } catch (error) {
      logger.error('Company fetch failed', { companyName, error });
      
      // If it's already an OktyvError, rethrow it
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      // Otherwise wrap in PARSE_ERROR
      throw {
        code: OktyvErrorCode.PARSE_ERROR,
        message: 'Failed to fetch Indeed company',
        details: error,
        retryable: true,
      } as OktyvError;
    }
  }

  /**
   * Build Indeed job search URL with parameters
   */
  private buildJobSearchUrl(params: JobSearchParams): string {
    const url = new URL(INDEED_URLS.JOBS_SEARCH);

    // Keywords (q parameter)
    if (params.keywords) {
      url.searchParams.set('q', params.keywords);
    }

    // Location (l parameter)
    if (params.location) {
      url.searchParams.set('l', params.location);
    }

    // Remote filter (sc parameter with 0kf:attr(DSQF7))
    if (params.remote) {
      url.searchParams.set('sc', '0kf:attr(DSQF7);');
    }

    // Job type filter (jt parameter)
    if (params.jobType && params.jobType.length > 0) {
      const typeMap: Record<string, string> = {
        FULL_TIME: 'fulltime',
        PART_TIME: 'parttime',
        CONTRACT: 'contract',
        TEMPORARY: 'temporary',
        INTERNSHIP: 'internship',
      };
      const types = params.jobType.map(t => typeMap[t]).filter(Boolean);
      if (types.length > 0) {
        url.searchParams.set('jt', types.join(','));
      }
    }

    // Experience level filter (explvl parameter)
    if (params.experienceLevel && params.experienceLevel.length > 0) {
      const levelMap: Record<string, string> = {
        ENTRY_LEVEL: 'entry_level',
        MID_LEVEL: 'mid_level',
        SENIOR_LEVEL: 'senior_level',
      };
      const levels = params.experienceLevel.map(l => levelMap[l]).filter(Boolean);
      if (levels.length > 0) {
        url.searchParams.set('explvl', levels.join(','));
      }
    }

    // Posted within filter (fromage parameter - days)
    if (params.postedWithin) {
      const ageMap: Record<string, string> = {
        '24h': '1',
        '7d': '7',
        '30d': '30',
      };
      const age = ageMap[params.postedWithin];
      if (age) {
        url.searchParams.set('fromage', age);
      }
    }

    // Pagination (start parameter)
    if (params.offset) {
      url.searchParams.set('start', params.offset.toString());
    }

    logger.debug('Built search URL', { url: url.toString() });
    return url.toString();
  }

  /**
   * Check if session is healthy and ready
   */
  async healthCheck(): Promise<boolean> {
    try {
      const session = await this.sessionManager.getSession({
        platform: this.platform,
        headless: true,
      });

      return session.state === 'READY';
    } catch (error) {
      logger.error('Health check failed', { error });
      return false;
    }
  }
}
