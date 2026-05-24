import { z } from 'zod';

export const SeatChangeLogScalarFieldEnumSchema = z.enum(['id','teamId','changeType','seatCount','userId','triggeredBy','changeDate','monthKey','operationId','processedInProrationId','metadata','createdAt','teamBillingId','organizationBillingId']);

export default SeatChangeLogScalarFieldEnumSchema;
