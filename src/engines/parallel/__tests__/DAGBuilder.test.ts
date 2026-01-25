/**
 * DAG Builder Tests
 * 
 * Comprehensive test suite for graph construction, validation, and sorting
 */

import { describe, it, expect } from 'vitest';
import {
  buildDAG,
  detectCircularDependencies,
  topologicalSort,
  validateAndBuildDAG,
  extractEdges,
  CircularDependencyError,
  MissingDependencyError,
} from '../DAGBuilder.js';
import { Task } from '../types.js';

describe('DAGBuilder', () => {
  describe('buildDAG', () => {
    it('should handle empty task list', () => {
      const tasks: Task[] = [];
      const graph = buildDAG(tasks);
      
      expect(graph.size).toBe(0);
    });

    it('should handle single task with no dependencies', () => {
      const tasks: Task[] = [
        { id: 'task1', tool: 'test_tool', params: {} }
      ];
      
      const graph = buildDAG(tasks);
      
      expect(graph.size).toBe(1);
      expect(graph.has('task1')).toBe(true);
      
      const node = graph.get('task1')!;
      expect(node.task.id).toBe('task1');
      expect(node.dependencies.size).toBe(0);
      expect(node.dependents.size).toBe(0);
    });

    it('should handle multiple independent tasks', () => {
      const tasks: Task[] = [
        { id: 'task1', tool: 'tool1', params: {} },
        { id: 'task2', tool: 'tool2', params: {} },
        { id: 'task3', tool: 'tool3', params: {} }
      ];
      
      const graph = buildDAG(tasks);
      
      expect(graph.size).toBe(3);
      
      for (const task of tasks) {
        const node = graph.get(task.id)!;
        expect(node.dependencies.size).toBe(0);
        expect(node.dependents.size).toBe(0);
      }
    });

    it('should build simple chain (A → B → C)', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['B'] }
      ];
      
      const graph = buildDAG(tasks);
      
      expect(graph.size).toBe(3);
      
      const nodeA = graph.get('A')!;
      expect(nodeA.dependencies.size).toBe(0);
      expect(nodeA.dependents.has('B')).toBe(true);
      expect(nodeA.dependents.size).toBe(1);
      
      const nodeB = graph.get('B')!;
      expect(nodeB.dependencies.has('A')).toBe(true);
      expect(nodeB.dependencies.size).toBe(1);
      expect(nodeB.dependents.has('C')).toBe(true);
      expect(nodeB.dependents.size).toBe(1);
      
      const nodeC = graph.get('C')!;
      expect(nodeC.dependencies.has('B')).toBe(true);
      expect(nodeC.dependencies.size).toBe(1);
      expect(nodeC.dependents.size).toBe(0);
    });

    it('should build diamond pattern (A → B,C → D)', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'D', tool: 'tool', params: {}, dependsOn: ['B', 'C'] }
      ];
      
      const graph = buildDAG(tasks);
      
      expect(graph.size).toBe(4);
      
      const nodeA = graph.get('A')!;
      expect(nodeA.dependencies.size).toBe(0);
      expect(nodeA.dependents.has('B')).toBe(true);
      expect(nodeA.dependents.has('C')).toBe(true);
      expect(nodeA.dependents.size).toBe(2);
      
      const nodeB = graph.get('B')!;
      expect(nodeB.dependencies.has('A')).toBe(true);
      expect(nodeB.dependents.has('D')).toBe(true);
      
      const nodeC = graph.get('C')!;
      expect(nodeC.dependencies.has('A')).toBe(true);
      expect(nodeC.dependents.has('D')).toBe(true);
      
      const nodeD = graph.get('D')!;
      expect(nodeD.dependencies.has('B')).toBe(true);
      expect(nodeD.dependencies.has('C')).toBe(true);
      expect(nodeD.dependencies.size).toBe(2);
      expect(nodeD.dependents.size).toBe(0);
    });

    it('should throw on missing dependency', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {}, dependsOn: ['NonExistent'] }
      ];
      
      expect(() => buildDAG(tasks)).toThrow(MissingDependencyError);
      expect(() => buildDAG(tasks)).toThrow('Task A depends on non-existent task NonExistent');
    });

    it('should throw on duplicate task IDs', () => {
      const tasks: Task[] = [
        { id: 'duplicate', tool: 'tool1', params: {} },
        { id: 'duplicate', tool: 'tool2', params: {} }
      ];
      
      expect(() => buildDAG(tasks)).toThrow('Duplicate task ID: duplicate');
    });
  });

  describe('detectCircularDependencies', () => {
    it('should return null for acyclic graph', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['B'] }
      ];
      
      const graph = buildDAG(tasks);
      const cycle = detectCircularDependencies(graph);
      
      expect(cycle).toBeNull();
    });

    it('should detect simple cycle (A → B → A)', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {}, dependsOn: ['B'] },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] }
      ];
      
      const graph = buildDAG(tasks);
      const cycle = detectCircularDependencies(graph);
      
      expect(cycle).not.toBeNull();
      expect(cycle).toContain('A');
      expect(cycle).toContain('B');
      // Cycle should start and end with same node
      expect(cycle![0]).toBe(cycle![cycle!.length - 1]);
    });

    it('should detect longer cycle (A → B → C → A)', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {}, dependsOn: ['C'] },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['B'] }
      ];
      
      const graph = buildDAG(tasks);
      const cycle = detectCircularDependencies(graph);
      
      expect(cycle).not.toBeNull();
      expect(cycle!.length).toBe(4); // A → B → C → A
      expect(cycle![0]).toBe(cycle![3]); // Starts and ends with same node
    });

    it('should detect self-loop', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {}, dependsOn: ['A'] }
      ];
      
      const graph = buildDAG(tasks);
      const cycle = detectCircularDependencies(graph);
      
      expect(cycle).not.toBeNull();
      expect(cycle).toEqual(['A', 'A']);
    });

    it('should handle disconnected components', () => {
      // Two separate acyclic graphs
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'X', tool: 'tool', params: {} },
        { id: 'Y', tool: 'tool', params: {}, dependsOn: ['X'] }
      ];
      
      const graph = buildDAG(tasks);
      const cycle = detectCircularDependencies(graph);
      
      expect(cycle).toBeNull();
    });
  });

  describe('topologicalSort', () => {
    it('should handle empty graph', () => {
      const graph = buildDAG([]);
      const levels = topologicalSort(graph);
      
      expect(levels).toEqual([]);
    });

    it('should handle single task', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} }
      ];
      
      const graph = buildDAG(tasks);
      const levels = topologicalSort(graph);
      
      expect(levels).toEqual([['A']]);
    });

    it('should handle independent tasks (all in level 0)', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {} },
        { id: 'C', tool: 'tool', params: {} }
      ];
      
      const graph = buildDAG(tasks);
      const levels = topologicalSort(graph);
      
      expect(levels.length).toBe(1);
      expect(levels[0]).toHaveLength(3);
      expect(levels[0]).toContain('A');
      expect(levels[0]).toContain('B');
      expect(levels[0]).toContain('C');
    });

    it('should sort simple chain correctly', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['B'] }
      ];
      
      const graph = buildDAG(tasks);
      const levels = topologicalSort(graph);
      
      expect(levels).toEqual([
        ['A'],
        ['B'],
        ['C']
      ]);
    });

    it('should sort diamond pattern correctly', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'D', tool: 'tool', params: {}, dependsOn: ['B', 'C'] }
      ];
      
      const graph = buildDAG(tasks);
      const levels = topologicalSort(graph);
      
      expect(levels.length).toBe(3);
      expect(levels[0]).toEqual(['A']);
      expect(levels[1]).toHaveLength(2);
      expect(levels[1]).toContain('B');
      expect(levels[1]).toContain('C');
      expect(levels[2]).toEqual(['D']);
    });

    it('should handle complex graph', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {} },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['A', 'B'] },
        { id: 'D', tool: 'tool', params: {}, dependsOn: ['B'] },
        { id: 'E', tool: 'tool', params: {}, dependsOn: ['C', 'D'] }
      ];
      
      const graph = buildDAG(tasks);
      const levels = topologicalSort(graph);
      
      expect(levels.length).toBe(3);
      expect(levels[0]).toHaveLength(2);
      expect(levels[0]).toContain('A');
      expect(levels[0]).toContain('B');
      expect(levels[1]).toHaveLength(2);
      expect(levels[1]).toContain('C');
      expect(levels[1]).toContain('D');
      expect(levels[2]).toEqual(['E']);
    });

    it('should set level property on nodes', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['B'] }
      ];
      
      const graph = buildDAG(tasks);
      topologicalSort(graph);
      
      expect(graph.get('A')!.level).toBe(0);
      expect(graph.get('B')!.level).toBe(1);
      expect(graph.get('C')!.level).toBe(2);
    });
  });

  describe('validateAndBuildDAG', () => {
    it('should successfully validate and build acyclic graph', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'D', tool: 'tool', params: {}, dependsOn: ['B', 'C'] }
      ];
      
      const result = validateAndBuildDAG(tasks);
      
      expect(result.graph.size).toBe(4);
      expect(result.levels.length).toBe(3);
    });

    it('should throw CircularDependencyError on cycle', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {}, dependsOn: ['B'] },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['C'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['A'] }
      ];
      
      expect(() => validateAndBuildDAG(tasks)).toThrow(CircularDependencyError);
      expect(() => validateAndBuildDAG(tasks)).toThrow('Circular dependency detected');
    });

    it('should throw MissingDependencyError on invalid reference', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {}, dependsOn: ['NonExistent'] }
      ];
      
      expect(() => validateAndBuildDAG(tasks)).toThrow(MissingDependencyError);
    });
  });

  describe('extractEdges', () => {
    it('should return empty array for graph with no dependencies', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {} }
      ];
      
      const graph = buildDAG(tasks);
      const edges = extractEdges(graph);
      
      expect(edges).toEqual([]);
    });

    it('should extract edges correctly', () => {
      const tasks: Task[] = [
        { id: 'A', tool: 'tool', params: {} },
        { id: 'B', tool: 'tool', params: {}, dependsOn: ['A'] },
        { id: 'C', tool: 'tool', params: {}, dependsOn: ['A', 'B'] }
      ];
      
      const graph = buildDAG(tasks);
      const edges = extractEdges(graph);
      
      expect(edges).toHaveLength(3);
      expect(edges).toContainEqual({ from: 'A', to: 'B' });
      expect(edges).toContainEqual({ from: 'A', to: 'C' });
      expect(edges).toContainEqual({ from: 'B', to: 'C' });
    });
  });
});
