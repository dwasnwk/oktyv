# Oktyv Architecture

**Version:** 0.1.0  
**Last Updated:** 2026-01-22  
**Status:** Foundation Phase

## Design Philosophy

Oktyv follows David Kirsch's operational philosophy:

- **Option B Perfection**: 10x improvement, not 10%
- **Foundation Out**: Build backend infrastructure before surface features  
- **Zero Technical Debt**: No temporary solutions, mocks, or stubs
- **Cognitive Monopoly**: Contextual intelligence is the competitive advantage

## System Architecture

### High-Level Components

```
┌──────────────────────────────────────────────────────────┐
│                    MCP Client Layer                       │
│                   (Claude Desktop)                        │
└────────────────────────┬─────────────────────────────────┘
                         │ JSON-RPC 2.0 (stdio)
                         ↓
┌──────────────────────────────────────────────────────────┐
│                  Oktyv MCP Server                         │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Tool Registry & Dispatcher              │   │
│  │   - linkedin_search_jobs                         │   │
│  │   - linkedin_get_job                             │   │
│  │   - linkedin_get_company                         │   │
│  │   - indeed_search_jobs (future)                  │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                         │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │         Browser Session Manager                   │   │
│  │   - Session persistence                           │   │
│  │   - Cookie management                             │   │
│  │   - Rate limiting                                 │   │
│  │   - Error recovery                                │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                         │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │           Platform Connectors                     │   │
│  │                                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │   LinkedIn   │  │    Indeed    │             │   │
│  │  │  Connector   │  │  Connector   │  [Future]   │   │
│  │  └──────────────┘  └──────────────┘             │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │                                         │
└─────────────────┼─────────────────────────────────────────┘
                  │ Puppeteer/Playwright API
                  ↓
┌──────────────────────────────────────────────────────────┐
│               Chrome Browser Instance                     │
│                                                           │
│  - Headless mode (configurable)                          │
│  - Persistent user data (stays logged in)                │
│  - Full JavaScript rendering                             │
│  - Network interception                                  │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Tool Invocation** (Claude → Oktyv)
   - Claude calls MCP tool with parameters
   - Tool dispatcher routes to appropriate connector
   - Connector validates parameters

2. **Browser Automation** (Oktyv → Browser)
   - Session manager retrieves/creates browser session
   - Connector executes navigation sequence
   - DOM extraction with error handling
   - Rate limiting enforced

3. **Data Extraction** (Browser → Oktyv)
   - Parse rendered HTML/DOM
   - Extract structured data
   - Validate against schema
   - Transform to canonical format

4. **Response** (Oktyv → Claude)
   - Return JSON with metadata
   - Include error context if failed
   - Provide actionable links

## Technology Stack

### Core Dependencies

- **Runtime**: Node.js 18+ (LTS)
- **Language**: TypeScript 5.x (strict mode)
- **MCP SDK**: `@modelcontextprotocol/sdk` ^1.0.0
- **Browser Automation**: Puppeteer ^23.0.0
- **Testing**: Vitest ^2.0.0
- **Logging**: Winston ^3.11.0

### Development Tools

- **Package Manager**: npm (for simplicity)
- **Linting**: ESLint + TypeScript-ESLint
- **Formatting**: Prettier
- **Type Checking**: tsc --noEmit
- **Build**: tsc (no bundler needed for MCP server)

## Module Structure

```
oktyv/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── server.ts                # MCP server class
│   ├── types/                   # TypeScript interfaces
│   │   ├── mcp.ts              # MCP-specific types
│   │   ├── job.ts              # Job data schemas
│   │   └── company.ts          # Company data schemas
│   ├── browser/
│   │   ├── session.ts          # Browser session manager
│   │   ├── cookies.ts          # Cookie persistence
│   │   └── rate-limiter.ts     # Request rate control
│   ├── connectors/
│   │   ├── base.ts             # Abstract connector class
│   │   ├── linkedin.ts         # LinkedIn implementation
│   │   └── indeed.ts           # Indeed implementation (future)
│   ├── tools/
│   │   ├── registry.ts         # Tool registration system
│   │   ├── linkedin-search.ts  # linkedin_search_jobs tool
│   │   ├── linkedin-job.ts     # linkedin_get_job tool
│   │   └── linkedin-company.ts # linkedin_get_company tool
│   └── utils/
│       ├── logger.ts           # Winston configuration
│       ├── errors.ts           # Custom error classes
│       └── validators.ts       # Schema validation
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── fixtures/               # Test data
├── docs/                       # Documentation
└── scripts/                    # Build/deploy scripts
```

## Key Design Decisions

### 1. Standalone MCP Server (Not KERNL Plugin)

**Decision**: Build as independent MCP server  
**Rationale**: 
- Single responsibility (browser automation only)
- Easier to test in isolation
- Puppeteer dependencies are large (~300MB)
- Can be used by projects beyond Career System
- Simpler deployment and versioning

**Future**: If browser automation becomes core to 3+ David projects, consider KERNL integration

### 2. Puppeteer Over Playwright

**Decision**: Start with Puppeteer  
**Rationale**:
- Simpler API for MCP server use case
- Smaller footprint
- Better Node.js integration
- Sufficient for LinkedIn/Indeed
- Can migrate to Playwright if multi-browser needed

### 3. Session Persistence Strategy

**Decision**: Cookie-based persistence with user data directory  
**Rationale**:
- User stays logged in across invocations
- No credential management needed
- Mirrors real browser behavior
- Respects platform security

**Implementation**:
```typescript
const browser = await puppeteer.launch({
  headless: true,
  userDataDir: './browser-data',
  args: ['--no-sandbox']
});
```

### 4. Rate Limiting Approach

**Decision**: Token bucket per domain  
**Rationale**:
- Prevent platform blocking
- Fair resource allocation
- Configurable per connector
- Respects Terms of Service

**Parameters**:
- LinkedIn: 10 requests/minute
- Indeed: 20 requests/minute
- Exponential backoff on 429

### 5. Error Handling Philosophy

**Decision**: Fail fast with detailed context  
**Rationale**:
- No silent failures
- Claude can make informed decisions
- User can troubleshoot
- Aligns with "Zero Technical Debt"

**Error Categories**:
1. **Authentication**: User not logged in
2. **Rate Limit**: Too many requests
3. **Not Found**: Job/company doesn't exist  
4. **Network**: Connection failures
5. **Parse**: DOM structure changed

### 6. Data Schema Design

**Decision**: Platform-agnostic canonical format  
**Rationale**:
- Career System doesn't depend on LinkedIn specifics
- Easy to add new platforms
- Consistent Claude experience
- Future-proof

**Example**:
```typescript
interface Job {
  id: string;              // Platform-specific ID
  title: string;
  company: string;
  location: string;
  type: JobType;           // FULL_TIME | PART_TIME | CONTRACT
  salary?: SalaryRange;
  description: string;
  postedDate: Date;
  url: string;
  source: Platform;        // LINKEDIN | INDEED | WELLFOUND
  raw?: unknown;           // Original platform data
}
```

## Security Considerations

### Cookie/Session Security
- User data directory permissions: 0700
- No credential storage in code
- Session cleanup on server shutdown

### Network Security
- All connections via HTTPS
- Certificate validation enabled
- No proxy by default (configurable)

### Data Privacy
- No telemetry by default
- Minimal logging (configurable verbosity)
- No data sent to external services

## Performance Targets

- **Tool Invocation Latency**: <500ms (excluding browser render)
- **LinkedIn Search**: <3 seconds for 10 results
- **Job Detail Fetch**: <2 seconds per job
- **Memory Usage**: <500MB per browser instance
- **Concurrent Sessions**: Support 1-3 browsers (Career System use case)

## Future Considerations

### Phase 2: Additional Platforms
- Wellfound (AngelList Talent)
- Vangst (cannabis industry)
- Dice (tech jobs)
- Remote.co

### Phase 3: Advanced Features
- Application submission automation
- Resume tailoring integration
- Interview scheduling detection
- Application status tracking

### Phase 4: Scale Optimizations
- Browser pool management
- Redis-based session sharing
- Distributed rate limiting
- Horizontal scaling support

---

**Architecture Review Date**: Every major version  
**Next Review**: v0.2.0 (after LinkedIn connector completion)
