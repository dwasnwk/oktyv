/**
 * Indeed Company Detail Tool
 * 
 * Extracts company information from Indeed company pages.
 */

import type { Page } from 'puppeteer';
import { createLogger } from '../utils/logger.js';
import { CompanySize, Industry, Platform, type Company } from '../types/company.js';
import { OktyvErrorCode, type OktyvError } from '../types/mcp.js';

const logger = createLogger('indeed-company');

/**
 * Indeed DOM selectors for company pages
 */
const SELECTORS = {
  NAME: '[data-testid="companyInfo-name"]',
  TAGLINE: '[data-testid="companyInfo-tagline"]',
  WEBSITE: '[data-testid="companyInfo-website"] a',
  DESCRIPTION: '[data-testid="companyInfo-description"]',
  SIZE: '[data-testid="companyInfo-employee"]',
  INDUSTRY: '[data-testid="companyInfo-industry"]',
  FOUNDED: '[data-testid="companyInfo-founded"]',
  LOCATION: '[data-testid="companyInfo-headquarters"]',
  RATING: '[data-testid="rating-stars"]',
  REVIEW_COUNT: '[data-testid="rating-count"]',
  BENEFITS: '[data-testid="employerBenefits-list"] li',
};

/**
 * Extract company details from Indeed company page
 */
export async function extractCompanyDetail(
  page: Page,
  companyName: string
): Promise<Company> {
  logger.info('Extracting company detail', { companyName, url: page.url() });

  try {
    // Wait for company info section
    await page.waitForSelector(SELECTORS.NAME, { timeout: 10000 });

    // Extract all company data
    const companyData = await page.evaluate((selectors) => {
      // Helper to safely get text content
      const getText = (selector: string): string => {
        // @ts-expect-error - Running in browser context
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || '';
      };

      // Helper to get attribute
      const getAttr = (selector: string, attr: string): string => {
        // @ts-expect-error - Running in browser context
        const element = document.querySelector(selector);
        return element?.getAttribute(attr) || '';
      };

      // Helper to get all text from multiple elements
      const getAll = (selector: string): string[] => {
        // @ts-expect-error - Running in browser context
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map((el: any) => el.textContent?.trim() || '').filter(Boolean);
      };

      const name = getText(selectors.NAME);
      const tagline = getText(selectors.TAGLINE);
      const website = getAttr(selectors.WEBSITE, 'href');
      const description = getText(selectors.DESCRIPTION);
      const sizeText = getText(selectors.SIZE);
      const industryText = getText(selectors.INDUSTRY);
      const foundedText = getText(selectors.FOUNDED);
      const locationText = getText(selectors.LOCATION);
      const ratingText = getText(selectors.RATING);
      const reviewCountText = getText(selectors.REVIEW_COUNT);
      const benefits = getAll(selectors.BENEFITS);

      return {
        name,
        tagline,
        website,
        description,
        sizeText,
        industryText,
        foundedText,
        locationText,
        ratingText,
        reviewCountText,
        benefits,
      };
    }, SELECTORS);

    // Parse company size
    const size = parseCompanySize(companyData.sizeText);

    // Parse industry
    const industry = parseIndustry(companyData.industryText);

    // Parse founded year
    const founded = parseFounded(companyData.foundedText);

    // Parse location
    const location = parseLocation(companyData.locationText);

    // Parse rating
    const rating = parseRating(companyData.ratingText);

    // Parse review count
    const reviewCount = parseReviewCount(companyData.reviewCountText);

    // Build Company object
    const company: Company = {
      id: companyName,
      name: companyData.name || companyName,
      description: companyData.description,
      industry,
      size,
      url: page.url(),
      source: Platform.INDEED,
      extractedDate: new Date(),
    };

    // Add optional fields
    if (companyData.tagline) {
      company.tagline = companyData.tagline;
    }

    if (companyData.website) {
      company.website = companyData.website;
    }

    if (founded) {
      company.founded = founded;
    }

    if (location.city || location.state || location.country) {
      company.location = {
        city: location.city,
        state: location.state,
        country: location.country,
      };
    }

    if (rating) {
      company.rating = {
        value: rating,
        source: 'Indeed',
      };
    }

    if (reviewCount) {
      company.reviewCount = reviewCount;
    }

    if (companyData.benefits.length > 0) {
      company.benefits = companyData.benefits;
    }

    logger.info('Successfully extracted company detail', { 
      companyName, 
      name: company.name,
      industry: company.industry 
    });
    
    return company;

  } catch (error) {
    logger.error('Failed to extract company detail', { companyName, error });
    
    const oktyvError: OktyvError = {
      code: OktyvErrorCode.PARSE_ERROR,
      message: 'Failed to extract company details from Indeed',
      details: error,
      retryable: true,
    };
    
    throw oktyvError;
  }
}

/**
 * Parse company size from text
 */
function parseCompanySize(sizeText: string): CompanySize {
  if (!sizeText) return CompanySize.UNKNOWN;

  // Extract number range: "10 to 49 employees" or "500+ employees"
  const match = sizeText.match(/(\d+)\s*(?:to|-)?\s*(\d+)?/);
  if (!match) return CompanySize.UNKNOWN;

  const min = parseInt(match[1], 10);
  const max = match[2] ? parseInt(match[2], 10) : min;

  if (max < 10) return CompanySize.STARTUP;
  if (max < 50) return CompanySize.SMALL;
  if (max < 250) return CompanySize.MEDIUM;
  if (max < 1000) return CompanySize.LARGE;
  return CompanySize.ENTERPRISE;
}

/**
 * Parse industry from text
 */
function parseIndustry(industryText: string): Industry {
  if (!industryText) return Industry.UNKNOWN;

  const lower = industryText.toLowerCase();

  if (lower.includes('tech') || lower.includes('software') || lower.includes('it')) {
    return Industry.TECHNOLOGY;
  }
  if (lower.includes('finance') || lower.includes('bank') || lower.includes('insurance')) {
    return Industry.FINANCE;
  }
  if (lower.includes('health') || lower.includes('medical') || lower.includes('pharma')) {
    return Industry.HEALTHCARE;
  }
  if (lower.includes('retail') || lower.includes('commerce')) {
    return Industry.RETAIL;
  }
  if (lower.includes('education') || lower.includes('university')) {
    return Industry.EDUCATION;
  }
  if (lower.includes('manufact')) {
    return Industry.MANUFACTURING;
  }
  if (lower.includes('consult')) {
    return Industry.CONSULTING;
  }
  if (lower.includes('legal') || lower.includes('law')) {
    return Industry.LEGAL;
  }
  if (lower.includes('government') || lower.includes('public')) {
    return Industry.GOVERNMENT;
  }

  return Industry.OTHER;
}

/**
 * Parse founded year from text
 */
function parseFounded(foundedText: string): number | undefined {
  if (!foundedText) return undefined;

  const match = foundedText.match(/(\d{4})/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * Parse location from text
 */
function parseLocation(locationText: string): {
  city?: string;
  state?: string;
  country?: string;
} {
  if (!locationText) return {};

  const parts = locationText.split(',').map(p => p.trim());

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
 * Parse rating from text
 */
function parseRating(ratingText: string): number | undefined {
  if (!ratingText) return undefined;

  const match = ratingText.match(/([\d\.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }

  return undefined;
}

/**
 * Parse review count from text
 */
function parseReviewCount(reviewCountText: string): number | undefined {
  if (!reviewCountText) return undefined;

  // Extract number, may have "K" multiplier
  const match = reviewCountText.match(/([\d\.]+)\s*([KMB])?/i);
  if (!match) return undefined;

  let count = parseFloat(match[1]);
  const multiplier = match[2]?.toUpperCase();

  if (multiplier === 'K') {
    count *= 1000;
  } else if (multiplier === 'M') {
    count *= 1000000;
  } else if (multiplier === 'B') {
    count *= 1000000000;
  }

  return Math.floor(count);
}
