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
    console.error('[DEBUG] Step 1: Starting Oktyv MCP Server...');
    logger.info('Starting Oktyv MCP Server...');
    
    console.error('[DEBUG] Step 2: Creating server instance...');
    // Create server instance
    const server = new OktyvServer();
    console.error('[DEBUG] Step 3: Server instance created');
    
    console.error('[DEBUG] Step 4: Creating stdio transport...');
    // Create stdio transport
    const transport = new StdioServerTransport();
    console.error('[DEBUG] Step 5: Transport created');
    
    console.error('[DEBUG] Step 6: Connecting server to transport...');
    // Connect server to transport
    await server.connect(transport);
    console.error('[DEBUG] Step 7: Server connected successfully');
    
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
    console.error('[DEBUG] FATAL ERROR in main():', error);
    logger.error('Failed to start Oktyv MCP Server', { error });
    process.exit(1);
  }
}

// Run server
main().catch((error) => {
  console.error('[DEBUG] FATAL ERROR in main() catch:', error);
  logger.error('Fatal error', { error });
  process.exit(1);
});
