import type { ClientSession } from 'mongoose';
import VibeTaxonomy from '@/models/VibeTaxonomy';
import VibeTerm from '@/models/VibeTerm';
import { VIBE_TAXONOMIES } from './taxonomy';

function words(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ');
}

function label(value: string) {
  return words(value).replace(/\b\w/g, (character) => character.toUpperCase());
}

export function buildControlledTaxonomySeed() {
  return Object.entries(VIBE_TAXONOMIES).map(([group, terms]) => ({
    taxonomy: { slug: group, label: label(group), hierarchical: false },
    terms: terms.map((term) => ({ slug: term, label: label(term), legacyId: `${group}:${term}` })),
  }));
}

export async function seedControlledVibeTaxonomies(input: { tenantId: string; session?: ClientSession }) {
  const seeded = { taxonomies: 0, terms: 0 };
  for (const group of buildControlledTaxonomySeed()) {
    const taxonomy = await VibeTaxonomy.findOneAndUpdate(
      { tenantId: input.tenantId, slug: group.taxonomy.slug },
      { $set: { ...group.taxonomy, status: 'active' }, $setOnInsert: { tenantId: input.tenantId } },
      { new: true, upsert: true, runValidators: true, session: input.session },
    );
    seeded.taxonomies += 1;

    for (const term of group.terms) {
      await VibeTerm.findOneAndUpdate(
        { tenantId: input.tenantId, taxonomyId: taxonomy._id, slug: term.slug },
        { $set: { ...term, label: term.label, status: 'active' }, $setOnInsert: { tenantId: input.tenantId, taxonomyId: taxonomy._id } },
        { new: true, upsert: true, runValidators: true, session: input.session },
      );
      seeded.terms += 1;
    }
  }
  return seeded;
}
