import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeSkeleton, ListSkeleton } from './skeletons';

describe('skeletons', () => {
  it('announce loading once and hide the blocks from assistive tech', () => {
    for (const html of [renderToStaticMarkup(<HomeSkeleton />), renderToStaticMarkup(<ListSkeleton rows={3} />)]) {
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html.match(/sr-only/g)).toHaveLength(1);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('motion-safe:animate-pulse');
    }
  });

  it('renders the requested number of list rows', () => {
    const html = renderToStaticMarkup(<ListSkeleton rows={3} />);
    expect(html.match(/size-5/g)).toHaveLength(3);
  });
});
