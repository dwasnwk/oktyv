# Getting Started with Oktyv

Welcome to Oktyv, the universal automation layer! This guide will help you get up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **npm** 9 or higher
- **Git** (for cloning the repository)
- **Claude Desktop** (for MCP integration)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/duke-of-beans/oktyv.git
cd oktyv
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run Tests (Optional)

Verify everything is working:

```bash
npm test
```

You should see all 258 tests passing.

## Configuration

### Configure Claude Desktop

To use Oktyv with Claude Desktop, you need to add it to your Claude Desktop configuration.

**Location of config file:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**Add Oktyv to the configuration:**

```json
{
  "mcpServers": {
    "oktyv": {
      "command": "node",
      "args": [
        "C:/absolute/path/to/oktyv/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

**Important:** Replace `C:/absolute/path/to/oktyv` with the actual absolute path to your Oktyv installation.

### Restart Claude Desktop

After updating the configuration, restart Claude Desktop for the changes to take effect.

## Verify Installation

Open Claude Desktop and try a simple command:

```
List all available vaults
```

If Oktyv is configured correctly, Claude will use the `vault_list_vaults` tool and return a list of vaults (which will be empty initially).

## Your First Automation

Let's create a simple automation workflow using multiple Oktyv engines.

### Example 1: Store and Retrieve Credentials

**Step 1: Store a credential**

```
Please store my database password in a vault called "production" with the credential name "db-password" and value "my-secret-password"
```

Claude will use the `vault_set` tool to securely encrypt and store your credential.

**Step 2: Retrieve the credential**

```
Get the database password from the production vault
```

Claude will use the `vault_get` tool to decrypt and return your credential.

**Step 3: List all credentials**

```
Show me all credentials in the production vault
```

### Example 2: Schedule a Daily Task

**Create a daily task:**

```
Create a cron task that runs every day at 2 AM Eastern time, makes an HTTP POST request to https://api.example.com/backup, and retries up to 3 times if it fails. Name it "Daily Backup"
```

Claude will use the `cron_create_task` tool with the appropriate parameters.

**Check task status:**

```
Show me the execution statistics for the Daily Backup task
```

### Example 3: Search for Jobs

**Search LinkedIn:**

```
Search for senior software engineer jobs in San Francisco on LinkedIn, filter for remote positions, and show me the top 10 results
```

Claude will use the `linkedin_search_jobs` tool to search for jobs.

**Get job details:**

```
Get the full details for job ID 12345
```

## Common Use Cases

### 1. Automated Backups

```
Create a cron task that:
- Runs every day at 3 AM UTC
- Calls the backup API at https://api.myapp.com/backup
- Retries 3 times with 10 second delays
- Times out after 5 minutes
- Name it "Daily Database Backup"
```

### 2. Credential Management

```
Store the following credentials in a vault called "staging":
- api-key: abc123xyz
- database-url: postgres://user:pass@localhost:5432/db
- smtp-password: email-password-123
```

### 3. Job Search Automation

```
Search for the following on LinkedIn:
- "senior backend engineer" in Seattle
- Remote positions only
- Posted within the last week
- Show me 20 results
```

## Understanding the Engines

Oktyv consists of 7 specialized engines:

### 1. **Browser Engine** (✅ Fully Integrated)
- LinkedIn, Indeed, Wellfound job search
- Web scraping and automation
- Screenshot and PDF generation

### 2. **Vault Engine** (✅ Fully Integrated)
- Secure credential storage
- OS keychain integration
- AES-256-GCM encryption

### 3. **Cron Engine** (✅ Fully Integrated)
- Task scheduling with cron expressions
- Interval and one-time tasks
- Execution history and statistics

### 4. **API Engine** (🔄 Core Complete)
- REST API integration
- OAuth 2.0 support
- Rate limiting and retry logic

### 5. **Database Engine** (🔄 Core Complete)
- PostgreSQL, MySQL, SQLite, MongoDB
- Connection pooling
- Query execution and transactions

### 6. **Email Engine** (🔄 Core Complete)
- SMTP, IMAP, Gmail OAuth
- Email sending and receiving
- Attachment support

### 7. **File Engine** (🔄 Core Complete)
- File operations (read, write, copy, move, delete)
- Archive support (ZIP, TAR, GZIP)
- S3 integration
- File watching

## Tips and Best Practices

### Security
1. **Never commit vault files** - Add `data/` to `.gitignore`
2. **Use separate vaults** for different environments (production, staging, development)
3. **Rotate credentials regularly** - Delete old credentials after rotation
4. **Use strong encryption** - Oktyv uses AES-256-GCM, but your master password should be strong

### Scheduling
1. **Use cron expressions** for recurring tasks: [Crontab Guru](https://crontab.guru/)
2. **Set appropriate timeouts** - Long-running tasks need longer timeouts
3. **Implement retries** for unreliable operations
4. **Monitor statistics** - Check success rates regularly
5. **Clear old history** - Prune execution logs periodically

### Browser Automation
1. **Respect rate limits** - Don't make too many requests too quickly
2. **Use headless mode** in production for better performance
3. **Close sessions** when done to free up resources
4. **Handle errors gracefully** - Network issues and page changes happen

### General
1. **Start small** - Test with one engine before combining multiple
2. **Check logs** - Oktyv logs all operations for debugging
3. **Read error messages** - Error codes and messages are descriptive
4. **Use natural language** - Claude understands context and intent

## Troubleshooting

### Oktyv Not Found in Claude

**Problem:** Claude doesn't recognize Oktyv tools

**Solutions:**
1. Verify the path in `claude_desktop_config.json` is absolute and correct
2. Ensure you ran `npm run build` successfully
3. Restart Claude Desktop after configuration changes
4. Check Claude Desktop logs for errors

### Tests Failing

**Problem:** `npm test` shows failing tests

**Solutions:**
1. Ensure all dependencies are installed: `npm install`
2. Check Node.js version: `node --version` (should be 18+)
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check for any error messages in the test output

### Build Errors

**Problem:** `npm run build` fails with TypeScript errors

**Solutions:**
1. Ensure TypeScript is installed: `npm install -g typescript`
2. Clear the dist folder: `rm -rf dist`
3. Check `tsconfig.json` for syntax errors
4. Ensure all type definitions are installed

### Vault Encryption Errors

**Problem:** Cannot encrypt/decrypt credentials

**Solutions:**
1. Ensure OS keychain is accessible (macOS Keychain, Windows Credential Manager)
2. Check vault file permissions in `data/` directory
3. Try deleting and recreating the vault
4. Verify the vault name is spelled correctly

### Cron Tasks Not Running

**Problem:** Scheduled tasks don't execute

**Solutions:**
1. Verify the cron expression is valid using [Crontab Guru](https://crontab.guru/)
2. Check that the task is enabled: `cron_get_task`
3. Verify timezone is correct for your location
4. Check execution history for error messages
5. Ensure the server is running continuously

## Next Steps

Now that you have Oktyv running, explore the following:

1. **Read the API Reference** - `docs/API_REFERENCE.md`
2. **Review Engine Design Docs** - `docs/*_ENGINE_DESIGN.md`
3. **Explore Examples** - Try the use cases in this guide
4. **Combine Engines** - Create workflows that use multiple engines together
5. **Monitor Performance** - Check execution statistics and logs

## Getting Help

If you encounter issues:

1. Check the logs in Claude Desktop
2. Review error messages carefully
3. Consult the API Reference documentation
4. Check the CHANGELOG for recent changes
5. Contact the development team

## Resources

- **API Reference:** `docs/API_REFERENCE.md`
- **Changelog:** `CHANGELOG.md`
- **Engine Designs:** `docs/`
- **Tests:** `tests/unit/`
- **Source Code:** `src/`

---

**Version:** 1.0.0-alpha.1  
**Last Updated:** January 25, 2026

Welcome to the future of automation! 🚀
