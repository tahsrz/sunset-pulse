import { z } from 'zod';

export const HostScalarFieldEnumSchema = z.enum(['userId','eventTypeId','isFixed','priority','weight','weightAdjustment','scheduleId','createdAt','groupId','memberId']);

export default HostScalarFieldEnumSchema;
