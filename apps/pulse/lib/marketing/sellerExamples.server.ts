import 'server-only';

import sellerExamples from '@/content/marketing/seller-examples.v1.json';
import { sellerExampleSchema } from '@/lib/marketing/sellerExampleSchema';

export function getPublishedSellerExample() {
  const example = sellerExampleSchema.parse(sellerExamples);
  return example.status === 'published' ? example : null;
}
