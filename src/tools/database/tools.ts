/**
 * Database Engine - MCP Tools
 * 
 * Tool definitions for database operations.
 */

import { z } from 'zod';
import { DatabaseType } from './ConnectionPool.js';
import { TransactionOperationType } from './TransactionManager.js';

/**
 * Database type enum schema
 */
const DatabaseTypeSchema = z.enum([
  DatabaseType.POSTGRESQL,
  DatabaseType.MYSQL,
  DatabaseType.SQLITE,
  DatabaseType.MONGODB,
]);

/**
 * db_connect - Connect to a database
 */
export const db_connect = {
  name: 'db_connect',
  description: 'Connect to a database (PostgreSQL, MySQL, SQLite, or MongoDB) using credentials from Vault Engine',
  inputSchema: z.object({
    connectionId: z.string().describe('Unique identifier for this connection'),
    type: DatabaseTypeSchema.describe('Database type: postgresql, mysql, sqlite, or mongodb'),
    vaultName: z.string().optional().describe('Vault name containing database credentials'),
    credentialName: z.string().optional().describe('Credential name in vault'),
    connectionString: z.string().optional().describe('Direct connection string (alternative to vault)'),
    poolSize: z.number().optional().describe('Connection pool size (default: 10)'),
    idleTimeout: z.number().optional().describe('Idle timeout in ms (default: 30000)'),
    connectionTimeout: z.number().optional().describe('Connection timeout in ms (default: 10000)'),
  }),
};

/**
 * db_query - Query records from database
 */
export const db_query = {
  name: 'db_query',
  description: 'Query records from a table/collection with filtering, sorting, and pagination',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
    table: z.string().describe('Table name (SQL) or collection name (MongoDB)'),
    where: z.record(z.any()).optional().describe('Filter conditions (WHERE clause)'),
    select: z.array(z.string()).optional().describe('Columns to select (SQL only)'),
    projection: z.record(z.union([z.literal(0), z.literal(1)])).optional().describe('Fields to include/exclude (MongoDB only)'),
    orderBy: z.record(z.enum(['asc', 'desc'])).optional().describe('Sort order'),
    sort: z.record(z.union([z.literal(1), z.literal(-1)])).optional().describe('Sort order (MongoDB only)'),
    limit: z.number().optional().describe('Maximum number of records to return'),
    offset: z.number().optional().describe('Number of records to skip (SQL only)'),
    skip: z.number().optional().describe('Number of documents to skip (MongoDB only)'),
  }),
};

/**
 * db_insert - Insert records into database
 */
export const db_insert = {
  name: 'db_insert',
  description: 'Insert one or more records into a table/collection',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
    table: z.string().describe('Table name (SQL) or collection name (MongoDB)'),
    data: z.union([
      z.record(z.any()),
      z.array(z.record(z.any())),
    ]).describe('Record(s) to insert'),
  }),
};

/**
 * db_update - Update records in database
 */
export const db_update = {
  name: 'db_update',
  description: 'Update records in a table/collection matching the WHERE clause',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
    table: z.string().describe('Table name (SQL) or collection name (MongoDB)'),
    where: z.record(z.any()).describe('Filter conditions (WHERE clause)'),
    data: z.record(z.any()).describe('Data to update'),
    upsert: z.boolean().optional().describe('Create if not exists (MongoDB only)'),
  }),
};

/**
 * db_delete - Delete records from database
 */
export const db_delete = {
  name: 'db_delete',
  description: 'Delete records from a table/collection matching the WHERE clause',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
    table: z.string().describe('Table name (SQL) or collection name (MongoDB)'),
    where: z.record(z.any()).describe('Filter conditions (WHERE clause) - required for safety'),
  }),
};

/**
 * Transaction operation schema
 */
const TransactionOperationSchema = z.object({
  type: z.enum([
    TransactionOperationType.INSERT,
    TransactionOperationType.UPDATE,
    TransactionOperationType.DELETE,
    TransactionOperationType.QUERY,
  ]).describe('Operation type: insert, update, delete, or query'),
  table: z.string().describe('Table/collection name'),
  data: z.record(z.any()).optional().describe('Data for insert/update'),
  where: z.record(z.any()).optional().describe('Filter for update/delete/query'),
  select: z.array(z.string()).optional().describe('Columns to select (query only)'),
  orderBy: z.record(z.enum(['asc', 'desc'])).optional().describe('Sort order (query only)'),
  limit: z.number().optional().describe('Limit results (query only)'),
});

/**
 * db_transaction - Execute multiple operations in a transaction
 */
export const db_transaction = {
  name: 'db_transaction',
  description: 'Execute multiple database operations in an ACID transaction with automatic retry on deadlock',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
    operations: z.array(TransactionOperationSchema).describe('Operations to execute in transaction'),
    maxRetries: z.number().optional().describe('Maximum retry attempts on deadlock (default: 3)'),
    timeout: z.number().optional().describe('Transaction timeout in ms (default: 30000)'),
    isolationLevel: z.enum(['ReadUncommitted', 'ReadCommitted', 'RepeatableRead', 'Serializable']).optional().describe('Transaction isolation level (SQL only)'),
  }),
};

/**
 * db_raw_query - Execute raw SQL query
 */
export const db_raw_query = {
  name: 'db_raw_query',
  description: 'Execute raw SQL query with parameter binding (SQL databases only)',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
    query: z.string().describe('SQL query with $1, $2, etc. placeholders for parameters'),
    params: z.array(z.any()).optional().describe('Query parameters (bound to placeholders)'),
  }),
};

/**
 * db_aggregate - Execute MongoDB aggregation pipeline
 */
export const db_aggregate = {
  name: 'db_aggregate',
  description: 'Execute MongoDB aggregation pipeline (MongoDB only)',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
    collection: z.string().describe('Collection name'),
    pipeline: z.array(z.record(z.any())).describe('Aggregation pipeline stages (e.g., [{$match: {...}}, {$group: {...}}])'),
  }),
};

/**
 * db_disconnect - Disconnect from database
 */
export const db_disconnect = {
  name: 'db_disconnect',
  description: 'Disconnect from a database and close the connection',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection identifier'),
  }),
};

/**
 * Export all tools
 */
export const databaseTools = [
  db_connect,
  db_query,
  db_insert,
  db_update,
  db_delete,
  db_transaction,
  db_raw_query,
  db_aggregate,
  db_disconnect,
];
