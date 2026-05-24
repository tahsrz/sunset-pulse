import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { FilterSegmentScopeSchema } from '../inputTypeSchemas/FilterSegmentScopeSchema'

/////////////////////////////////////////
// FILTER SEGMENT SCHEMA
/////////////////////////////////////////

export const FilterSegmentSchema = z.object({
  scope: FilterSegmentScopeSchema,
  id: z.number().int(),
  name: z.string(),
  tableIdentifier: z.string(),
  activeFilters: JsonValueSchema.nullable(),
  sorting: JsonValueSchema.nullable(),
  columnVisibility: JsonValueSchema.nullable(),
  columnSizing: JsonValueSchema.nullable(),
  perPage: z.number().int(),
  searchTerm: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.number().int(),
  teamId: z.number().int().nullable(),
})

export type FilterSegment = z.infer<typeof FilterSegmentSchema>

export default FilterSegmentSchema;
