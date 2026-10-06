import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_TOASTS, useToasts } from './toast';

const { push, dismiss } = useToasts.getState();
const messages = () => useToasts.getState().toasts.map((t) => t.message);

beforeEach(() => useToasts.setState({ toasts: [] }));

describe('toast store', () => {
  it('defaults to error kind and keeps it until dismissed', () => {
    push('a');
    expect(useToasts.getState().toasts[0]?.kind).toBe('error');
    expect(messages()).toEqual(['a']);
    dismiss(useToasts.getState().toasts[0]?.id ?? -1);
    expect(messages()).toEqual([]);
  });

  it('drops the oldest beyond the cap', () => {
    for (const m of ['1', '2', '3', '4']) push(m);
    expect(messages()).toEqual(['2', '3', '4']);
    expect(useToasts.getState().toasts).toHaveLength(MAX_TOASTS);
  });

  it('de-duplicates identical consecutive messages only', () => {
    push('a');
    push('a');
    push('b');
    push('a');
    expect(messages()).toEqual(['a', 'b', 'a']);
  });
});
