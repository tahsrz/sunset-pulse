import { z } from 'zod';

export const FilterSegmentScopeSchema = z.enum(['USER','TEAM']);

export type FilterSegmentScopeType = `${z.infer<typeof FilterSegmentScopeSchema>}`

export default FilterSegmentScopeSchema;
