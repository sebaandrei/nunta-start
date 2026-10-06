import { describe, expect, it } from 'vitest';
import { pageTitle } from './useDocumentTitle';

describe('pageTitle', () => {
  it('joins page and app name', () => {
    expect(pageTitle('Page not found', 'Nunta Start')).toBe('Page not found · Nunta Start');
  });
});
