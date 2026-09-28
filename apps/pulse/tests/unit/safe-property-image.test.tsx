import React from 'react';
import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <span
      role="img"
      aria-label={props.alt}
      data-src={props.src}
      onClick={() => props.onError?.({} as React.SyntheticEvent<HTMLImageElement>)}
    />
  ),
}));

import SafePropertyImage from '@/components/SafePropertyImage';

afterEach(cleanup);

describe('SafePropertyImage', () => {
  it('describes an API-supplied placeholder as unavailable, not a real listing photo', () => {
    render(<SafePropertyImage src="/images/property-placeholder.svg" fallbackSrc="/images/property-placeholder.svg"
      fallbackAlt="Photo unavailable" alt="Listing photo" width={640} height={360} />);
    expect(screen.getByRole('img', { name: 'Photo unavailable' })).toBeInTheDocument();
  });
  it('uses the supplied accessible description after the property photo fails', async () => {
    render(
      <SafePropertyImage
        src="https://images.example.test/home.jpg"
        fallbackSrc="/images/property-placeholder.svg"
        fallbackAlt="Listing photo unavailable for 10 Main Street"
        alt="10 Main Street listing photo"
        width={640}
        height={360}
      />,
    );

    fireEvent.click(screen.getByRole('img', { name: '10 Main Street listing photo' }));
    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Listing photo unavailable for 10 Main Street' }))
        .toHaveAttribute('data-src', '/images/property-placeholder.svg');
    });
  });

  it('describes the placeholder when the listing has no source photo', () => {
    render(
      <SafePropertyImage
        src={null}
        fallbackSrc="/images/property-placeholder.svg"
        fallbackAlt="Listing photo unavailable for this property"
        alt="Listing photo"
        width={640}
        height={360}
      />,
    );

    expect(screen.getByRole('img', { name: 'Listing photo unavailable for this property' }))
      .toHaveAttribute('data-src', '/images/property-placeholder.svg');
  });
});
