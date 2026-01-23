# Changelog

All notable changes to Oktyv will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] - 2025-01-23

### 🎉 Initial Alpha Release

First functional release of Oktyv - a production-grade browser automation MCP server for intelligent web interaction.

### Added

#### Browser Infrastructure
- **BrowserSessionManager**: Puppeteer session management with persistent cookie-based authentication
- **RateLimiter**: Token bucket algorithm with configurable per-platform rate limits
  - LinkedIn: 10 requests/minute
  - Indeed: 20 requests/minute
  - Wellfound: 15 requests/minute
- **Platform Support**: LINKEDIN | INDEED | WELLFOUND | GENERIC
- **Login Detection**: Platform-specific cookie detection (li_at for LinkedIn, CTK for Indeed)
- **Session Lifecycle**: Automatic navigation, graceful cleanup, error handling

#### LinkedIn Connector (Complete)
Three fully implemented MCP tools with DOM extraction:

**linkedin_search_jobs**
- Search with filters: keywords, location, remote/hybrid, job type, experience level, salary, posted date
- DOM parsing of search result cards
- Extracts: job ID, title, company, location (city/state/country), remote/hybrid detection, salary ranges
- Pagination support via scroll-to-load-more
- Returns structured Job[] array

**linkedin_get_job**
- Full job detail extraction from posting pages
- Extracts: title, company, location, full HTML description, job type, experience level
- Parses: applicant count, posted date (relative to absolute conversion), salary ranges with period detection
- Pattern-based extraction: skills (max 20), requirements (max 10)
- Optional company fetch via includeCompany parameter
- Returns { job: Job; company?: Company }

**linkedin_get_company**
- Complete company profile extraction
- Extracts: name, tagline, description, website, industry classification
- Company metrics: size categories, employee count ranges, founded year
- Location: headquarters parsing (city/state/country)
- Social: follower count (K/M/B multiplier support), specialties array
- Industry mapping: 11 categories (TECHNOLOGY, FINANCE, HEALTHCARE, CANNABIS, etc.)
- Returns complete Company object

#### Type System
- **Canonical Schemas**: Platform-agnostic Job and Company interfaces
- **Enums**: JobType, JobLocation, ExperienceLevel, Platform, CompanySize, Industry
- **Error Codes**: OktyvErrorCode with 20+ specific error types (authentication, rate limiting, parsing, network, etc.)
- **MCP Integration**: Proper request/response schemas for all tools

#### Developer Experience
- TypeScript strict mode with 0 errors
- Winston-based logging (console + file output)
- Comprehensive error handling with retryable flags
- Clean architecture: browser / connectors / tools / types / utils separation

### Architecture

```
oktyv/
├── src/
│   ├── browser/          # Session management, rate limiting (666 LOC)
│   ├── connectors/       # Platform integrations (280 LOC)
│   ├── tools/            # DOM extraction (1,010 LOC)
│   ├── types/            # TypeScript schemas (400 LOC)
│   ├── utils/            # Shared utilities (60 LOC)
│   └── server.ts         # MCP server (220 LOC)
├── docs/                 # Architecture, API documentation
└── tests/                # Unit/integration tests (planned)
```

### Technical Details

**Dependencies:**
- @modelcontextprotocol/sdk: ^1.0.4
- puppeteer: ^23.10.4
- winston: ^3.17.0
- zod: ^3.24.1
- TypeScript: 5.7.2

**Metrics:**
- Total LOC: ~9,500
- Source code: ~2,600
- Documentation: ~1,000
- Build status: Passing ✅

### Known Limitations

- **Testing**: No unit or integration tests yet (planned for v0.1.0 stable)
- **Platform Coverage**: Only LinkedIn implemented (Indeed, Wellfound planned)
- **DOM Stability**: LinkedIn selectors may change and require updates
- **Real-World Validation**: Needs testing with actual LinkedIn accounts

### Design Principles

- **Foundation Out**: Backend infrastructure before UI/surface features
- **Option B Perfection**: 10x improvements, not incremental 10%
- **Zero Technical Debt**: No mocks, stubs, or placeholders in production code
- **Cognitive Monopoly**: Contextual intelligence as competitive advantage
- **Lean Infrastructure**: Leverage proven tools (Puppeteer, Winston, MCP SDK)

### Development

**Git Commits:** 8 commits, all passing TypeScript builds  
**Repository:** https://github.com/duke-of-beans/oktyv  
**Status:** Ready for alpha testing and feedback

---

## [Unreleased]

### Planned for v0.1.0 (Stable)
- Comprehensive test suite (unit + integration)
- Real-world LinkedIn validation
- Usage documentation and examples
- Installation guide
- Troubleshooting documentation

### Planned for v0.2.0
- Indeed connector implementation
- Wellfound connector implementation
- CLI tool for standalone usage
- Enhanced error messages

### Planned for v0.3.0+
- Caching layer for rate limit optimization
- Job application automation
- Resume parsing and matching
- Advanced filtering and search capabilities

---

[0.1.0-alpha.1]: https://github.com/duke-of-beans/oktyv/releases/tag/v0.1.0-alpha.1
