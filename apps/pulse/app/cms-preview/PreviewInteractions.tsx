'use client';

import React from 'react';

/** Keep disclosures usable while preventing navigation and form submission in previews. */
export function PreviewInteractions({ children }: { children: React.ReactNode }) {
  return <div data-cms-preview onClickCapture={(event) => {
    if (event.target instanceof Element && event.target.closest('a')) event.preventDefault();
  }} onSubmitCapture={(event) => event.preventDefault()}>{children}</div>;
}
