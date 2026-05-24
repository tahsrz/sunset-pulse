import { z } from 'zod';

export const EventTypeTranslationScalarFieldEnumSchema = z.enum(['uid','eventTypeId','field','sourceLocale','targetLocale','translatedText','createdAt','createdBy','updatedAt','updatedBy']);

export default EventTypeTranslationScalarFieldEnumSchema;
