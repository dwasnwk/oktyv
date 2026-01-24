/**
 * Company Data Schema
 * Platform-agnostic representation of company information
 */

import { Platform } from './job.js';

export { Platform };

export enum CompanySize {
  UNKNOWN = 'UNKNOWN',
  STARTUP = 'STARTUP',              // 1-10
  SMALL = 'SMALL',                  // 11-50
  MEDIUM = 'MEDIUM',                // 51-200
  LARGE = 'LARGE',                  // 201-1000
  ENTERPRISE = 'ENTERPRISE',        // 1000+
}

export enum Industry {
  UNKNOWN = 'UNKNOWN',
  TECHNOLOGY = 'TECHNOLOGY',
  FINANCE = 'FINANCE',
  HEALTHCARE = 'HEALTHCARE',
  EDUCATION = 'EDUCATION',
  RETAIL = 'RETAIL',
  MANUFACTURING = 'MANUFACTURING',
  CONSULTING = 'CONSULTING',
  MEDIA = 'MEDIA',
  HOSPITALITY = 'HOSPITALITY',
  CANNABIS = 'CANNABIS',
  LEGAL = 'LEGAL',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER',
}

export interface Company {
  // Identity
  id: string;                       // Platform-specific ID
  name: string;
  url?: string;                     // Company website
  website?: string;                 // Alternative website field (Indeed uses this)
  linkedinUrl?: string;             // LinkedIn profile
  source: Platform;
  
  // Description
  description?: string;
  tagline?: string;
  
  // Size & Industry
  size?: CompanySize;
  employeeCount?: {
    min?: number;
    max?: number;
    exact?: number;
  };
  industry?: Industry;
  specialties?: string[];
  
  // Location
  headquarters?: {
    city?: string;
    state?: string;
    country?: string;
  };
  location?: {                      // Alternative single location (Indeed uses this)
    city?: string;
    state?: string;
    country?: string;
  };
  locations?: Array<{
    city?: string;
    state?: string;
    country?: string;
    isPrimary?: boolean;
  }>;
  
  // Metrics (if available)
  founded?: number;                 // Year founded
  revenue?: {
    amount?: number;
    currency?: string;
    period?: 'ANNUAL' | 'QUARTERLY';
  };
  funding?: {
    stage?: 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'IPO' | 'ACQUIRED';
    totalRaised?: number;
    currency?: string;
  };
  
  // Social
  followerCount?: number;
  rating?: {
    value: number;                  // 0-5 typically
    reviewCount?: number;
    source?: string;                // Glassdoor, Indeed, etc.
  };
  reviewCount?: number;             // Top-level review count (Indeed uses this)
  benefits?: string[];              // List of benefits offered
  
  // Metadata
  extractedDate: Date;
  
  // Original Data
  raw?: unknown;
}

export interface CompanySearchParams {
  name?: string;
  industry?: Industry[];
  size?: CompanySize[];
  location?: string;
  limit?: number;
  offset?: number;
}
