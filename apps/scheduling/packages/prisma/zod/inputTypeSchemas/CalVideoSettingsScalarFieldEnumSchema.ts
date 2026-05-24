import { z } from 'zod';

export const CalVideoSettingsScalarFieldEnumSchema = z.enum(['eventTypeId','disableRecordingForOrganizer','disableRecordingForGuests','enableAutomaticTranscription','enableAutomaticRecordingForOrganizer','redirectUrlOnExit','disableTranscriptionForGuests','disableTranscriptionForOrganizer','requireEmailForGuests','createdAt','updatedAt']);

export default CalVideoSettingsScalarFieldEnumSchema;
