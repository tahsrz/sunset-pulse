import { Property } from '@/lib/types';

const number = new Intl.NumberFormat('en-US');

export default function PropertySpecs({ property }: { property: Property }) {
  const isRV = property.type === 'RV' || property.type === 'RV Park';
  const isCommercial = property.type === 'Commercial Sale' || property.type === 'Commercial Lease';
  const specs = isRV
    ? [
        { label: 'RV type', value: property.rv_type },
        { label: 'Length', value: property.rv_length && property.rv_length > 0 ? `${number.format(property.rv_length)} ft` : null },
        { label: 'Electric hookup', value: property.hookups?.electric },
        { label: 'Water hookup', value: property.hookups?.water ? 'Available' : null },
        { label: 'Sewer hookup', value: property.hookups?.sewer ? 'Available' : null },
      ]
    : [
        { label: 'Bedrooms', value: !isCommercial && property.beds && property.beds > 0 ? number.format(property.beds) : null },
        { label: 'Bathrooms', value: !isCommercial && property.baths && property.baths > 0 ? number.format(property.baths) : null },
        { label: isCommercial ? 'Building area' : 'Square footage', value: property.square_feet && property.square_feet > 0 ? `${number.format(property.square_feet)} sq ft` : null },
      ];
  const knownSpecs = specs.filter(({ value }) => value);

  if (!knownSpecs.length && !property.description?.trim()) return null;

  return (
    <section aria-labelledby="property-details-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="property-details-heading" className="text-xl font-semibold !not-italic !normal-case text-slate-900">About this property</h2>
      {knownSpecs.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 border-b border-slate-200 pb-4">
          {knownSpecs.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-sm text-slate-600">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {property.description?.trim() && <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-700 sm:text-base">{property.description}</p>}
    </section>
  );
}
