/**
 * Canonical Job Data Schema
 * Platform-agnostic representation of job listings
 * 
 * Design Principles:
 * - Independent of any specific platform (LinkedIn, Indeed, etc.)
 * - Contains all common fields across platforms
 * - Optional `raw` field preserves original platform data
 * - Consistent experience for Claude and Career System
 */

export enum JobType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
  INTERNSHIP = 'INTERNSHIP',
  VOLUNTEER = 'VOLUNTEER',
}

export enum JobLocation {
  ONSITE = 'ONSITE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}

export enum ExperienceLevel {
  ENTRY_LEVEL = 'ENTRY_LEVEL',
  MID_LEVEL = 'MID_LEVEL',
  SENIOR_LEVEL = 'SENIOR_LEVEL',
  DIRECTOR = 'DIRECTOR',
  EXECUTIVE = 'EXECUTIVE',
  INTERNSHIP = 'INTERNSHIP',
}

export enum Platform {
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  WELLFOUND = 'WELLFOUND',
  GENERIC = 'GENERIC',
  VANGST = 'VANGST',
  DICE = 'DICE',
  REMOTE_CO = 'REMOTE_CO',
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;  // ISO 4217 (USD, EUR, etc.)
  period: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}

export interface Location {
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  locationType: JobLocation;
}

export interface Job {
  // Identity
  id: string;                    // Platform-specific ID
  url: string;                   // Direct link to job posting
  source: Platform;              // Which platform this came from
  
  // Core Info
  title: string;
  company: string;
  companyId?: string;            // Platform-specific company ID
  
  // Details
  description: string;           // Full job description (HTML or Markdown)
  summary?: string;              // Short summary if available
  type: JobType;
  experienceLevel?: ExperienceLevel;
  
  // Location
  location: Location;
  
  // Compensation
  salary?: SalaryRange;
  
  // Metadata
  postedDate: Date;              // When job was posted
  extractedDate: Date;           // When we extracted this data
  applicationDeadline?: Date;
  applicantCount?: number;       // How many applied (if available)
  
  // Application
  applicationMethod?: {
    type: 'EXTERNAL' | 'PLATFORM' | 'EMAIL';
    url?: string;
    email?: string;
    instructions?: string;
  };
  
  // Skills/Requirements (optional, platform-dependent)
  skills?: string[];
  requirements?: string[];
  benefits?: string[];
  
  // Original Data
  raw?: unknown;                 // Original platform response (for debugging)
}

export interface JobSearchParams {
  keywords?: string;
  location?: string;
  remote?: boolean;
  jobType?: JobType[];
  experienceLevel?: ExperienceLevel[];
  salaryMin?: number;
  postedWithin?: '24h' | '7d' | '30d';  // Relative time filters
  limit?: number;
  offset?: number;
}

export interface JobSearchResult {
  jobs: Job[];
  totalCount?: number;           // Total available (if known)
  hasMore: boolean;              // Whether more results exist
  nextOffset?: number;           // For pagination
  query: JobSearchParams;        // What was searched
  searchedAt: Date;              // When search was performed
  platform: Platform;
}
