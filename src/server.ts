/**
 * Oktyv MCP Server
 * 
 * Main server class that implements the Model Context Protocol.
 * Registers tools and handles browser session management.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from './utils/logger.js';
import type { BrowserSession } from './types/index.js';

const logger = createLogger('server');

export class OktyvServer {
  private server: Server;
  private sessions: Map<string, BrowserSession>;

  constructor() {
    this.server = new Server(
      {
        name: 'oktyv',
        version: '0.1.0-alpha.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.sessions = new Map();

    // Register handlers
    this.setupHandlers();

    logger.info('Oktyv Server initialized');
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Received list_tools request');
      
      return {
        tools: [
          {
            name: 'linkedin_search_jobs',
            description: 'Search for jobs on LinkedIn with filters',
            inputSchema: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'string',
                  description: 'Job title, skills, or keywords to search for',
                },
                location: {
                  type: 'string',
                  description: 'City, state, or country',
                },
                remote: {
                  type: 'boolean',
                  description: 'Filter for remote positions only',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                  minimum: 1,
                  maximum: 50,
                },
              },
              required: [],
            },
          },
          {
            name: 'linkedin_get_job',
            description: 'Get detailed information about a specific job posting',
            inputSchema: {
              type: 'object',
              properties: {
                jobId: {
                  type: 'string',
                  description: 'LinkedIn job ID',
                },
                includeCompany: {
                  type: 'boolean',
                  description: 'Whether to fetch company details (default: false)',
                },
              },
              required: ['jobId'],
            },
          },
          {
            name: 'linkedin_get_company',
            description: 'Get detailed information about a company on LinkedIn',
            inputSchema: {
              type: 'object',
              properties: {
                companyId: {
                  type: 'string',
                  description: 'LinkedIn company ID or vanity name',
                },
              },
              required: ['companyId'],
            },
          },
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info('Received tool call', { tool: name, args });

      try {
        switch (name) {
          case 'linkedin_search_jobs':
            return await this.handleLinkedInSearchJobs(args);

          case 'linkedin_get_job':
            return await this.handleLinkedInGetJob(args);

          case 'linkedin_get_company':
            return await this.handleLinkedInGetCompany(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error('Tool execution failed', { tool: name, error });
        throw error;
      }
    });
  }

  private async handleLinkedInSearchJobs(_args: any): Promise<any> {
    // TODO: Implement LinkedIn job search
    logger.warn('linkedin_search_jobs not yet implemented');
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'NOT_IMPLEMENTED',
              message: 'LinkedIn job search is not yet implemented',
              retryable: false,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async handleLinkedInGetJob(_args: any): Promise<any> {
    // TODO: Implement LinkedIn job fetch
    logger.warn('linkedin_get_job not yet implemented');
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'NOT_IMPLEMENTED',
              message: 'LinkedIn job fetch is not yet implemented',
              retryable: false,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async handleLinkedInGetCompany(_args: any): Promise<any> {
    // TODO: Implement LinkedIn company fetch
    logger.warn('linkedin_get_company not yet implemented');
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: {
              code: 'NOT_IMPLEMENTED',
              message: 'LinkedIn company fetch is not yet implemented',
              retryable: false,
            },
          }, null, 2),
        },
      ],
    };
  }

  async connect(transport: StdioServerTransport): Promise<void> {
    await this.server.connect(transport);
    logger.info('Server connected to transport');
  }

  async close(): Promise<void> {
    logger.info('Closing server and cleaning up sessions...');
    
    // Close all browser sessions
    for (const [platform, session] of this.sessions) {
      try {
        if (session.browser) {
          await session.browser.close();
          logger.info('Closed browser session', { platform });
        }
      } catch (error) {
        logger.error('Error closing browser session', { platform, error });
      }
    }
    
    this.sessions.clear();
    await this.server.close();
    logger.info('Server closed');
  }
}
