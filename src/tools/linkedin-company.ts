/**
 * LinkedIn Company Tool
 * 
 * Extracts complete company information from LinkedIn company pages.
 */

import type { Page } from 'puppeteer';
import { createLogger } from '../utils/logger.js';
import { Platform } from '../types/job.js';
import { CompanySize, Industry, type Company } from '../types/company.js';
import { OktyvErrorCode, type OktyvError } from '../types/mcp.js';

const logger = createLogger('linkedin-company');

/**
 * LinkedIn DOM selectors for company page
 */
const SELECTORS = {
  COMPANY_NAME: 'h1.org-top-card-summary__title',
  TAGLINE: '.org-top-card-summary__tagline',
  DESCRIPTION: '.org-about-us-organization-description__text',
  WEBSITE: 'a.org-about-us-__website',
  INDUSTRY: '.org-about-company-module__industry',
  COMPANY_SIZE: '.org-about-company-module__company-size-definition-text',
  HEADQUARTERS: '.org-about-company-module__headquarters',
  FOUNDED: '.org-about-company-module__founded',
  SPECIALTIES: '.org-about-company-module__specialities',
  FOLLOWER_COUNT: '.org-top-card-summary-info-list__info-item',
};

/**
 * Extract company details from LinkedIn company page
 */
export async function extractCompanyDetail(page: Page, companyId: string): Promise<Company> {
  logger.info('Extracting company detail', { companyId, url: page.url() });

  try {
    // Wait for company page to load
    await page.waitForSelector(SELECTORS.COMPANY_NAME, { timeout: 10000 });

    // Extract all company information
    const companyData = await page.evaluate((selectors) => {
      const getText = (selector: string): string => {
        /* @ts-ignore - Browser context */
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      const getAllText = (selector: string): string[] => {
        /* @ts-ignore - Browser context */
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map((el: any) => el.textContent?.trim() || '');
      };

      // Basic info
      const name = getText(selectors.COMPANY_NAME);
      const tagline = getText(selectors.TAGLINE);
      const description = getText(selectors.DESCRIPTION);

      // Website
      /* @ts-ignore - Browser context */
      const websiteEl = document.querySelector(selectors.WEBSITE) as any;
      const website = websiteEl?.href || '';

      // Company details
      const industry = getText(selectors.INDUSTRY);
      const companySize = getText(selectors.COMPANY_SIZE);
      const headquarters = getText(selectors.HEADQUARTERS);
      const founded = getText(selectors.FOUNDED);
      const specialties = getText(selectors.SPECIALTIES);

      // Follower count
      const followerTexts = getAllText(selectors.FOLLOWER_COUNT);
      const followerText = followerTexts.find(t => 
        t && (t.includes('follower') || t.includes('Follower'))
      ) || '';

      return {
        name,
        tagline,
        description,
        website,
        industry,
        companySize,
        headquarters,
        founded,
        specialties,
        followerText,
      };
    }, SELECTORS);

    // Parse company size
    const { size, employeeCount } = parseCompanySize(companyData.companySize);

    // Parse headquarters
    const headquarters = parseHeadquarters(companyData.headquarters);

    // Parse founded year
    const founded = parseFounded(companyData.founded);

    // Parse specialties
    const specialties = parseSpecialties(companyData.specialties);

    // Parse industry
    const industry = parseIndustry(companyData.industry);

    // Parse follower count
    const followerCount = parseFollowerCount(companyData.followerText);

    // Build Company object
    const company: Company = {
      id: companyId,
      name: companyData.name,
      url: companyData.website || undefined,
      linkedinUrl: page.url(),
      source: Platform.LINKEDIN,
      extractedDate: new Date(),
    };

    // Add optional fields
    if (companyData.description) {
      company.description = companyData.description;
    }
    if (companyData.tagline) {
      company.tagline = companyData.tagline;
    }
    if (size) {
      company.size = size;
    }
    if (employeeCount) {
      company.employeeCount = employeeCount;
    }
    if (industry) {
      company.industry = industry;
    }
    if (specialties.length > 0) {
      company.specialties = specialties;
    }
    if (headquarters) {
      company.headquarters = headquarters;
    }
    if (founded) {
      company.founded = founded;
    }
    if (followerCount) {
      company.followerCount = followerCount;
    }

    logger.info('Successfully extracted company detail', { companyId, name: company.name });
    return company;

  } catch (error) {
    logger.error('Failed to extract company detail', { companyId, error });
    
    const oktyvError: OktyvError = {
      code: OktyvErrorCode.PARSE_ERROR,
      message: 'Failed to extract company details from LinkedIn',
      details: error,
      retryable: true,
    };
    
    throw oktyvError;
  }
}

/**
 * Parse company size text into structured format
 */
function parseCompanySize(sizeText: string): {
  size?: CompanySize;
  employeeCount?: { min?: number; max?: number };
} {
  if (!sizeText) return {};

  // Extract numbers (e.g., "51-200 employees")
  const rangeMatch = sizeText.match(/(\d+(?:,\d+)?)\s*-\s*(\d+(?:,\d+)?)/);
  
  let min: number | undefined;
  let max: number | undefined;

  if (rangeMatch) {
    min = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
    max = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
  } else {
    // Single number (e.g., "10,000+ employees")
    const singleMatch = sizeText.match(/(\d+(?:,\d+)?)\+?/);
    if (singleMatch) {
      min = parseInt(singleMatch[1].replace(/,/g, ''), 10);
    }
  }

  // Determine size category
  let size: CompanySize | undefined;

  if (max) {
    if (max <= 10) {
      size = CompanySize.STARTUP;
    } else if (max <= 50) {
      size = CompanySize.SMALL;
    } else if (max <= 200) {
      size = CompanySize.MEDIUM;
    } else if (max <= 1000) {
      size = CompanySize.LARGE;
    } else {
      size = CompanySize.ENTERPRISE;
    }
  } else if (min) {
    if (min >= 1000) {
      size = CompanySize.ENTERPRISE;
    } else if (min >= 200) {
      size = CompanySize.LARGE;
    }
  }

  return {
    size,
    employeeCount: (min || max) ? { min, max } : undefined,
  };
}

/**
 * Parse headquarters location
 */
function parseHeadquarters(hqText: string): {
  city?: string;
  state?: string;
  country?: string;
} | undefined {
  if (!hqText) return undefined;

  const parts = hqText.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) return undefined;
  if (parts.length === 1) {
    return { city: parts[0] };
  }
  if (parts.length === 2) {
    return { city: parts[0], state: parts[1] };
  }
  
  return {
    city: parts[0],
    state: parts[1],
    country: parts[2],
  };
}

/**
 * Parse founded year
 */
function parseFounded(foundedText: string): number | undefined {
  if (!foundedText) return undefined;

  const yearMatch = foundedText.match(/\d{4}/);
  if (yearMatch) {
    return parseInt(yearMatch[0], 10);
  }

  return undefined;
}

/**
 * Parse specialties into array
 */
function parseSpecialties(specialtiesText: string): string[] {
  if (!specialtiesText) return [];

  // Split on commas, "and", or newlines
  const specialties = specialtiesText
    .split(/,|\band\b|\n/)
    .map(s => s.trim())
    .filter(Boolean);

  // Limit to 20 specialties
  return specialties.slice(0, 20);
}

/**
 * Parse industry into standard category
 */
function parseIndustry(industryText: string): Industry | undefined {
  if (!industryText) return undefined;

  const lower = industryText.toLowerCase();

  // Map common LinkedIn industries to our categories
  if (lower.includes('technology') || lower.includes('software') || lower.includes('internet')) {
    return Industry.TECHNOLOGY;
  } else if (lower.includes('finance') || lower.includes('banking') || lower.includes('investment')) {
    return Industry.FINANCE;
  } else if (lower.includes('health') || lower.includes('medical') || lower.includes('pharmaceutical')) {
    return Industry.HEALTHCARE;
  } else if (lower.includes('education') || lower.includes('university') || lower.includes('learning')) {
    return Industry.EDUCATION;
  } else if (lower.includes('retail') || lower.includes('ecommerce') || lower.includes('consumer')) {
    return Industry.RETAIL;
  } else if (lower.includes('manufacturing') || lower.includes('industrial')) {
    return Industry.MANUFACTURING;
  } else if (lower.includes('consulting') || lower.includes('advisory')) {
    return Industry.CONSULTING;
  } else if (lower.includes('media') || lower.includes('entertainment') || lower.includes('publishing')) {
    return Industry.MEDIA;
  } else if (lower.includes('hospitality') || lower.includes('hotel') || lower.includes('restaurant')) {
    return Industry.HOSPITALITY;
  } else if (lower.includes('cannabis') || lower.includes('marijuana')) {
    return Industry.CANNABIS;
  }

  return Industry.OTHER;
}

/**
 * Parse follower count
 */
function parseFollowerCount(followerText: string): number | undefined {
  if (!followerText) return undefined;

  // Extract number (e.g., "1,234 followers" or "1.2M followers")
  const numberMatch = followerText.match(/([\d,.]+)([KMB])?/);
  if (!numberMatch) return undefined;

  let count = parseFloat(numberMatch[1].replace(/,/g, ''));
  const multiplier = numberMatch[2];

  if (multiplier === 'K') {
    count *= 1000;
  } else if (multiplier === 'M') {
    count *= 1000000;
  } else if (multiplier === 'B') {
    count *= 1000000000;
  }

  return Math.floor(count);
}
