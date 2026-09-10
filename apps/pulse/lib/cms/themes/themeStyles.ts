import type { CSSProperties } from 'react';

export function cmsThemeStyle(cssVars?: Readonly<Record<string, string>>, body = 'system-ui, sans-serif'): CSSProperties {
  return {
    ...cssVars,
    fontFamily: `var(--font-family-body, ${body})`,
    fontSize: 'var(--font-size-base, 16px)',
    fontWeight: 'var(--font-weight-normal, 400)',
  } as CSSProperties;
}
