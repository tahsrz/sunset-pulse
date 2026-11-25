export const landEditorInput = {
  mls_id: 'LAND-TEST-1', street: '100 Test Road', city: 'Keller', state: 'TX', zip: '76244',
  type: 'Land', listing_status: 'Active', price_type: 'sale', price: '250000',
  display_public: 'on', land_details_present: 'on',
  land_marketed_acres: '5', land_surveyed_acres: '4.866',
  land_zoning: 'Residential; city packet dated July 2025.',
  land_development_status: 'Eight conceptual homesites. Plat approval has not been verified.',
  land_constraints: 'Survey identifies a pipeline near the frontage.',
  land_documents: 'City packet | https://example.com/packet.pdf',
};

export const landFacts = {
  marketed_acres: 5, surveyed_acres: 4.866,
  zoning: landEditorInput.land_zoning,
  development_status: landEditorInput.land_development_status,
  constraints: landEditorInput.land_constraints,
  documents: [{ label: 'City packet', url: 'https://example.com/packet.pdf' }],
};
