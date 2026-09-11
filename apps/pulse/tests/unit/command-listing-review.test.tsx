import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandListingReview } from '@/components/command-center/results/CommandListingReview';

const facts = {
  isListingLike: true,
  confidence: 92,
  extractedFields: ['address', 'price'],
  address: '123 Main Street',
  price: '$450,000',
  beds: '3',
  baths: '2',
  sqft: '1,800',
  propertyType: 'Single family',
  status: 'Active',
  mlsId: 'MLS-1',
  features: ['updated kitchen'],
  hooks: ['walkable location'],
  warnings: [],
  missingFields: [],
};

describe('shared listing review', () => {
  it('preserves edited facts in the explicit rerun command', () => {
    const onApplyAndRerun = vi.fn();
    render(<CommandListingReview listingFacts={facts} sourceCommand="raw listing" running={false} onApplyAndRerun={onApplyAndRerun} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit facts/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Approved Address' }), { target: { value: '456 Oak Avenue' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply facts and rerun/ }));
    expect(onApplyAndRerun).toHaveBeenCalledWith(expect.stringContaining('Address: 456 Oak Avenue'));
    expect(onApplyAndRerun).toHaveBeenCalledWith(expect.stringContaining('Price: $450,000'));
  });
});
