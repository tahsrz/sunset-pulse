import { z } from 'zod';

export const CalendarCacheEventScalarFieldEnumSchema = z.enum(['id','selectedCalendarId','externalId','externalEtag','iCalUID','iCalSequence','summary','description','location','start','end','isAllDay','timeZone','status','recurringEventId','originalStartTime','createdAt','updatedAt','externalCreatedAt','externalUpdatedAt']);

export default CalendarCacheEventScalarFieldEnumSchema;
