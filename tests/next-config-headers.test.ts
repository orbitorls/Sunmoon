import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `next.config.mjs` is ESM, so it is asserted as text here rather than imported
 * (the Jest transform runs CommonJS). The invariant under test is the ORDER of
 * the `headers()` rules: Next.js applies every matching rule in array order and
 * the last match wins for a given header key, so rules must run general ->
 * specific. Getting this backwards silently disables the specific caching rules.
 */
const config = readFileSync(join(__dirname, '..', 'next.config.mjs'), 'utf8');

function sourcePatterns(): string[] {
  return [...config.matchAll(/source:\s*"([^"]+)"/g)].map((match) => match[1]);
}

describe('next.config.mjs cache header rules', () => {
  it('orders header rules general -> specific (last match wins)', () => {
    const patterns = sourcePatterns();
    const position = (pattern: string) => patterns.indexOf(pattern);

    expect(patterns).toContain('/:path*');
    expect(patterns).toContain('/api/(.*)');

    expect(position('/api/(.*)')).toBeGreaterThan(position('/:path*'));
    expect(position('/api/tiles/(.*)')).toBeGreaterThan(position('/api/(.*)'));
    expect(position('/api/(predict-tide|hydro-tide)')).toBeGreaterThan(position('/api/(.*)'));
    expect(position('/_next/static/:path*')).toBeGreaterThan(position('/:path*'));
  });

  it('caches tiles hard and tide predictions at the CDN', () => {
    expect(config).toContain('public, max-age=2592000, s-maxage=604800');
    expect(config).toContain('public, s-maxage=900, stale-while-revalidate=3600');
    expect(config).toContain('public, max-age=31536000, immutable');
  });
});
