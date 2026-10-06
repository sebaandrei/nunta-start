import { describe, expect, it } from 'vitest';
import { DataError } from '../data/errors';
import { ro } from '../i18n/ro';
import { errorStatus, errorToMessage, shouldRetry } from './queryClient';

describe('errorStatus', () => {
  it('uses a numeric status when present', () => {
    expect(errorStatus({ status: 403 })).toBe(403);
  });
  it('maps PostgREST and Postgres codes', () => {
    expect(errorStatus({ code: 'PGRST301' })).toBe(401);
    expect(errorStatus({ code: 'PGRST302' })).toBe(401);
    expect(errorStatus({ code: '42501' })).toBe(403);
    expect(errorStatus({ code: 'PGRST116' })).toBe(404);
    expect(errorStatus({ code: '22P02' })).toBe(400);
    expect(errorStatus({ code: '23505' })).toBe(400);
    expect(errorStatus({ code: '42P01' })).toBe(400);
  });
  it('leaves unknown errors undefined', () => {
    expect(errorStatus({ code: '08006' })).toBeUndefined();
    expect(errorStatus({ code: 'PGRST999' })).toBeUndefined();
    expect(errorStatus(new Error('x'))).toBeUndefined();
    expect(errorStatus(new TypeError('Failed to fetch'))).toBeUndefined();
    expect(errorStatus(null)).toBeUndefined();
  });
});

describe('shouldRetry', () => {
  it('does not retry 4xx, including Postgres-derived ones', () => {
    expect(shouldRetry(0, { status: 404 })).toBe(false);
    expect(shouldRetry(0, { code: '42501' })).toBe(false);
    expect(shouldRetry(0, { code: '23505' })).toBe(false);
  });
  it('retries 5xx and unknown errors up to twice', () => {
    expect(shouldRetry(0, { status: 500 })).toBe(true);
    expect(shouldRetry(1, new Error('x'))).toBe(true);
    expect(shouldRetry(2, new Error('x'))).toBe(false);
  });
});

describe('errorToMessage', () => {
  it('maps auth, network and unknown errors', () => {
    expect(errorToMessage({ status: 403 })).toBe(ro.errors.forbidden);
    expect(errorToMessage({ status: 401 })).toBe(ro.errors.forbidden);
    expect(errorToMessage({ code: '42501', message: 'rls' })).toBe(ro.errors.forbidden);
    expect(errorToMessage({ code: 'PGRST301' })).toBe(ro.errors.forbidden);
    expect(errorToMessage(new TypeError('Failed to fetch'))).toBe(ro.errors.network);
    expect(errorToMessage(new Error('boom'))).toBe(ro.errors.generic);
  });
  it('explains the scenario limits enforced by the database', () => {
    const max = new DataError('a wedding can have at most 4 budget scenarios', 400, '23514');
    const min = new DataError('a wedding must keep at least 1 budget scenario', 400, '23514');
    expect(errorToMessage(max)).toBe(ro.errors.scenarioMax);
    expect(errorToMessage(min)).toBe(ro.errors.scenarioMin);
  });
});
