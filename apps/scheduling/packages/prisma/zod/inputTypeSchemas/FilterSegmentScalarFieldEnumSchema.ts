import { z } from 'zod';

export const FilterSegmentScalarFieldEnumSchema = z.enum(['id','name','tableIdentifier','scope','activeFilters','sorting','columnVisibility','columnSizing','perPage','searchTerm','createdAt','updatedAt','userId','teamId']);

export default FilterSegmentScalarFieldEnumSchema;
