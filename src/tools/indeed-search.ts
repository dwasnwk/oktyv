/**
 * Indeed Job Search Tool
 * 
 * Extracts job listings from Indeed search results with pagination support.
 */

import type { Page } from 'puppeteer';
import { createLogger } from '../utils/logger.js';
import { JobType, JobLocation, Platform, type Job, type JobSearchParams } from '../types/job.js';
import { OktyvErrorCode, type OktyvError } from '../types/mcp.js';

const logger = createLogger('indeed-search');

/**
 * Indeed DOM selectors for job search
 */
const SELECTORS = {
  JOB_CARDS: '#mosaic-provider-jobcards ul.jobsearch-ResultsList > li',
  JOB_CARD: '.job_seen_beacon',
  JOB_LINK: 'h2.jobTitle a',
  COMPANY_NAME: '[data-testid="company-name"]',
  COMPANY_LOCATION: '[data-testid="text-location"]',
  SALARY: '[data-testid="attribute_snippet_testid"]',
  JOB_SNIPPET: '.job-snippet',
  JOB_META: '.job-meta',
};

/**
 * Extract job listings from Indeed search results page
 */
export async function extractJobListings(
  page: Page,
  params: JobSearchParams
): Promise<Job[]> {
  logger.info('Extracting job listings from page', { url: page.url() });

  try {
    // Wait for job results to load
    await page.waitForSelector(SELECTORS.JOB_CARDS, { timeout: 10000 });

    // Get all job card elements
    const jobs = await page.evaluate((selectors, limit) => {
      // @ts-expect-error - Running in browser context
      const jobCards = document.querySelectorAll(selectors.JOB_CARDS);
      const results: any[] = [];

      const maxCards = Math.min(jobCards.length, limit || 10);

      for (let i = 0; i < maxCards; i++) {
        const card = jobCards[i];

        // Skip sponsored ads
        if (card.querySelector('.sponsoredJob')) continue;

        try {
          // Extract job link and ID
          // @ts-expect-error - Running in browser context
          const linkElement = card.querySelector(selectors.JOB_LINK) as HTMLAnchorElement;
          if (!linkElement) continue;

          const href = linkElement.href;
          const jobKeyMatch = href.match(/jk=([a-f0-9]+)/);
          if (!jobKeyMatch) continue;

          const jobKey = jobKeyMatch[1];

          // Extract title
          const title = linkElement.textContent?.trim() || '';

          // Extract company
          const companyElement = card.querySelector(selectors.COMPANY_NAME);
          const company = companyElement?.textContent?.trim() || '';

          // Extract location
          const locationElement = card.querySelector(selectors.COMPANY_LOCATION);
          const location = locationElement?.textContent?.trim() || '';

          // Determine location type
          let locationType = 'ONSITE';
          const locationLower = location.toLowerCase();
          if (locationLower.includes('remote')) {
            locationType = 'REMOTE';
          } else if (locationLower.includes('hybrid')) {
            locationType = 'HYBRID';
          }

          // Extract salary if available
          const salaryElement = card.querySelector(selectors.SALARY);
          const salaryText = salaryElement?.textContent?.trim() || '';

          // Extract job snippet (preview of description)
          const snippetElement = card.querySelector(selectors.JOB_SNIPPET);
          const snippet = snippetElement?.textContent?.trim() || '';

          // Extract job meta (date posted, job type)
          const metaElement = card.querySelector(selectors.JOB_META);
          const metaText = metaElement?.textContent?.trim() || '';

          // Build job object
          const job = {
            jobKey,
            title,
            company,
            location,
            locationType,
            url: href,
            salaryText,
            snippet,
            metaText,
          };

          results.push(job);
        } catch (error) {
          console.error('Error extracting job card:', error);
        }
      }

      return results;
    }, SELECTORS, params.limit || 10);

    // Transform raw data into Job objects
    const transformedJobs: Job[] = jobs.map((rawJob: any) => {
      // Parse location
      const locationParts = parseLocation(rawJob.location);

      // Parse posted date from meta
      const postedDate = parsePostedDate(rawJob.metaText);

      // Parse salary if available
      const salary = parseSalary(rawJob.salaryText);

      // Parse job type from meta
      const jobType = parseJobType(rawJob.metaText);

      const job: Job = {
        id: rawJob.jobKey,
        title: rawJob.title,
        company: rawJob.company,
        location: {
          ...locationParts,
          locationType: rawJob.locationType as JobLocation,
        },
        type: jobType,
        description: rawJob.snippet, // Full description will be filled by getJob()
        summary: rawJob.snippet,
        postedDate,
        url: rawJob.url,
        source: Platform.INDEED,
        extractedDate: new Date(),
      };

      // Add salary if available
      if (salary) {
        job.salary = salary;
      }

      return job;
    });

    logger.info('Successfully extracted job listings', { count: transformedJobs.length });
    return transformedJobs;

  } catch (error) {
    logger.error('Failed to extract job listings', { error });
    
    const oktyvError: OktyvError = {
      code: OktyvErrorCode.PARSE_ERROR,
      message: 'Failed to extract job listings from Indeed',
      details: error,
      retryable: true,
    };
    
    throw oktyvError;
  }
}

/**
 * Parse location string into structured format
 */
function parseLocation(locationStr: string): {
  city?: string;
  state?: string;
  country?: string;
} {
  if (!locationStr) return {};

  // Remove "Remote" or "Hybrid" if present
  const cleaned = locationStr
    .replace(/Remote/gi, '')
    .replace(/Hybrid/gi, '')
    .replace(/in /gi, '')
    .trim();

  // Try to parse "City, State" or "City, Country"
  const parts = cleaned.split(',').map(p => p.trim());

  if (parts.length === 0) return {};
  if (parts.length === 1) {
    return { city: parts[0] };
  }
  if (parts.length === 2) {
    // Check if second part is a state (2 letters) or country
    if (parts[1].length === 2) {
      return {
        city: parts[0],
        state: parts[1],
        country: 'US',
      };
    }
    return {
      city: parts[0],
      country: parts[1],
    };
  }
  if (parts.length === 3) {
    return {
      city: parts[0],
      state: parts[1],
      country: parts[2],
    };
  }

  return { city: parts[0] };
}

/**
 * Parse salary string into structured format
 */
function parseSalary(salaryText: string): {
  min?: number;
  max?: number;
  currency: string;
  period: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
} | undefined {
  if (!salaryText) return undefined;

  // Indeed shows salary in various formats:
  // "$50,000 - $80,000 a year"
  // "$25 - $35 an hour"
  // "$50,000 a year"

  // Extract numbers
  const numbers = salaryText.match(/\$?([\d,]+(?:\.\d{2})?)/g);
  if (!numbers || numbers.length === 0) return undefined;

  const cleanNumbers = numbers.map(n => parseFloat(n.replace(/[$,]/g, '')));

  // Determine period
  let period: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'YEARLY';
  if (salaryText.includes('hour')) {
    period = 'HOURLY';
  } else if (salaryText.includes('month')) {
    period = 'MONTHLY';
  } else if (salaryText.includes('week')) {
    period = 'WEEKLY';
  } else if (salaryText.includes('day')) {
    period = 'DAILY';
  }

  // Single number or range
  if (cleanNumbers.length === 1) {
    return {
      min: cleanNumbers[0],
      currency: 'USD',
      period,
    };
  }

  return {
    min: Math.min(...cleanNumbers),
    max: Math.max(...cleanNumbers),
    currency: 'USD',
    period,
  };
}

/**
 * Parse posted date from meta text
 */
function parsePostedDate(metaText: string): Date {
  if (!metaText) return new Date();

  // Indeed uses relative dates: "Just posted", "1 day ago", "30+ days ago"
  const daysAgoMatch = metaText.match(/(\d+)\+?\s*day/i);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  // "Just posted" or "Today"
  if (metaText.includes('Just posted') || metaText.includes('Today')) {
    return new Date();
  }

  // Default to today
  return new Date();
}

/**
 * Parse job type from meta text
 */
function parseJobType(metaText: string): JobType {
  if (!metaText) return JobType.FULL_TIME;

  const lowerMeta = metaText.toLowerCase();

  if (lowerMeta.includes('part-time') || lowerMeta.includes('part time')) {
    return JobType.PART_TIME;
  }
  if (lowerMeta.includes('contract')) {
    return JobType.CONTRACT;
  }
  if (lowerMeta.includes('temporary') || lowerMeta.includes('temp')) {
    return JobType.TEMPORARY;
  }
  if (lowerMeta.includes('intern')) {
    return JobType.INTERNSHIP;
  }

  // Default to full-time
  return JobType.FULL_TIME;
}

/**
 * Scroll to load more jobs (if lazy loading)
 */
export async function scrollToLoadMore(page: Page, targetCount: number): Promise<void> {
  logger.debug('Scrolling to load more jobs', { targetCount });

  let previousHeight = 0;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    // Scroll to bottom
    await page.evaluate(() => {
      // @ts-expect-error - Running in browser context
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for potential new content
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if we've loaded enough
    const currentCount = await page.evaluate((selector) => {
      // @ts-expect-error - Running in browser context
      return document.querySelectorAll(selector).length;
    }, SELECTORS.JOB_CARDS);

    logger.debug('Scroll check', { currentCount, targetCount, attempts });

    if (currentCount >= targetCount) {
      break;
    }

    // Check if page height changed
    const newHeight = await page.evaluate(() => {
      // @ts-expect-error - Running in browser context
      return document.body.scrollHeight;
    });
    if (newHeight === previousHeight) {
      // No new content loaded
      break;
    }

    previousHeight = newHeight;
    attempts++;
  }

  logger.debug('Finished scrolling', { attempts });
}
