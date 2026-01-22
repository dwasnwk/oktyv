# Oktyv API Documentation

**Version:** 0.1.0-alpha.1  
**Last Updated:** 2026-01-22

This document describes all MCP tools provided by Oktyv.

---

## Table of Contents

- [linkedin_search_jobs](#linkedin_search_jobs)
- [linkedin_get_job](#linkedin_get_job)
- [linkedin_get_company](#linkedin_get_company)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

---

## linkedin_search_jobs

Search for jobs on LinkedIn with various filters.

### Input Schema

```typescript
{
  keywords?: string;           // Job title, skills, or keywords
  location?: string;           // City, state, or country
  remote?: boolean;            // Filter for remote positions only
  jobType?: JobType[];         // FULL_TIME, PART_TIME, CONTRACT, etc.
  experienceLevel?: ExperienceLevel[];  // ENTRY_LEVEL, MID_LEVEL, etc.
  salaryMin?: number;          // Minimum salary (annual)
  postedWithin?: '24h' | '7d' | '30d';  // Relative time filters
  limit?: number;              // Max results (default: 10, max: 50)
  offset?: number;             // Pagination offset (default: 0)
}
```

### Output Schema

```typescript
{
  success: boolean;
  result?: {
    jobs: Job[];               // Array of job objects
    totalCount?: number;       // Total available (if known)
    hasMore: boolean;          // Whether more results exist
    nextOffset?: number;       // For pagination
    query: JobSearchParams;    // What was searched
    searchedAt: Date;          // When search was performed
    platform: 'LINKEDIN';
  };
  error?: OktyvError;          // If success === false
}
```

### Example Usage

```typescript
// Claude Desktop tool call:
{
  "name": "linkedin_search_jobs",
  "arguments": {
    "keywords": "typescript developer",
    "location": "San Francisco, CA",
    "remote": true,
    "jobType": ["FULL_TIME"],
    "postedWithin": "7d",
    "limit": 20
  }
}
```

### Response Example

```json
{
  "success": true,
  "result": {
    "jobs": [
      {
        "id": "3456789012",
        "title": "Senior TypeScript Developer",
        "company": "TechCorp",
        "companyId": "1234567",
        "location": {
          "city": "San Francisco",
          "state": "CA",
          "country": "United States",
          "locationType": "REMOTE"
        },
        "type": "FULL_TIME",
        "salary": {
          "min": 150000,
          "max": 200000,
          "currency": "USD",
          "period": "YEARLY"
        },
        "description": "We are seeking a senior TypeScript developer...",
        "postedDate": "2026-01-20T00:00:00Z",
        "url": "https://www.linkedin.com/jobs/view/3456789012",
        "source": "LINKEDIN"
      }
    ],
    "totalCount": 847,
    "hasMore": true,
    "nextOffset": 20,
    "searchedAt": "2026-01-22T00:30:00Z"
  }
}
```

### Notes

- **Authentication:** User must be logged into LinkedIn in their browser
- **Rate Limit:** 10 requests per minute
- **Session:** Uses persistent browser session (stays logged in)
- **Pagination:** Use `offset` parameter for subsequent pages

---

## linkedin_get_job

Get detailed information about a specific LinkedIn job posting.

### Input Schema

```typescript
{
  jobId: string;               // LinkedIn job ID (required)
  includeCompany?: boolean;    // Fetch company details too (default: false)
}
```

### Output Schema

```typescript
{
  success: boolean;
  result?: {
    job: Job;                  // Full job object
    company?: Company;         // If includeCompany === true
  };
  error?: OktyvError;
}
```

### Example Usage

```typescript
{
  "name": "linkedin_get_job",
  "arguments": {
    "jobId": "3456789012",
    "includeCompany": true
  }
}
```

### Response Example

```json
{
  "success": true,
  "result": {
    "job": {
      "id": "3456789012",
      "title": "Senior TypeScript Developer",
      "company": "TechCorp",
      "description": "<full HTML description>",
      "skills": ["TypeScript", "React", "Node.js"],
      "requirements": ["5+ years experience", "Bachelor's degree"],
      "url": "https://www.linkedin.com/jobs/view/3456789012",
      ...
    },
    "company": {
      "id": "1234567",
      "name": "TechCorp",
      "description": "Leading technology company...",
      "size": "LARGE",
      "employeeCount": { "min": 500, "max": 1000 },
      "industry": "TECHNOLOGY",
      ...
    }
  }
}
```

### Notes

- **Job ID:** Can be extracted from LinkedIn URLs or search results
- **Company Info:** Optional, adds ~1-2 seconds to request time
- **Rate Limit:** Counts toward same 10/minute limit

---

## linkedin_get_company

Get detailed information about a company on LinkedIn.

### Input Schema

```typescript
{
  companyId: string;           // LinkedIn company ID or vanity name
}
```

### Output Schema

```typescript
{
  success: boolean;
  result?: Company;            // Full company object
  error?: OktyvError;
}
```

### Example Usage

```typescript
{
  "name": "linkedin_get_company",
  "arguments": {
    "companyId": "anthropic-ai"  // Can use vanity name
  }
}
```

### Response Example

```json
{
  "success": true,
  "result": {
    "id": "anthropic-ai",
    "name": "Anthropic",
    "description": "AI safety company...",
    "url": "https://www.anthropic.com",
    "linkedinUrl": "https://www.linkedin.com/company/anthropic-ai",
    "size": "MEDIUM",
    "employeeCount": { "min": 100, "max": 500 },
    "industry": "TECHNOLOGY",
    "specialties": ["AI Safety", "Machine Learning", "Research"],
    "headquarters": {
      "city": "San Francisco",
      "state": "CA",
      "country": "United States"
    },
    "founded": 2021,
    "followerCount": 45000
  }
}
```

---

## Error Handling

All tools return a consistent error structure when `success === false`:

```typescript
{
  success: false,
  error: {
    code: OktyvErrorCode;      // Machine-readable error code
    message: string;            // Human-readable description
    details?: unknown;          // Additional context
    retryable: boolean;         // Whether retry might succeed
    retryAfter?: number;        // Seconds to wait before retry
  }
}
```

### Error Codes

| Code | Description | Retryable | Action |
|------|-------------|-----------|--------|
| `NOT_LOGGED_IN` | User not authenticated | No | Log into LinkedIn in browser |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes | Wait for `retryAfter` seconds |
| `JOB_NOT_FOUND` | Job no longer exists | No | Job was removed/expired |
| `NETWORK_ERROR` | Connection failed | Yes | Check internet connection |
| `PARSE_ERROR` | DOM structure changed | No | Oktyv needs update |
| `BROWSER_CRASHED` | Puppeteer crashed | Yes | Restart browser session |
| `CAPTCHA_REQUIRED` | LinkedIn showing CAPTCHA | No | Solve CAPTCHA manually |
| `TIMEOUT` | Request took too long | Yes | Try again |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "LinkedIn rate limit exceeded. Please wait before retrying.",
    "retryable": true,
    "retryAfter": 60
  }
}
```

---

## Rate Limits

Oktyv enforces rate limits to prevent platform blocking:

| Platform | Limit | Window | Notes |
|----------|-------|--------|-------|
| LinkedIn | 10 requests | 1 minute | All tools combined |
| Indeed | 20 requests | 1 minute | Future |

### Rate Limit Strategy

- **Token Bucket:** Each platform has separate bucket
- **Automatic Backoff:** Exponential backoff on 429 responses
- **Graceful Errors:** Clear error messages with retry timing
- **Shared Across Tools:** All LinkedIn tools share same limit

### Handling Rate Limits

When you receive a rate limit error:

1. **Check `retryAfter`** field for wait time
2. **Wait the specified duration**
3. **Retry the request**

```typescript
// Example retry logic in Career System:
if (!response.success && response.error.code === 'RATE_LIMIT_EXCEEDED') {
  const waitTime = response.error.retryAfter || 60;
  console.log(`Rate limited, waiting ${waitTime} seconds...`);
  await sleep(waitTime * 1000);
  // Retry request
}
```

---

## Session Management

### Browser Sessions

Oktyv maintains persistent browser sessions for each platform:

- **Cookies Preserved:** User stays logged in between requests
- **Session Reuse:** Same browser instance for multiple requests
- **Auto-Cleanup:** Sessions closed on server shutdown
- **User Data Directory:** `./browser-data/` (gitignored)

### First-Time Setup

1. **Start Oktyv server**
2. **Make first request** (will fail with `NOT_LOGGED_IN`)
3. **Server launches browser** (headless mode)
4. **User logs in manually** (one time only)
5. **Future requests** automatically authenticated

### Session Lifespan

- Persists across Oktyv restarts
- Expires when LinkedIn session expires (~30 days)
- Can be cleared by deleting `./browser-data/`

---

## Best Practices

### Efficient Job Searching

1. **Use specific keywords** for better results
2. **Filter by location** when possible
3. **Paginate carefully** to respect rate limits
4. **Cache results** in Career System
5. **Batch requests** when fetching multiple jobs

### Error Handling

1. **Always check `success` field** before using results
2. **Log errors** for debugging
3. **Retry on `retryable` errors** with backoff
4. **Notify user** on `NOT_LOGGED_IN` errors
5. **Monitor rate limits** proactively

### Performance

1. **linkedin_search_jobs:** ~2-3 seconds for 10 results
2. **linkedin_get_job:** ~1-2 seconds per job
3. **linkedin_get_company:** ~1-2 seconds per company
4. **Use `includeCompany: false`** when company data not needed
5. **Batch searches** instead of individual job fetches

---

**Status:** Foundation phase - tools return `NOT_IMPLEMENTED` errors until MVP complete.

**Next:** MVP implementation with LinkedIn connector (ETA: Q1 2026)
