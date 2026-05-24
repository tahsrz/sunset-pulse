import { z } from 'zod';

export const UserHolidaySettingsScalarFieldEnumSchema = z.enum(['id','userId','countryCode','disabledIds','createdAt','updatedAt']);

export default UserHolidaySettingsScalarFieldEnumSchema;
