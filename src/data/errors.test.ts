import { describe, expect, it } from 'vitest';
import { errorStatus, shouldRetry } from '../lib/queryClient';
import { DataError, isWeddingLimitError, unwrap, unwrapOne } from './errors';

describe('unwrap', () => {
  it('returns the data', () => {
    expect(unwrap({ data: [1], error: null, status: 200 })).toEqual([1]);
  });

  it('turns a response error into a DataError with the HTTP status', () => {
    try {
      unwrap({ data: null, error: { message: 'denied', code: '42501' }, status: 403 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DataError);
      expect(errorStatus(e)).toBe(403);
      expect((e as DataError).code).toBe('42501');
    }
  });

  it('does not retry 4xx but retries 5xx', () => {
    const e4 = new DataError('x', 400);
    const e5 = new DataError('x', 503);
    expect(shouldRetry(0, e4)).toBe(false);
    expect(shouldRetry(0, e5)).toBe(true);
    expect(shouldRetry(2, e5)).toBe(false);
  });

  it('maps a network failure (status 0) to a retriable TypeError', () => {
    const run = () => unwrap({ data: null, error: { message: 'Failed to fetch' }, status: 0 });
    expect(run).toThrow(TypeError);
    try {
      run();
    } catch (e) {
      expect(shouldRetry(0, e)).toBe(true);
    }
  });

  it('never reports a 2xx status as an error status', () => {
    expect(() => unwrap({ data: null, error: { message: 'x' }, status: 200 })).toThrow(
      expect.objectContaining({ status: 500 }),
    );
  });
});

describe('unwrapOne', () => {
  it('throws 404 for a missing row', () => {
    expect(() => unwrapOne({ data: null, error: null, status: 200 })).toThrow(expect.objectContaining({ status: 404 }));
  });
});

describe('isWeddingLimitError', () => {
  it('recognises the RPC limit error only', () => {
    expect(
      isWeddingLimitError(new DataError('wedding limit reached: at most 5 weddings per owner', 400, 'P0001')),
    ).toBe(true);
    expect(isWeddingLimitError(new DataError('other', 400))).toBe(false);
    expect(isWeddingLimitError(new Error('wedding limit reached'))).toBe(false);
  });
});
