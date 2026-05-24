import { z } from 'zod';

/////////////////////////////////////////
// USER HOLIDAY SETTINGS SCHEMA
/////////////////////////////////////////

export const UserHolidaySettingsSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  countryCode: z.string().nullable(),
  disabledIds: z.string().array(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserHolidaySettings = z.infer<typeof UserHolidaySettingsSchema>

export default UserHolidaySettingsSchema;
