/**
 * Indeed Job Detail Tool
 * 
 * Extracts full job details from Indeed job posting pages.
 */

import type { Page } from 'puppeteer';
import { createLogger } from '../utils/logger.js';
import { JobType, JobLocation, Platform, type Job } from '../types/job.js';
import { OktyvErrorCode, type OktyvError } from '../types/mcp.js';

const logger = createLogger('indeed-job');

/**
 * Indeed DOM selectors for job detail pages
 */
const SELECTORS = {
  TITLE: '.jobsearch-JobInfoHeader-title',
  COMPANY: '[data-testid="inlineHeader-companyName"]',
  LOCATION: '[data-testid="inlineHeader-companyLocation"]',
  DESCRIPTION: '#jobDescriptionText',
  SALARY: '#salaryInfoAndJobType',
  JOB_TYPE: '#salaryInfoAndJobType',
  POSTED_DATE: '.jobsearch-JobMetadataFooter',
  APPLICANT_COUNT: '.jobsearch-JobMetadataHeader-applicantCount',
  BENEFITS: '.js-match-insights-provider-1v7dnf',
};

/**
 * Extract full job details from Indeed job posting page
 */
export async function extractJobDetail(
  page: Page,
  jobKey: string
): Promise<Job> {
  logger.info('Extracting job detail', { jobKey, url: page.url() });

  try {
    // Wait for key elements
    await page.waitForSelector(SELECTORS.TITLE, { timeout: 10000 });

    // Extract all job data
    const jobData = await page.evaluate((selectors) => {
      // Helper to safely get text content
      const getText = (selector: string): string => {
        // @ts-expect-error - Running in browser context
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || '';
      };

      // Helper to safely get HTML content
      const getHTML = (selector: string): string => {
        // @ts-expect-error - Running in browser context
        const element = document.querySelector(selector);
        return element?.innerHTML?.trim() || '';
      };

      // Helper to get all text from multiple elements
      const getAll = (selector: string): string[] => {
        // @ts-expect-error - Running in browser context
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map((el: any) => el.textContent?.trim() || '').filter(Boolean);
      };

      // Extract basic info
      const title = getText(selectors.TITLE);
      const company = getText(selectors.COMPANY);
      const location = getText(selectors.LOCATION);
      const descriptionHTML = getHTML(selectors.DESCRIPTION);
      const salaryText = getText(selectors.SALARY);
      const jobTypeText = getText(selectors.JOB_TYPE);
      const postedDateText = getText(selectors.POSTED_DATE);
      const applicantCountText = getText(selectors.APPLICANT_COUNT);

      // Extract benefits if available
      const benefits = getAll(selectors.BENEFITS);

      // Extract skills and requirements from description
      const descriptionText = getText(selectors.DESCRIPTION);
      
      // Try to find company ID from link
      let companyId = '';
      // @ts-expect-error - Running in browser context
      const companyLink = document.querySelector('[data-testid="inlineHeader-companyName"] a') as HTMLAnchorElement;
      if (companyLink) {
        const match = companyLink.href.match(/\/cmp\/([^/?]+)/);
        if (match) {
          companyId = match[1];
        }
      }

      return {
        title,
        company,
        companyId,
        location,
        descriptionHTML,
        descriptionText,
        salaryText,
        jobTypeText,
        postedDateText,
        applicantCountText,
        benefits,
      };
    }, SELECTORS);

    // Parse location
    const locationParts = parseLocation(jobData.location);
    const locationType = parseLocationType(jobData.location);

    // Parse salary
    const salary = parseSalary(jobData.salaryText);

    // Parse job type
    const jobType = parseJobType(jobData.jobTypeText);

    // Parse posted date
    const postedDate = parsePostedDate(jobData.postedDateText);

    // Parse applicant count
    const applicantCount = parseApplicantCount(jobData.applicantCountText);

    // Extract skills and requirements
    const { skills, requirements } = extractSkillsAndRequirements(jobData.descriptionText);

    // Build Job object
    const job: Job = {
      id: jobKey,
      title: jobData.title,
      company: jobData.company,
      companyId: jobData.companyId || undefined,
      location: {
        ...locationParts,
        locationType,
      },
      type: jobType,
      description: jobData.descriptionHTML,
      summary: jobData.descriptionText.substring(0, 500), // First 500 chars
      postedDate,
      url: page.url(),
      source: Platform.INDEED,
      extractedDate: new Date(),
    };

    // Add optional fields
    if (salary) {
      job.salary = salary;
    }

    if (applicantCount) {
      job.applicantCount = applicantCount;
    }

    if (skills.length > 0) {
      job.skills = skills;
    }

    if (requirements.length > 0) {
      job.requirements = requirements;
    }

    if (jobData.benefits.length > 0) {
      job.benefits = jobData.benefits;
    }

    logger.info('Successfully extracted job detail', { 
      jobKey, 
      title: job.title,
      company: job.company 
    });
    
    return job;

  } catch (error) {
    logger.error('Failed to extract job detail', { jobKey, error });
    
    const oktyvError: OktyvError = {
      code: OktyvErrorCode.PARSE_ERROR,
      message: 'Failed to extract job details from Indeed',
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

  // Remove location type markers
  const cleaned = locationStr
    .replace(/Remote/gi, '')
    .replace(/Hybrid/gi, '')
    .replace(/in /gi, '')
    .trim();

  const parts = cleaned.split(',').map(p => p.trim());

  if (parts.length === 0) return {};
  if (parts.length === 1) {
    return { city: parts[0] };
  }
  if (parts.length === 2) {
    // Check if second part is a state (2 letters)
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
 * Parse location type from location string
 */
function parseLocationType(locationStr: string): JobLocation {
  const lower = locationStr.toLowerCase();
  
  if (lower.includes('remote')) {
    return JobLocation.REMOTE;
  }
  if (lower.includes('hybrid')) {
    return JobLocation.HYBRID;
  }
  
  return JobLocation.ONSITE;
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
 * Parse job type from text
 */
function parseJobType(jobTypeText: string): JobType {
  if (!jobTypeText) return JobType.FULL_TIME;

  const lower = jobTypeText.toLowerCase();

  if (lower.includes('part-time') || lower.includes('part time')) {
    return JobType.PART_TIME;
  }
  if (lower.includes('contract')) {
    return JobType.CONTRACT;
  }
  if (lower.includes('temporary') || lower.includes('temp')) {
    return JobType.TEMPORARY;
  }
  if (lower.includes('intern')) {
    return JobType.INTERNSHIP;
  }

  return JobType.FULL_TIME;
}

/**
 * Parse posted date from text
 */
function parsePostedDate(postedDateText: string): Date {
  if (!postedDateText) return new Date();

  // Indeed uses relative dates
  const daysAgoMatch = postedDateText.match(/(\d+)\+?\s*day/i);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  if (postedDateText.includes('Just posted') || postedDateText.includes('Today')) {
    return new Date();
  }

  return new Date();
}

/**
 * Parse applicant count from text
 */
function parseApplicantCount(applicantCountText: string): number | undefined {
  if (!applicantCountText) return undefined;

  // Extract number: "25 applicants" or "100+ applicants"
  const match = applicantCountText.match(/(\d+)\+?/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * Extract skills and requirements from description text
 */
function extractSkillsAndRequirements(description: string): {
  skills: string[];
  requirements: string[];
} {
  const skills: string[] = [];
  const requirements: string[] = [];

  if (!description) {
    return { skills, requirements };
  }

  // Common skill patterns
  const skillPatterns = [
    /(?:experience (?:with|in))\s+([A-Za-z0-9\.\+\#\s]+?)(?:\,|\.|\n|$)/gi,
    /(?:proficiency (?:with|in))\s+([A-Za-z0-9\.\+\#\s]+?)(?:\,|\.|\n|$)/gi,
    /(?:knowledge of)\s+([A-Za-z0-9\.\+\#\s]+?)(?:\,|\.|\n|$)/gi,
  ];

  for (const pattern of skillPatterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const skill = match[1].trim();
      if (skill.length > 2 && skill.length < 50 && !skills.includes(skill)) {
        skills.push(skill);
      }
    }
  }

  // Common requirement patterns
  const requirementPatterns = [
    /(?:must have|required:)\s+([^\.]+)/gi,
    /(?:bachelor's|master's|phd)\s+(?:degree)?\s+in\s+([^\.]+)/gi,
    /(?:\d+\+?\s+years)\s+(?:of\s+)?(?:experience|exp)/gi,
  ];

  for (const pattern of requirementPatterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const requirement = match[0].trim();
      if (requirement.length > 5 && requirement.length < 200 && !requirements.includes(requirement)) {
        requirements.push(requirement);
      }
    }
  }

  // Limit arrays
  return {
    skills: skills.slice(0, 20),
    requirements: requirements.slice(0, 10),
  };
}
