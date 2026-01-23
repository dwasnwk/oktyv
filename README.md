# Oktyv

![Version](https://img.shields.io/badge/version-0.1.0--alpha.1-blue)
![Status](https://img.shields.io/badge/status-alpha-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Complete, production-grade authoritative agent browser automation system**

Oktyv is an MCP server that provides autonomous browser automation for intelligent web interaction and complex web tasks. Built on Option B Perfection principles - this is the complete product, not an MVP.

## ⚠️ Alpha Status

**Current Version:** v0.1.0-alpha.1  
**LinkedIn Connector:** ✅ Complete (3/3 tools working)  
**Testing:** ⚠️ Pending real-world validation  
**Production Ready:** ❌ Not yet - use for testing only

The LinkedIn connector is feature-complete with job search, job details, and company extraction. However, it needs real-world testing before production use.

## What is Oktyv?

Oktyv is an MCP (Model Context Protocol) server that gives Claude authoritative control over web browsers via Puppeteer. This enables Claude to autonomously:

- Navigate complex web applications with intelligent decision-making
- Extract structured data from dynamic content (infinite scroll, modals, SPAs)
- Manage authenticated sessions across platforms (persistent login state)
- Execute multi-step workflows with error recovery
- Handle rate limiting and anti-bot measures gracefully
- Return clean, structured JSON from any web source

The first complete implementation is LinkedIn integration, demonstrating the full capabilities of the system for job search, company research, and professional networking automation.

## ✨ Implemented Features

### LinkedIn Connector (Complete)
- **linkedin_search_jobs** - Search for jobs with filters (keywords, location, remote, type, experience, salary, date)
- **linkedin_get_job** - Get complete job details including description, skills, requirements, applicant count
- **linkedin_get_company** - Get company profiles with metrics, industry, size, headquarters, founded date

### Browser Infrastructure
- **Session Management** - Persistent cookie-based authentication (stay logged in)
- **Rate Limiting** - Token bucket algorithm (10 req/min for LinkedIn)
- **Login Detection** - Platform-specific cookie validation
- **Error Handling** - Comprehensive error codes with retry logic

### Type System
- **Canonical Schemas** - Platform-agnostic Job and Company interfaces
- **20+ Error Codes** - Authentication, rate limiting, parsing, network errors
- **Structured Data** - Clean JSON output from all tools

## Why "Oktyv"?

The name combines "oct" (eight, suggesting completeness and thoroughness) with a modern tech aesthetic. It represents the eight-fold path of job searching: discover, filter, extract, analyze, apply, track, follow-up, succeed.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Claude Desktop                      │
│                                                  │
│  Any MCP client + Claude AI                     │
└────────────┬────────────────────────────────────┘
             │ MCP Protocol
             ↓
┌─────────────────────────────────────────────────┐
│          Oktyv MCP Server                        │
│                                                  │
│  Platform Connectors:                            │
│  • LinkedIn (search, jobs, companies)            │
│  • Indeed (planned)                              │
│  • Wellfound (planned)                           │
│  • Generic Web (extensible framework)            │
└────────────┬────────────────────────────────────┘
             │ Puppeteer
             ↓
┌─────────────────────────────────────────────────┐
│            Chrome Browser                        │
│                                                  │
│  Persistent sessions • Full DOM access           │
│  JS rendering • Intelligent rate limiting        │
└─────────────────────────────────────────────────┘
```

## Project Status

**Version:** v0.1.0-alpha.1  
**Created:** 2025-01-22  
**Status:** LinkedIn connector complete, ready for alpha testing  
**Philosophy:** Option B perfection - do it right first time

### Completed
- ✅ Browser session management with persistent auth
- ✅ Rate limiting (token bucket algorithm)
- ✅ LinkedIn job search with filters
- ✅ LinkedIn job detail extraction
- ✅ LinkedIn company profile extraction
- ✅ TypeScript strict mode (0 errors)
- ✅ Comprehensive error handling

### In Progress
- ⚠️ Real-world testing and validation
- ⚠️ Unit and integration test suite
- ⚠️ Usage documentation

### Planned
- 📋 Indeed connector (v0.2.0)
- 📋 Wellfound connector (v0.2.0)
- 📋 Job application automation (v0.3.0)
- 📋 Resume parsing and matching (v0.3.0)

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Chrome/Chromium (installed by Puppeteer)

### Installation

```bash
# Clone repository
git clone https://github.com/duke-of-beans/oktyv.git
cd oktyv

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Configuration (MCP)

Add to your MCP settings file:

```json
{
  "mcpServers": {
    "oktyv": {
      "command": "node",
      "args": ["/path/to/oktyv/dist/index.js"],
      "disabled": false
    }
  }
}
```

### First Use

1. **Start Claude Desktop** with Oktyv configured
2. **Try a search**: "Search LinkedIn for Senior Software Engineer jobs in San Francisco"
3. **Get job details**: "Get details for LinkedIn job ID 3847362891"
4. **Research a company**: "Get company information for Anthropic on LinkedIn"

The first time you use a tool, a browser window will open asking you to log into LinkedIn. After logging in once, your session persists via cookies.

## Usage Examples

### Job Search
```typescript
// Search for remote engineering jobs
linkedin_search_jobs({
  keywords: "Senior Software Engineer",
  location: "San Francisco, CA",
  remote: true,
  experienceLevel: ["MID_LEVEL", "SENIOR_LEVEL"],
  limit: 20
})
```

### Get Job Details
```typescript
// Get full job posting with company info
linkedin_get_job({
  jobId: "3847362891",
  includeCompany: true  // Also fetch company profile
})
```

### Company Research
```typescript
// Research a company
linkedin_get_company({
  companyId: "anthropic"  // LinkedIn company ID or vanity name
})
```

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Technical design and decisions
- [API.md](./docs/API.md) - MCP tool specifications
- [CONTRIBUTING.md](./docs/CONTRIBUTING.md) - Development guidelines
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## Core Principles

1. **Foundation Out** - Backend infrastructure before surface features
2. **Zero Technical Debt** - No mocks, stubs, or temporary solutions
3. **Cognitive Monopoly** - Context and intelligence as competitive advantage
4. **Lean Infrastructure** - Use existing tools, build only what's unique

## License

MIT License - See [LICENSE](./LICENSE)

## Author

David Kirsch  
[@oktyv](https://github.com/oktyv)

---

*"Do it right first time. Climb mountains. Fight Goliaths. Option B perfection."*
