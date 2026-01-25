# Oktyv API Reference

**Version:** 1.0.0-alpha.1  
**Last Updated:** January 25, 2026

This document provides a comprehensive reference for all MCP tools available in Oktyv across all 7 engines.

---

## Table of Contents

1. [Browser Engine](#browser-engine)
2. [Vault Engine](#vault-engine)
3. [API Engine](#api-engine)
4. [Database Engine](#database-engine)
5. [Email Engine](#email-engine)
6. [File Engine](#file-engine)
7. [Cron Engine](#cron-engine)

---

## Browser Engine

### linkedin_search_jobs

Search for jobs on LinkedIn with advanced filters.

**Parameters:**
```typescript
{
  keywords: string;           // Job title, skills, keywords
  location?: string;          // City, state, or country
  remote?: boolean;           // Filter for remote positions
  jobType?: string;           // 'full-time' | 'part-time' | 'contract' | 'temporary' | 'internship'
  experienceLevel?: string;   // 'internship' | 'entry' | 'associate' | 'mid-senior' | 'director' | 'executive'
  salaryMin?: number;         // Minimum salary
  postedWithin?: string;      // 'day' | 'week' | 'month'
  limit?: number;             // Max results (1-50, default: 10)
}
```

**Returns:**
```typescript
{
  jobs: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    url: string;
    postedDate?: string;
  }>;
  totalResults: number;
}
```

---

### linkedin_get_job

Get detailed information about a specific LinkedIn job.

**Parameters:**
```typescript
{
  jobId: string;  // LinkedIn job ID
}
```

**Returns:**
```typescript
{
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  benefits: string[];
  salary?: string;
  url: string;
}
```

---

## Vault Engine

### vault_set

Store an encrypted credential in a vault.

**Parameters:**
```typescript
{
  vaultName: string;      // Vault name (created if doesn't exist)
  credentialName: string; // Credential identifier
  value: string;          // Secret value to store
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
}
```

**Security:** 
- Uses AES-256-GCM encryption
- Master key stored in OS keychain
- Unique salt per vault

---

### vault_get

Retrieve a credential from a vault.

**Parameters:**
```typescript
{
  vaultName: string;      // Vault name
  credentialName: string; // Credential identifier
}
```

**Returns:**
```typescript
{
  success: true;
  value: string;  // Decrypted credential value
}
```

---

### vault_list

List all credentials in a vault.

**Parameters:**
```typescript
{
  vaultName: string;  // Vault name
}
```

**Returns:**
```typescript
{
  success: true;
  credentials: string[];  // Array of credential names
}
```

---

### vault_delete

Delete a specific credential from a vault.

**Parameters:**
```typescript
{
  vaultName: string;
  credentialName: string;
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
}
```

---

### vault_delete_vault

Delete an entire vault including all credentials and master key.

**Parameters:**
```typescript
{
  vaultName: string;
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
}
```

**Warning:** This operation is permanent and cannot be undone.

---

### vault_list_vaults

List all available vaults.

**Parameters:** None

**Returns:**
```typescript
{
  success: true;
  vaults: string[];  // Array of vault names
}
```

---

## Cron Engine

### cron_create_task

Create a scheduled task with cron expression, interval, or one-time execution.

**Parameters:**
```typescript
{
  name: string;                    // Task name
  description?: string;            // Task description
  scheduleType: 'cron' | 'interval' | 'once';
  cronExpression?: string;         // Cron expression (for cron type)
  interval?: number;               // Milliseconds (for interval type)
  executeAt?: string;              // ISO timestamp (for once type)
  actionType: 'http' | 'webhook' | 'file' | 'database' | 'email';
  actionConfig: object;            // Action-specific configuration
  timezone?: string;               // Timezone (default: UTC)
  retryCount?: number;             // Retries on failure (default: 0)
  retryDelay?: number;             // Delay between retries ms (default: 5000)
  timeout?: number;                // Execution timeout ms (default: 30000)
  enabled?: boolean;               // Enable immediately (default: true)
}
```

**Action Configs:**

**HTTP/Webhook:**
```typescript
{
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: object;
  body?: any;
}
```

**Returns:**
```typescript
{
  success: true;
  task: {
    id: string;
    name: string;
    schedule: object;
    action: object;
    options: object;
    metadata: {
      createdAt: Date;
      updatedAt: Date;
    };
  };
}
```

---

### cron_update_task

Update an existing scheduled task.

**Parameters:**
```typescript
{
  taskId: string;           // Task ID
  name?: string;
  description?: string;
  cronExpression?: string;
  interval?: number;
  executeAt?: string;
  actionConfig?: object;
  timezone?: string;
  retryCount?: number;
  timeout?: number;
}
```

**Returns:**
```typescript
{
  success: true;
  task: object;  // Updated task object
}
```

---

### cron_delete_task

Delete a scheduled task.

**Parameters:**
```typescript
{
  taskId: string;  // Task ID
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
}
```

---

### cron_list_tasks

List all scheduled tasks with optional filters.

**Parameters:**
```typescript
{
  enabled?: boolean;              // Filter by enabled status
  scheduleType?: 'cron' | 'interval' | 'once';
  actionType?: 'http' | 'webhook' | 'file' | 'database' | 'email';
  limit?: number;                 // Max results (default: 50)
}
```

**Returns:**
```typescript
{
  success: true;
  tasks: Array<object>;  // Array of task objects
  count: number;         // Number of tasks returned
}
```

---

### cron_get_task

Get detailed information about a specific task.

**Parameters:**
```typescript
{
  taskId: string;  // Task ID
}
```

**Returns:**
```typescript
{
  success: true;
  task: object;     // Complete task object
  nextRun: Date;    // Next scheduled run (if applicable)
}
```

---

### cron_enable_task

Enable a disabled task.

**Parameters:**
```typescript
{
  taskId: string;  // Task ID
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
}
```

---

### cron_disable_task

Disable an enabled task.

**Parameters:**
```typescript
{
  taskId: string;  // Task ID
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
}
```

---

### cron_execute_now

Execute a task immediately, ignoring its schedule.

**Parameters:**
```typescript
{
  taskId: string;  // Task ID
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
}
```

---

### cron_get_history

Get execution history for a task.

**Parameters:**
```typescript
{
  taskId: string;   // Task ID
  limit?: number;   // Max results (default: 50)
}
```

**Returns:**
```typescript
{
  success: true;
  history: Array<{
    id: string;
    taskId: string;
    startedAt: Date;
    completedAt?: Date;
    duration?: number;     // Milliseconds
    status: 'running' | 'success' | 'failed' | 'timeout';
    result?: any;
    error?: string;
    retryCount: number;
  }>;
  count: number;
}
```

---

### cron_get_statistics

Get execution statistics for a task.

**Parameters:**
```typescript
{
  taskId: string;  // Task ID
}
```

**Returns:**
```typescript
{
  success: true;
  statistics: {
    totalRuns: number;
    successCount: number;
    failureCount: number;
    timeoutCount: number;
    avgDuration: number;    // Milliseconds
    lastRun?: Date;
    lastSuccess?: Date;
    lastFailure?: Date;
  };
}
```

---

### cron_clear_history

Clear execution history for a task.

**Parameters:**
```typescript
{
  taskId: string;  // Task ID
}
```

**Returns:**
```typescript
{
  success: true;
  message: string;
  deletedCount: number;
}
```

---

### cron_validate_expression

Validate a cron expression and get next run time.

**Parameters:**
```typescript
{
  expression: string;   // Cron expression
  timezone?: string;    // Timezone (optional)
}
```

**Returns:**
```typescript
{
  success: true;
  valid: boolean;
  nextRun?: Date;       // Next execution time (if valid)
  expression: string;
}
```

---

## Common Patterns

### Error Handling

All tools return a consistent error format:

```typescript
{
  success: false;
  error: {
    code: string;      // Error code (e.g., 'VAULT_NOT_FOUND')
    message: string;   // Human-readable error message
  };
}
```

### Common Error Codes

**Vault Engine:**
- `VAULT_NOT_FOUND` - Vault doesn't exist
- `CREDENTIAL_NOT_FOUND` - Credential doesn't exist
- `ENCRYPTION_ERROR` - Encryption/decryption failed
- `KEYCHAIN_ERROR` - OS keychain access failed

**Cron Engine:**
- `TASK_NOT_FOUND` - Task doesn't exist
- `INVALID_CRON_EXPRESSION` - Invalid cron syntax
- `EXECUTION_TIMEOUT` - Task exceeded timeout
- `EXECUTION_FAILED` - Task execution failed
- `CRON_ERROR` - General cron engine error

**Browser Engine:**
- `SESSION_ERROR` - Browser session error
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `NAVIGATION_ERROR` - Page navigation failed
- `SELECTOR_NOT_FOUND` - Element not found

---

## Rate Limiting

### Browser Engine
- Default: 10 requests per minute per connector
- Configurable per session

### API Engine
- Default: 60 requests per minute per endpoint
- Configurable per API configuration

---

## Best Practices

### Vault Engine
1. Use descriptive vault names (e.g., `production`, `staging`, `development`)
2. Use consistent credential naming (e.g., `database-password`, `api-key`)
3. Never commit vault files to version control
4. Regularly rotate credentials
5. Use separate vaults for different environments

### Cron Engine
1. Set appropriate timeouts for long-running tasks
2. Use retry logic for unreliable operations
3. Monitor execution statistics regularly
4. Clear old execution history periodically
5. Use timezone-aware scheduling for global operations
6. Test cron expressions before creating tasks

### Browser Engine
1. Implement exponential backoff for retries
2. Use headless mode in production
3. Close sessions when done
4. Handle rate limiting gracefully
5. Cache results when appropriate

---

## Examples

### Complete Workflow: Automated Daily Reports

```typescript
// 1. Store email credentials
await vault_set({
  vaultName: 'production',
  credentialName: 'smtp-password',
  value: 'secret-password'
});

// 2. Schedule daily report generation
await cron_create_task({
  name: 'Daily Sales Report',
  scheduleType: 'cron',
  cronExpression: '0 9 * * *',  // 9 AM daily
  actionType: 'http',
  actionConfig: {
    url: 'https://api.example.com/reports/generate',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${API_TOKEN}'
    }
  },
  timezone: 'America/New_York',
  retryCount: 3,
  timeout: 300000  // 5 minutes
});

// 3. Monitor task statistics
await cron_get_statistics({
  taskId: 'report-task-id'
});
```

---

**Version:** 1.0.0-alpha.1  
**Last Updated:** January 25, 2026
