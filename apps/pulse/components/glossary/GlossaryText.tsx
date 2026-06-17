import React, { type ReactNode } from 'react';
import { lookupGlossaryTerm, siteGlossaryPattern } from '@/lib/glossary/siteGlossary';

type GlossaryTextProps = {
  text?: string | null;
};

export function GlossaryText({ text }: GlossaryTextProps) {
  return <>{renderGlossaryText(text)}</>;
}

export function renderGlossaryText(text?: string | null): ReactNode {
  if (!text) return '';

  return text.split(siteGlossaryPattern).map((part, index) => {
    const entry = lookupGlossaryTerm(part);
    if (!entry) return part;

    const definition = entry.sourceTah
      ? `${entry.definition} Source: ${entry.sourceTah}.`
      : entry.definition;

    const term = (
      <abbr
        key={`${part}-${index}-term`}
        title={definition}
        data-definition={definition}
        data-source-tah={entry.sourceTah || undefined}
        tabIndex={0}
        className="glossary-term"
      >
        {part}
      </abbr>
    );

    if (!entry.href) return term;

    return (
      <a
        key={`${part}-${index}`}
        href={entry.href}
        className="glossary-link"
        aria-label={`${part}: ${definition}`}
      >
        {term}
      </a>
    );
  });
}
