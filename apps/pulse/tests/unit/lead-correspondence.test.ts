import { describe, expect, it } from 'vitest';
import { buildLeadMessageVariables, renderLeadMessage } from '@/lib/lead-generation/leadCorrespondence';

const lead = {
  first_name: 'Jordan', last_name: 'Lee', name: 'Jordan Lee', property_address: '100 Main St', mailing_address: 'PO Box 9',
  metadata: { discovery: { totalValue: 425000, yearsHeld: 12 } },
} as never;

describe('lead correspondence', () => {
  it('builds and formats approved lead variables', () => {
    expect(buildLeadMessageVariables(lead, 'Taylor Agent')).toEqual({
      owner_name: 'Jordan Lee', first_name: 'Jordan', property_address: '100 Main St', mailing_address: 'PO Box 9',
      market_value: '$425,000', years_held: '12', agent_name: 'Taylor Agent',
      brokerage_name: '', agent_phone: '', agent_email: '', license_number: '', signature: 'Taylor Agent',
    });
  });

  it('renders known fields and reports missing values', () => {
    const variables = { ...buildLeadMessageVariables(lead, 'Taylor Agent'), market_value: '' };
    const result = renderLeadMessage('Hello {{ first_name }} at {{property_address}}: {{market_value}}', variables);
    expect(result.text).toBe('Hello Jordan at 100 Main St: ');
    expect(result.missing).toEqual(['market_value']);
  });

  it('preserves and reports unknown fields', () => {
    const result = renderLeadMessage('Hello {{owner_name}} {{secret_field}}', buildLeadMessageVariables(lead, 'Taylor Agent'));
    expect(result.text).toContain('{{secret_field}}');
    expect(result.unknown).toEqual(['secret_field']);
  });
});
