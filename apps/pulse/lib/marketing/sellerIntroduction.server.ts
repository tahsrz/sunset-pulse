import 'server-only';

import sellerIntroduction from '@/content/marketing/seller-introduction.v1.json';
import { sellerIntroductionSchema, type PublishedSellerIntroduction } from '@/lib/marketing/sellerIntroductionSchema';

export function loadSellerIntroduction() {
  return sellerIntroductionSchema.parse(sellerIntroduction);
}

export function getPublishedSellerIntroduction(): PublishedSellerIntroduction | null {
  const profile = loadSellerIntroduction();
  return profile.status === 'published' ? profile : null;
}
