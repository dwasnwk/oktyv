/**
 * Task Executor Tests
 * 
 * Tests for variable resolution, timeout handling, and retry logic
 * Using Node.js built-in test runner
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveParams,
  executeWithTimeout,
  executeWithRetry,
  extractError,
  VariableResolutionError,
  TaskTimeoutError,
} from '../TaskExecutor.js';
import { TaskResult } from '../types.js';

describe('TaskExecutor', () => {
  describe('resolveParams', () => {
    const mockResults: Record<string, TaskResult> = {
      taskA: {
        taskId: 'taskA',
        status: 'success',
        duration: 100,
        result: {
          userId: 123,
          name: 'John Doe',
          nested: {
            field: 'value',
            deep: {
              value: 42
            }
          },
          items: ['a', 'b', 'c']
        },
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:00:01Z'
      },
      taskB: {
        taskId: 'taskB',
        status: 'success',
        duration: 50,
        result: {
          count: 5,
          data: [1, 2, 3]
        },
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:00:01Z'
      },
      failedTask: {
        taskId: 'failedTask',
        status: 'failed',
        duration: 10,
        error: {
          code: 'ERROR',
          message: 'Task failed'
        },
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:00:01Z'
      }
    };

    it('should resolve simple variable substitution', () => {
      const params = {
        userId: '${taskA.result.userId}'
      };

      const resolved = resolveParams(params, mockResults);

      assert.strictEqual(resolved.userId, 123);
    });

    it('should resolve nested variable substitution', () => {
      const params = {
        field: '${taskA.result.nested.field}',
        deepValue: '${taskA.result.nested.deep.value}'
      };

      const resolved = resolveParams(params, mockResults);

      assert.strictEqual(resolved.field, 'value');
      assert.strictEqual(resolved.deepValue, 42);
    });

    it('should resolve array from variable', () => {
      const params = {
        items: '${taskA.result.items}'
      };

      const resolved = resolveParams(params, mockResults);

      assert.deepStrictEqual(resolved.items, ['a', 'b', 'c']);
    });

    it('should resolve object from variable', () => {
      const params = {
        nested: '${taskA.result.nested}'
      };

      const resolved = resolveParams(params, mockResults);

      assert.deepStrictEqual(resolved.nested, {
        field: 'value',
        deep: { value: 42 }
      });
    });

    it('should resolve embedded variables in string', () => {
      const params = {
        message: 'User ${taskA.result.userId} has ${taskB.result.count} items'
      };

      const resolved = resolveParams(params, mockResults);

      assert.strictEqual(resolved.message, 'User 123 has 5 items');
    });

    it('should resolve variables in nested objects', () => {
      const params = {
        config: {
          userId: '${taskA.result.userId}',
          settings: {
            count: '${taskB.result.count}'
          }
        }
      };

      const resolved = resolveParams(params, mockResults);

      assert.strictEqual(resolved.config.userId, 123);
      assert.strictEqual(resolved.config.settings.count, 5);
    });

    it('should resolve variables in arrays', () => {
      const params = {
        values: [
          '${taskA.result.userId}',
          '${taskB.result.count}',
          'static'
        ]
      };

      const resolved = resolveParams(params, mockResults);

      assert.deepStrictEqual(resolved.values, [123, 5, 'static']);
    });

    it('should preserve non-variable values', () => {
      const params = {
        string: 'normal string',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { key: 'value' }
      };

      const resolved = resolveParams(params, mockResults);

      assert.deepStrictEqual(resolved, params);
    });

    it('should throw on non-existent task', () => {
      const params = {
        value: '${nonExistent.result.field}'
      };

      assert.throws(
        () => resolveParams(params, mockResults),
        VariableResolutionError
      );
      assert.throws(
        () => resolveParams(params, mockResults),
        /Task nonExistent not found/
      );
    });

    it('should throw on failed task', () => {
      const params = {
        value: '${failedTask.result.field}'
      };

      assert.throws(
        () => resolveParams(params, mockResults),
        VariableResolutionError
      );
      assert.throws(
        () => resolveParams(params, mockResults),
        /did not succeed/
      );
    });

    it('should throw on non-existent path', () => {
      const params = {
        value: '${taskA.result.nonExistent}'
      };

      assert.throws(
        () => resolveParams(params, mockResults),
        VariableResolutionError
      );
      assert.throws(
        () => resolveParams(params, mockResults),
        /Path/
      );
    });

    it('should throw on incomplete variable path', () => {
      const params = {
        value: '${taskA}'
      };

      assert.throws(
        () => resolveParams(params, mockResults),
        VariableResolutionError
      );
      assert.throws(
        () => resolveParams(params, mockResults),
        /at least taskId and field/
      );
    });

    it('should handle multiple variables in same string', () => {
      const params = {
        message: '${taskA.result.name} (ID: ${taskA.result.userId}) has ${taskB.result.count} items'
      };

      const resolved = resolveParams(params, mockResults);

      assert.strictEqual(resolved.message, 'John Doe (ID: 123) has 5 items');
    });

    it('should stringify objects when embedded in strings', () => {
      const params = {
        message: 'Data: ${taskA.result.nested}'
      };

      const resolved = resolveParams(params, mockResults);

      assert.ok(resolved.message.includes('"field":"value"'));
      assert.ok(resolved.message.includes('"deep":{"value":42}'));
    });
  });

  describe('executeWithTimeout', () => {
    it('should resolve when operation completes within timeout', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      };

      const result = await executeWithTimeout(operation, 100, 'test-task');

      assert.strictEqual(result, 'success');
    });

    it('should reject with TaskTimeoutError when operation exceeds timeout', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      };

      await assert.rejects(
        executeWithTimeout(operation, 50, 'test-task'),
        TaskTimeoutError
      );

      await assert.rejects(
        executeWithTimeout(operation, 50, 'test-task'),
        /exceeded timeout of 50ms/
      );
    });

    it('should reject with operation error if operation fails before timeout', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };

      await assert.rejects(
        executeWithTimeout(operation, 1000, 'test-task'),
        /Operation failed/
      );
    });

    it('should include taskId in timeout error', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      };

      try {
        await executeWithTimeout(operation, 50, 'my-task');
        assert.fail('Should have thrown');
      } catch (error: any) {
        assert.ok(error instanceof TaskTimeoutError);
        assert.strictEqual(error.taskId, 'my-task');
        assert.strictEqual(error.timeoutMs, 50);
      }
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = mock.fn(async () => 'success');

      const result = await executeWithRetry(
        operation,
        {
          maxAttempts: 3,
          backoff: 'exponential',
          initialDelay: 100
        },
        'test-task'
      );

      assert.strictEqual(result, 'success');
      assert.strictEqual(operation.mock.calls.length, 1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attemptCount = 0;
      const operation = mock.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return 'success';
      });

      const result = await executeWithRetry(
        operation,
        {
          maxAttempts: 3,
          backoff: 'exponential',
          initialDelay: 10  // Small delay for faster test
        },
        'test-task'
      );

      assert.strictEqual(result, 'success');
      assert.strictEqual(operation.mock.calls.length, 3);
    });

    it('should throw last error after exhausting all retries', async () => {
      const operation = mock.fn(async () => {
        throw new Error('Always fails');
      });

      await assert.rejects(
        executeWithRetry(
          operation,
          {
            maxAttempts: 3,
            backoff: 'exponential',
            initialDelay: 10  // Small delay for faster test
          },
          'test-task'
        ),
        /Always fails/
      );

      assert.strictEqual(operation.mock.calls.length, 3);
    });

    it('should use exponential backoff correctly', async () => {
      let attemptCount = 0;
      const operation = mock.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Fail ${attemptCount}`);
        }
        return 'success';
      });

      const result = await executeWithRetry(
        operation,
        {
          maxAttempts: 3,
          backoff: 'exponential',
          initialDelay: 10  // Small delay for faster test
        },
        'test-task'
      );

      assert.strictEqual(result, 'success');
      assert.strictEqual(operation.mock.calls.length, 3);
    });

    it('should use linear backoff correctly', async () => {
      let attemptCount = 0;
      const operation = mock.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Fail ${attemptCount}`);
        }
        return 'success';
      });

      const result = await executeWithRetry(
        operation,
        {
          maxAttempts: 3,
          backoff: 'linear',
          initialDelay: 10  // Small delay for faster test
        },
        'test-task'
      );

      assert.strictEqual(result, 'success');
      assert.strictEqual(operation.mock.calls.length, 3);
    });
  });

  describe('extractError', () => {
    it('should extract Error object', () => {
      const error = new Error('Test error');
      error.name = 'TestError';

      const extracted = extractError(error);

      assert.strictEqual(extracted.code, 'TestError');
      assert.strictEqual(extracted.message, 'Test error');
      assert.ok(extracted.stack);
    });

    it('should extract string error', () => {
      const extracted = extractError('Simple error message');

      assert.strictEqual(extracted.code, 'ERROR');
      assert.strictEqual(extracted.message, 'Simple error message');
    });

    it('should extract object with error properties', () => {
      const error = {
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        stack: 'stack trace'
      };

      const extracted = extractError(error);

      assert.strictEqual(extracted.code, 'CUSTOM_ERROR');
      assert.strictEqual(extracted.message, 'Custom error message');
      assert.strictEqual(extracted.stack, 'stack trace');
    });

    it('should handle object without code', () => {
      const error = {
        name: 'CustomError',
        message: 'Error occurred'
      };

      const extracted = extractError(error);

      assert.strictEqual(extracted.code, 'CustomError');
      assert.strictEqual(extracted.message, 'Error occurred');
    });

    it('should handle unknown error types', () => {
      const extracted = extractError(42);

      assert.strictEqual(extracted.code, 'UNKNOWN_ERROR');
      assert.strictEqual(extracted.message, '42');
    });

    it('should handle null and undefined', () => {
      const extractedNull = extractError(null);
      assert.strictEqual(extractedNull.code, 'UNKNOWN_ERROR');
      assert.strictEqual(extractedNull.message, 'null');

      const extractedUndefined = extractError(undefined);
      assert.strictEqual(extractedUndefined.code, 'UNKNOWN_ERROR');
      assert.strictEqual(extractedUndefined.message, 'undefined');
    });
  });
});
