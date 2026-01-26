/**
 * Winston logger configuration for Oktyv
 * 
 * Logs to both console and file with appropriate formatting.
 */

import winston from 'winston';
import path from 'path';

const LOG_DIR = process.env.OKTYV_LOG_DIR || './logs';
const LOG_LEVEL = process.env.OKTYV_LOG_LEVEL || 'info';

// Create base logger configuration
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
);

// Console format (human-readable)
const consoleFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, label, metadata }) => {
    const labelStr = label ? `[${label}]` : '';
    const metaStr = metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0 
      ? `\n${JSON.stringify(metadata, null, 2)}` 
      : '';
    return `${timestamp} ${level} ${labelStr} ${message}${metaStr}`;
  })
);

// File format (JSON for parsing)
const fileFormat = winston.format.combine(
  baseFormat,
  winston.format.json()
);

// Determine if running as MCP server (stdio must be pure JSON)
const isMcpServer = process.argv[1]?.includes('index.js') || process.env.MCP_MODE === 'true';

// Create transports array
const transports: winston.transport[] = [
  // File transport - combined
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'oktyv.log'),
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }),
  
  // File transport - errors only
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
  }),
];

// Only add console logging if NOT running as MCP server
// (MCP requires stdout to be pure JSON)
if (!isMcpServer) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create the root logger
const rootLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
});

/**
 * Create a child logger with a specific label
 */
export function createLogger(label: string): winston.Logger {
  return rootLogger.child({ label });
}

/**
 * Export root logger for global use
 */
export const logger = rootLogger;
