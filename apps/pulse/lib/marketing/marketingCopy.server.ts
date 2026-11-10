import 'server-only';
import marketingCopy from '@/config/marketing_copy.json';
import { marketingCopySchema } from './marketingCopySchema';

export function loadMarketingCopy() {
  return marketingCopySchema.parse(marketingCopy);
}
