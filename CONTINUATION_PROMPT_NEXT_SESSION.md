# Next Session Continuation Prompt

**Context:** Foundation phase 75% complete, npm install in progress

## Where We Left Off

Foundation setup is nearly complete. The project structure, type definitions, MCP server skeleton, and all documentation are in place. npm install is running to download dependencies (Puppeteer ~300MB).

## Current State

```yaml
phase: "Foundation"
progress: 75%
status: "npm install in progress"

completed:
  - Git repository initialized
  - KERNL project registration
  - Complete directory structure
  - Type definitions (Job, Company, MCP)
  - MCP server skeleton (3 tool stubs)
  - Winston logger configuration
  - All foundational docs (README, ARCHITECTURE, DNA, STATUS, CHANGELOG, LICENSE)

in_progress:
  - npm install (Puppeteer download)

pending:
  - Verify TypeScript build
  - Initial git commit
  - GitHub push
```

## Immediate Next Actions

1. **Check npm install status:**
   ```bash
   cd D:\Dev\oktyv
   npm install  # If not complete, wait for it
   ```

2. **Verify TypeScript build (MANDATORY):**
   ```bash
   cd D:\Dev\oktyv
   npx tsc --noEmit
   ```
   Must be **0 errors** before proceeding.

3. **Initial git commit:**
   ```bash
   cd D:\Dev\oktyv
   git add -A
   git commit -m "feat(foundation): initial project setup

   - Complete directory structure
   - Type definitions for Job, Company, MCP schemas
   - MCP server skeleton with 3 tool stubs
   - Winston logger configuration
   - Comprehensive documentation (README, ARCHITECTURE, DNA, STATUS)
   - TypeScript strict mode, ESLint, Vitest configured
   
   Foundation: 0 LOC implemented, all infrastructure ready"
   git push origin main
   ```

4. **Update CURRENT_STATUS.md:**
   - Mark foundation complete
   - Update metrics (LOC counts)
   - Set next sprint: "MVP LinkedIn Connector"

## Next Sprint: MVP LinkedIn Connector

After foundation is complete, the next major milestone is implementing the LinkedIn connector with basic job search functionality.

### Priority Order:
1. **Browser Session Manager** (`src/browser/session.ts`)
   - Puppeteer initialization
   - Session persistence with cookies
   - Login detection

2. **Rate Limiter** (`src/browser/rate-limiter.ts`)
   - Token bucket implementation
   - Per-platform configuration
   - LinkedIn: 10 requests/minute

3. **LinkedIn Connector Base** (`src/connectors/linkedin.ts`)
   - Navigate to LinkedIn
   - Wait for login
   - Handle network errors

4. **linkedin_search_jobs Tool** (`src/tools/linkedin-search.ts`)
   - Search form automation
   - Result extraction
   - Pagination support

5. **Unit Tests** (`tests/unit/`)
   - Type validation tests
   - Rate limiter tests
   - Session manager tests

6. **Integration Tests** (`tests/integration/`)
   - LinkedIn search flow
   - Error handling
   - Rate limiting behavior

### Key Constraints:
- TDD required (tests first)
- No mocks in production code
- TypeScript must always pass (0 errors)
- Aggressive checkpointing (every 2-3 tool calls)
- Four-pillar docs always synced

### Expected Deliverables:
- Working `linkedin_search_jobs` tool
- ~500-800 LOC (src + tests)
- 80%+ test coverage
- Comprehensive integration test
- Updated documentation

## Context for Claude

You are continuing work on Oktyv, a browser automation MCP server for career platform integration. This is a standalone MCP server (not a KERNL plugin) that uses Puppeteer to extract job data from LinkedIn, Indeed, and other platforms.

**Philosophy:** Option B perfection, foundation out, zero technical debt, lean infrastructure.

**Current Phase:** Foundation → MVP LinkedIn Connector

**Key Technical Decisions:**
- Standalone MCP server for single responsibility
- Puppeteer for browser automation
- Cookie-based session persistence
- Platform-agnostic canonical schemas
- TypeScript strict mode
- Vitest for testing

**Important Files:**
- `PROJECT_DNA.yaml` - Project identity and decisions
- `CURRENT_STATUS.md` - Tactical state
- `docs/ARCHITECTURE.md` - System design
- `src/types/` - Canonical data schemas

**Tools Available:**
- KERNL: Session management, file operations, semantic search
- Desktop Commander: Git, npm, system commands
- SHIM: Code quality analysis (when implemented code exists)

## Bootstrap Command

```typescript
// Session start:
KERNL:get_session_context({ project: "oktyv", mode: "auto" })

// Load workspace docs:
KERNL:pm_batch_read({
  project: "oktyv",
  paths: [
    "PROJECT_DNA.yaml",
    "CURRENT_STATUS.md",
    "CONTINUATION_PROMPT_NEXT_SESSION.md"
  ]
})

// Verify build before coding:
Desktop Commander:start_process({
  command: "cd D:\\Dev\\oktyv; npx tsc --noEmit",
  timeout_ms: 30000
})
```

---

**Last Updated:** 2026-01-22 00:35 UTC  
**Next Session Goal:** Complete foundation, begin LinkedIn connector
