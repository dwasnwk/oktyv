# Oktyv

**Complete, production-grade authoritative agent browser automation system**

Oktyv is an MCP server that provides autonomous browser automation for intelligent web interaction and complex web tasks. Built on Option B Perfection principles - this is the complete product, not an MVP.

## What is Oktyv?

Oktyv is an MCP (Model Context Protocol) server that gives Claude authoritative control over web browsers via Puppeteer. This enables Claude to autonomously:

- Navigate complex web applications with intelligent decision-making
- Extract structured data from dynamic content (infinite scroll, modals, SPAs)
- Manage authenticated sessions across platforms (persistent login state)
- Execute multi-step workflows with error recovery
- Handle rate limiting and anti-bot measures gracefully
- Return clean, structured JSON from any web source

The first complete implementation is LinkedIn integration, demonstrating the full capabilities of the system for job search, company research, and professional networking automation.

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
