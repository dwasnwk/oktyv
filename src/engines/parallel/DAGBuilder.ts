/**
 * DAG Builder - Dependency Graph Construction and Validation
 * 
 * Builds directed acyclic graphs from tasks, validates dependencies,
 * detects cycles, and performs topological sorting for execution.
 */

import { Task, DAGNode } from './types.js';

/**
 * Custom error for circular dependency detection
 */
export class CircularDependencyError extends Error {
  constructor(
    public cycle: string[]
  ) {
    super(`Circular dependency detected: ${cycle.join(' → ')}`);
    this.name = 'CircularDependencyError';
  }
}

/**
 * Custom error for missing dependencies
 */
export class MissingDependencyError extends Error {
  constructor(
    public taskId: string,
    public missingDependencyId: string
  ) {
    super(`Task ${taskId} depends on non-existent task ${missingDependencyId}`);
    this.name = 'MissingDependencyError';
  }
}

/**
 * Build dependency graph from tasks
 * 
 * Creates a graph structure where:
 * - Each task becomes a DAGNode
 * - Dependencies are tracked bidirectionally
 * - Validates that all referenced dependencies exist
 * 
 * @param tasks - Array of tasks to build graph from
 * @returns Map of task IDs to DAGNodes
 * @throws {MissingDependencyError} If a task depends on a non-existent task
 */
export function buildDAG(tasks: Task[]): Map<string, DAGNode> {
  const graph = new Map<string, DAGNode>();
  
  // Step 1: Create nodes for all tasks
  for (const task of tasks) {
    // Check for duplicate task IDs
    if (graph.has(task.id)) {
      throw new Error(`Duplicate task ID: ${task.id}`);
    }
    
    graph.set(task.id, {
      task,
      dependencies: new Set(task.dependsOn || []),
      dependents: new Set(),
      level: undefined
    });
  }
  
  // Step 2: Build reverse edges (dependents) and validate dependencies
  for (const [taskId, node] of graph) {
    for (const depId of node.dependencies) {
      const depNode = graph.get(depId);
      
      if (!depNode) {
        throw new MissingDependencyError(taskId, depId);
      }
      
      // Add reverse edge: depNode knows taskId depends on it
      depNode.dependents.add(taskId);
    }
  }
  
  return graph;
}

/**
 * Detect circular dependencies using depth-first search
 * 
 * Uses DFS with recursion stack to detect cycles. If a cycle is found,
 * returns the path that forms the cycle. Otherwise returns null.
 * 
 * Algorithm:
 * 1. For each unvisited node, start DFS
 * 2. Track current recursion stack (path)
 * 3. If we revisit a node in current stack, we found a cycle
 * 4. Return the cycle path for error reporting
 * 
 * @param graph - Dependency graph to check
 * @returns Cycle path if found, null otherwise
 */
export function detectCircularDependencies(
  graph: Map<string, DAGNode>
): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  /**
   * DFS helper function
   * @param nodeId - Current node being explored
   * @param path - Current path from root to this node
   * @returns Cycle path if found, null otherwise
   */
  function dfs(nodeId: string, path: string[]): string[] | null {
    // Found cycle - node is in recursion stack
    if (recursionStack.has(nodeId)) {
      // Return the cycle: find where cycle starts and append current node
      const cycleStart = path.indexOf(nodeId);
      return path.slice(cycleStart).concat(nodeId);
    }
    
    // Already fully explored - no cycle from here
    if (visited.has(nodeId)) {
      return null;
    }
    
    // Mark as being explored
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const node = graph.get(nodeId)!;
    
    // Explore all dependencies (edges in the graph)
    for (const depId of node.dependencies) {
      const cycle = dfs(depId, [...path]);
      if (cycle) {
        return cycle;
      }
    }
    
    // Done exploring this branch
    recursionStack.delete(nodeId);
    return null;
  }
  
  // Check all nodes (handles disconnected components)
  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      const cycle = dfs(nodeId, []);
      if (cycle) {
        return cycle;
      }
    }
  }
  
  return null;
}

/**
 * Topological sort using Kahn's algorithm
 * 
 * Groups tasks into execution levels where:
 * - Level 0: Tasks with no dependencies
 * - Level N: Tasks whose dependencies are all in levels 0..N-1
 * 
 * This allows parallel execution within each level while respecting dependencies.
 * 
 * Algorithm:
 * 1. Calculate in-degree (number of dependencies) for each node
 * 2. Start with all nodes with in-degree 0 (Level 0)
 * 3. For each level:
 *    a. Process all nodes in current level
 *    b. Reduce in-degree of their dependents
 *    c. Nodes with in-degree 0 form next level
 * 4. Repeat until all nodes processed
 * 
 * @param graph - Dependency graph to sort
 * @returns Array of levels, where each level is an array of task IDs
 * @throws {Error} If topological sort fails (indicates circular dependency)
 */
export function topologicalSort(graph: Map<string, DAGNode>): string[][] {
  const levels: string[][] = [];
  const inDegree = new Map<string, number>();
  
  // Step 1: Calculate in-degrees (number of dependencies)
  for (const [taskId, node] of graph) {
    inDegree.set(taskId, node.dependencies.size);
  }
  
  // Step 2: Find all nodes with in-degree 0 (no dependencies)
  let currentLevel = Array.from(graph.keys()).filter(
    id => inDegree.get(id) === 0
  );
  
  // Step 3: Process level by level
  while (currentLevel.length > 0) {
    // Add current level to results
    levels.push(currentLevel);
    
    const nextLevel: string[] = [];
    
    // Process each node in current level
    for (const taskId of currentLevel) {
      const node = graph.get(taskId)!;
      
      // Reduce in-degree of all dependents
      for (const dependentId of node.dependents) {
        const newDegree = inDegree.get(dependentId)! - 1;
        inDegree.set(dependentId, newDegree);
        
        // If dependent now has no remaining dependencies, add to next level
        if (newDegree === 0) {
          nextLevel.push(dependentId);
        }
      }
      
      // Mark this node's level
      node.level = levels.length - 1;
    }
    
    currentLevel = nextLevel;
  }
  
  // Step 4: Verify all nodes were processed
  // If some nodes remain, there's a circular dependency we missed
  const processedCount = levels.flat().length;
  if (processedCount !== graph.size) {
    throw new Error(
      `Topological sort failed: processed ${processedCount} of ${graph.size} tasks. ` +
      'This indicates a circular dependency.'
    );
  }
  
  return levels;
}

/**
 * Validate and build complete DAG
 * 
 * High-level function that performs all validation and construction:
 * 1. Build graph structure
 * 2. Detect circular dependencies
 * 3. Perform topological sort
 * 
 * @param tasks - Array of tasks to validate and sort
 * @returns Object containing graph and execution levels
 * @throws {MissingDependencyError} If dependencies reference non-existent tasks
 * @throws {CircularDependencyError} If circular dependencies detected
 */
export function validateAndBuildDAG(tasks: Task[]): {
  graph: Map<string, DAGNode>;
  levels: string[][];
} {
  // Step 1: Build graph
  const graph = buildDAG(tasks);
  
  // Step 2: Detect cycles
  const cycle = detectCircularDependencies(graph);
  if (cycle) {
    throw new CircularDependencyError(cycle);
  }
  
  // Step 3: Topological sort
  const levels = topologicalSort(graph);
  
  return { graph, levels };
}

/**
 * Extract edges for visualization or debugging
 * 
 * Converts the graph structure into a simple edge list format
 * useful for visualization tools or debugging.
 * 
 * @param graph - Dependency graph
 * @returns Array of directed edges {from, to}
 */
export function extractEdges(
  graph: Map<string, DAGNode>
): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  
  for (const [taskId, node] of graph) {
    for (const depId of node.dependencies) {
      // Edge from dependency to dependent (depId → taskId)
      edges.push({ from: depId, to: taskId });
    }
  }
  
  return edges;
}
