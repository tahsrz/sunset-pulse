import React from 'react';
import type { CmsPageDraft } from '@/lib/cms/pages/pageSchema';

export function PresentationLinks({
  links,
}: {
  links: NonNullable<CmsPageDraft['presentation']>['navigationLinks'];
}) {
  if (!links?.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
      {links.map((link, index) => (
        <li key={index}>
          <a
            href={link.href}
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
