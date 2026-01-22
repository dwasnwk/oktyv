#!/usr/bin/env node
/**
 * Oktyv MCP Server Entry Point
 * 
 * Launches the MCP server and handles stdio communication with Claude Desktop.
 * 
 * Usage:
 *   node dist/index.js
 * 
 * Configuration in Claude Desktop:
 *   "oktyv": {
 *     "command": "node",
 *     "args": ["/absolute/path/to/oktyv/dist/index.js"]
 *   }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OktyvServer } from './server.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('main');

async function main() {
  try {
    logger.info('Starting Oktyv MCP Server...');
    
    // Create server instance
    const server = new OktyvServer();
    
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    logger.info('Oktyv MCP Server started successfully');
    logger.info('Waiting for requests from Claude Desktop...');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await server.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await server.close();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start Oktyv MCP Server', { error });
    process.exit(1);
  }
}

// Run server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
