# Database Engine Design Document

**Engine**: 3 of 7  
**Status**: 🔄 IN PROGRESS  
**Version**: 0.5.0-alpha.1 (target)  
**Dependencies**: Vault Engine (for credentials)

## Overview

The Database Engine provides comprehensive database access with support for SQL (PostgreSQL, MySQL, SQLite) and NoSQL (MongoDB) databases. Built on Prisma ORM for SQL databases and native MongoDB driver for NoSQL.

## Core Capabilities

### 1. SQL Databases (via Prisma)
- PostgreSQL (production-grade)
- MySQL/MariaDB (popular open-source)
- SQLite (embedded, testing)
- Connection pooling
- Transaction support (ACID)
- Schema migrations
- Type-safe queries

### 2. NoSQL Databases
- MongoDB (document store)
- Collections and documents
- Aggregation pipelines
- Indexing strategies
- Replica set support

### 3. Query Builder
- Type-safe query building
- Raw SQL support (when needed)
- Query optimization
- Parameter binding (SQL injection prevention)
- Result mapping

### 4. Transaction Management
- ACID transactions (SQL)
- Multi-document transactions (MongoDB 4.0+)
- Savepoints and rollback
- Automatic retry on deadlock
- Isolation levels

### 5. Schema Management
- Migration generation
- Migration execution
- Schema introspection
- Seed data management
- Version control for schemas

### 6. Connection Management
- Connection pooling (configurable pool size)
- Connection health checks
- Automatic reconnection
- Credential storage in Vault Engine
- Multiple database connections

## Architecture

```
┌─────────────┐
│   Claude    │
│   (User)    │
└──────┬──────┘
       │ MCP Tools
       ▼
┌────────────────────────────────────┐
│       Database Engine              │
│      (DatabaseEngine.ts)           │
├────────────────────────────────────┤
│ ┌──────────────┐  ┌─────────────┐ │
│ │   Prisma     │  │  MongoDB    │ │
│ │   Manager    │  │  Manager    │ │
│ └──────────────┘  └─────────────┘ │
│ ┌──────────────┐  ┌─────────────┐ │
│ │ Transaction  │  │ Connection  │ │
│ │   Manager    │  │   Pool      │ │
│ └──────────────┘  └─────────────┘ │
│ ┌──────────────┐  ┌─────────────┐ │
│ │  Migration   │  │    Query    │ │
│ │   Runner     │  │   Builder   │ │
│ └──────────────┘  └─────────────┘ │
└────────────────────────────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌─────────────┐
│ Vault Engine │  │  External   │
│ (DB creds)   │  │  Databases  │
└──────────────┘  └─────────────┘
```

## Component Design

### 1. Prisma Manager (`PrismaManager.ts`)

**Purpose**: Manage Prisma Client instances for SQL databases

**Features**:
- Dynamic schema generation from connection string
- Client lifecycle management
- Connection pooling configuration
- Type-safe query execution
- Transaction support

**Connection String Format**:
```
postgresql://user:password@host:5432/database
mysql://user:password@host:3306/database
sqlite:///path/to/database.db
```

### 2. MongoDB Manager (`MongoManager.ts`)

**Purpose**: Manage MongoDB connections and operations

**Features**:
- Native MongoDB driver integration
- Connection pooling
- CRUD operations
- Aggregation pipelines
- Index management
- Transaction support (4.0+)

**Connection String Format**:
```
mongodb://user:password@host:27017/database
mongodb+srv://user:password@cluster.mongodb.net/database
```

### 3. Transaction Manager (`TransactionManager.ts`)

**Purpose**: Handle database transactions with retry logic

**Features**:
- SQL transactions (via Prisma)
- MongoDB multi-document transactions
- Automatic retry on deadlock
- Savepoint support (SQL)
- Isolation level configuration
- Timeout handling

**Example**:
```typescript
await txManager.execute(async (tx) => {
  await tx.users.create({ data: { name: 'Alice' } });
  await tx.orders.create({ data: { userId: 1, amount: 100 } });
  // Auto-commit on success, auto-rollback on error
});
```

### 4. Connection Pool (`ConnectionPool.ts`)

**Purpose**: Manage multiple database connections

**Features**:
- Named connection registry
- Credential retrieval from Vault
- Health checks
- Automatic reconnection
- Connection reuse
- Graceful shutdown

**Configuration**:
```typescript
{
  connectionId: "production-db",
  type: "postgresql",
  poolSize: 10,
  idleTimeout: 30000,
  connectionTimeout: 10000
}
```

### 5. Migration Runner (`MigrationRunner.ts`)

**Purpose**: Execute database schema migrations

**Features**:
- Prisma Migrate integration
- Migration history tracking
- Up/down migrations
- Dry-run mode
- Migration status reporting

**Migration Format**:
```sql
-- Migration: 001_create_users_table
-- Up
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL
);

-- Down
DROP TABLE users;
```

### 6. Query Builder (`QueryBuilder.ts`)

**Purpose**: Type-safe query construction

**Features**:
- SQL query building (when Prisma is limiting)
- Parameter binding
- Query validation
- Result mapping
- Raw SQL execution (with safety checks)

## MCP Tools

### `db_connect`

Connect to a database (credentials from Vault):

```typescript
db_connect({
  connectionId: "production-db",
  type: "postgresql",
  vaultName: "database-credentials",
  credentialName: "prod-postgres"
})
```

### `db_query`

Execute SELECT query:

```typescript
db_query({
  connectionId: "production-db",
  table: "users",
  where: { active: true },
  select: ["id", "name", "email"],
  orderBy: { createdAt: "desc" },
  limit: 100
})
```

### `db_insert`

Insert records:

```typescript
db_insert({
  connectionId: "production-db",
  table: "users",
  data: {
    name: "Alice",
    email: "alice@example.com"
  }
})
```

### `db_update`

Update records:

```typescript
db_update({
  connectionId: "production-db",
  table: "users",
  where: { id: 123 },
  data: {
    name: "Alice Updated"
  }
})
```

### `db_delete`

Delete records:

```typescript
db_delete({
  connectionId: "production-db",
  table: "users",
  where: { id: 123 }
})
```

### `db_transaction`

Execute multiple operations in transaction:

```typescript
db_transaction({
  connectionId: "production-db",
  operations: [
    {
      type: "insert",
      table: "users",
      data: { name: "Bob" }
    },
    {
      type: "update",
      table: "accounts",
      where: { userId: 456 },
      data: { balance: 1000 }
    }
  ]
})
```

### `db_raw_query`

Execute raw SQL (with parameter binding):

```typescript
db_raw_query({
  connectionId: "production-db",
  query: "SELECT * FROM users WHERE email = $1 AND active = $2",
  params: ["alice@example.com", true]
})
```

### `db_migrate`

Run database migrations:

```typescript
db_migrate({
  connectionId: "production-db",
  action: "up",  // or "down", "status"
  steps: 1       // number of migrations to run
})
```

### `db_disconnect`

Close database connection:

```typescript
db_disconnect({
  connectionId: "production-db"
})
```

## Security Features

### 1. Credential Storage
- All database credentials stored in Vault Engine
- Connection strings never exposed in logs
- Automatic credential rotation support

### 2. SQL Injection Prevention
- Parameterized queries (Prisma)
- Parameter binding for raw SQL
- Query validation before execution

### 3. Access Control
- Connection-level permissions
- Table-level access control (via DB roles)
- Query result limiting

## Error Handling

**Error Codes**:
- `DB_CONNECTION_FAILED` - Connection failed
- `DB_QUERY_FAILED` - Query execution failed
- `DB_TRANSACTION_FAILED` - Transaction failed
- `DB_TIMEOUT` - Query timeout
- `DB_NOT_CONNECTED` - Connection not established
- `DB_MIGRATION_FAILED` - Migration failed
- `DB_INVALID_QUERY` - Invalid query structure

## Performance Optimization

### 1. Connection Pooling
- Reuse connections
- Configurable pool size
- Connection health checks

### 2. Query Optimization
- Automatic EXPLAIN analysis (PostgreSQL)
- Index recommendations
- Query result caching (optional)

### 3. Batch Operations
- Bulk inserts (100+ records at once)
- Batch updates
- Transaction batching

## Dependencies

```json
{
  "@prisma/client": "^6.2.0",
  "prisma": "^6.2.0",
  "mongodb": "^6.12.0",
  "pg": "^8.13.1",
  "mysql2": "^3.11.5"
}
```

## File Structure

```
src/tools/database/
├── DatabaseEngine.ts       # Main orchestrator
├── PrismaManager.ts        # SQL database manager
├── MongoManager.ts         # MongoDB manager
├── TransactionManager.ts   # Transaction handling
├── ConnectionPool.ts       # Connection management
├── MigrationRunner.ts      # Schema migrations
├── QueryBuilder.ts         # Query construction
└── tools.ts                # MCP tool definitions
```

## Testing Strategy

### Unit Tests
- Connection management
- Query building
- Transaction handling
- Migration execution
- Error recovery

### Integration Tests
- Real database connections (test containers)
- Transaction rollback
- Migration up/down
- Connection pooling

### Target: 50+ tests

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1)
- [ ] ConnectionPool.ts - Connection management
- [ ] PrismaManager.ts - Prisma integration
- [ ] QueryBuilder.ts - Query construction
- [ ] Tests: 15 tests

### Phase 2: MongoDB Support (Day 1-2)
- [ ] MongoManager.ts - MongoDB integration
- [ ] Tests: 10 tests

### Phase 3: Transactions (Day 2)
- [ ] TransactionManager.ts - Transaction handling
- [ ] Retry logic for deadlocks
- [ ] Tests: 15 tests

### Phase 4: Migrations (Day 2-3)
- [ ] MigrationRunner.ts - Migration execution
- [ ] Tests: 10 tests

### Phase 5: Integration & Tools (Day 3)
- [ ] DatabaseEngine.ts - Main orchestrator
- [ ] tools.ts - 9 MCP tools
- [ ] Server integration
- [ ] Tests: 10+ tests

### Total: 60+ tests, 3 days

## Example Workflows

### Workflow 1: User Management
```typescript
// Connect
await db_connect({
  connectionId: "users-db",
  type: "postgresql",
  vaultName: "db-creds",
  credentialName: "postgres-users"
});

// Create user
await db_insert({
  connectionId: "users-db",
  table: "users",
  data: { name: "Alice", email: "alice@example.com" }
});

// Query users
const users = await db_query({
  connectionId: "users-db",
  table: "users",
  where: { active: true }
});

// Update user
await db_update({
  connectionId: "users-db",
  table: "users",
  where: { email: "alice@example.com" },
  data: { lastLogin: new Date() }
});
```

### Workflow 2: Transaction with Rollback
```typescript
await db_transaction({
  connectionId: "finance-db",
  operations: [
    {
      type: "update",
      table: "accounts",
      where: { userId: 1 },
      data: { balance: { decrement: 100 } }
    },
    {
      type: "update",
      table: "accounts",
      where: { userId: 2 },
      data: { balance: { increment: 100 } }
    }
  ]
});
// Auto-rollback if any operation fails
```

## Next Steps

1. Install dependencies (Prisma, MongoDB driver)
2. Create file structure
3. Implement Phase 1 (Connection Pool + Prisma)
4. Implement Phase 2 (MongoDB)
5. Implement Phase 3 (Transactions)
6. Implement Phase 4 (Migrations)
7. Implement Phase 5 (Integration)
8. Documentation
9. Version bump to 0.5.0-alpha.1

LFG! 🚀
