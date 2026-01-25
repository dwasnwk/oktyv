/**
 * Parallel Execution Engine - Type Definitions
 * 
 * Core types for DAG-based parallel execution of Oktyv tasks
 */

/**
 * Retry policy configuration for task execution
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Backoff strategy for retries */
  backoff: 'exponential' | 'linear';
  
  /** Initial delay in milliseconds before first retry */
  initialDelay: number;
}

/**
 * Task Definition
 * 
 * Represents a single unit of work to be executed by the parallel engine.
 * Tasks can have dependencies on other tasks and support variable substitution.
 */
export interface Task {
  /** Unique identifier for this task */
  id: string;
  
  /** Oktyv tool name to execute (e.g., "file_move", "email_imap_fetch") */
  tool: string;
  
  /** Parameters to pass to the tool (supports variable substitution ${taskId.result.field}) */
  params: Record<string, any>;
  
  /** Optional list of task IDs this task depends on */
  dependsOn?: string[];
  
  /** Optional priority (1-10, higher = execute first within same level) */
  priority?: number;
  
  /** Optional timeout in milliseconds for this specific task */
  timeout?: number;
  
  /** Optional vault name for credential resolution */
  vault?: string;
  
  /** Optional retry policy for transient failures */
  retryPolicy?: RetryPolicy;
}

/**
 * Execution Configuration
 * 
 * Global settings for parallel execution behavior
 */
export interface ExecutionConfig {
  /** Maximum number of tasks to run concurrently (default: 10) */
  maxConcurrent?: number;
  
  /** How to handle task failures (default: 'continue') */
  failureMode?: 'continue' | 'stop' | 'rollback';
  
  /** Overall timeout for entire execution in milliseconds */
  timeout?: number;
  
  /** Enable rollback support (experimental, default: false) */
  enableRollback?: boolean;
}

/**
 * Parallel Execution Request
 * 
 * Complete request to execute tasks in parallel
 */
export interface ParallelExecutionRequest {
  /** List of tasks to execute */
  tasks: Task[];
  
  /** Optional execution configuration */
  config?: ExecutionConfig;
}

/**
 * Task Result
 * 
 * Result of executing a single task
 */
export interface TaskResult {
  /** ID of the task that was executed */
  taskId: string;
  
  /** Execution status */
  status: 'success' | 'failed' | 'skipped';
  
  /** Duration in milliseconds */
  duration: number;
  
  /** Tool output (only present if status === 'success') */
  result?: any;
  
  /** Error information (only present if status === 'failed') */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  
  /** ISO timestamp when task started */
  startTime: string;
  
  /** ISO timestamp when task completed */
  endTime: string;
}

/**
 * DAG Information
 * 
 * Metadata about the dependency graph structure
 */
export interface DAGInfo {
  /** Task IDs grouped by execution level (level 0 has no dependencies) */
  levels: string[][];
  
  /** Directed edges representing dependencies */
  edges: Array<{ from: string; to: string }>;
}

/**
 * Execution Summary
 * 
 * Aggregated statistics about execution
 */
export interface ExecutionSummary {
  /** Total number of tasks */
  total: number;
  
  /** Number of successfully completed tasks */
  succeeded: number;
  
  /** Number of failed tasks */
  failed: number;
  
  /** Number of skipped tasks (due to failures or stop mode) */
  skipped: number;
}

/**
 * Parallel Execution Result
 * 
 * Complete result of parallel execution including all task results and metadata
 */
export interface ParallelExecutionResult {
  /** Unique identifier for this execution (UUID) */
  executionId: string;
  
  /** Overall execution status */
  status: 'success' | 'partial' | 'failure';
  
  /** ISO timestamp when execution started */
  startTime: string;
  
  /** ISO timestamp when execution completed */
  endTime: string;
  
  /** Total duration in milliseconds */
  duration: number;
  
  /** Results for each task, keyed by task ID */
  tasks: Record<string, TaskResult>;
  
  /** Summary statistics */
  summary: ExecutionSummary;
  
  /** Optional DAG structure information */
  dag?: DAGInfo;
}

/**
 * DAG Node
 * 
 * Internal representation of a task node in the dependency graph
 */
export interface DAGNode {
  /** The task this node represents */
  task: Task;
  
  /** Set of task IDs this task depends on */
  dependencies: Set<string>;
  
  /** Set of task IDs that depend on this task */
  dependents: Set<string>;
  
  /** Execution level (0 = no dependencies, higher = more dependencies in chain) */
  level?: number;
}

/**
 * Type guard to check if a value is a valid Task
 */
export function isTask(value: any): value is Task {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.tool === 'string' &&
    typeof value.params === 'object'
  );
}

/**
 * Type guard to check if a value is a valid ParallelExecutionRequest
 */
export function isParallelExecutionRequest(value: any): value is ParallelExecutionRequest {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isTask)
  );
}
