# Oktyv

**Browser automation MCP server for career platform integration**

Oktyv connects your Career System to external job platforms through browser automation, enabling seamless data extraction from LinkedIn, Indeed, Wellfound, and other career sites.

## What is Oktyv?

Oktyv is an MCP (Model Context Protocol) server that gives Claude the ability to control a web browser via Puppeteer/Playwright. This allows Claude to:

- Search for jobs on LinkedIn with complex filters
- Extract detailed job descriptions, company information, and application links
- Navigate authenticated sessions (you stay logged in)
- Handle dynamic content (infinite scroll, modals, dropdowns)
- Return clean, structured JSON data

## Why "Oktyv"?

The name combines "oct" (eight, suggesting completeness and thoroughness) with a modern tech aesthetic. It represents the eight-fold path of job searching: discover, filter, extract, analyze, apply, track, follow-up, succeed.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Claude Desktop                      │
│                                                  │
│  Career System protocols + Claude AI            │
└────────────┬────────────────────────────────────┘
             │ MCP Protocol
             ↓
┌─────────────────────────────────────────────────┐
│          Oktyv MCP Server                        │
│                                                  │
│  • linkedin_search_jobs()                        │
│  • linkedin_get_job()                            │
│  • linkedin_get_company()                        │
│  • indeed_search_jobs()                          │
│  • [future: wellfound, vangst, etc.]            │
└────────────┬────────────────────────────────────┘
             │ Puppeteer/Playwright
             ↓
┌─────────────────────────────────────────────────┐
│            Chrome Browser                        │
│                                                  │
│  Logged-in sessions • Full DOM access            │
│  Handles JS rendering • Rate limiting            │
└─────────────────────────────────────────────────┘
```

## Project Status

**Phase:** Foundation (v0.1.0-alpha)  
**Created:** 2026-01-22  
**Philosophy:** Option B perfection - do it right first time

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Run locally
npm start
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
