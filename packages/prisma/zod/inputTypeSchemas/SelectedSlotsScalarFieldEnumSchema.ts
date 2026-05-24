import { z } from 'zod';

export const SelectedSlotsScalarFieldEnumSchema = z.enum(['id','eventTypeId','userId','slotUtcStartDate','slotUtcEndDate','uid','releaseAt','isSeat']);

export default SelectedSlotsScalarFieldEnumSchema;
