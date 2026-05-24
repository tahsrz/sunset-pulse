import { z } from 'zod';

export const SelectedCalendarScalarFieldEnumSchema = z.enum(['id','userId','integration','externalId','credentialId','createdAt','updatedAt','googleChannelId','googleChannelKind','googleChannelResourceId','googleChannelResourceUri','googleChannelExpiration','channelId','channelKind','channelResourceId','channelResourceUri','channelExpiration','syncSubscribedAt','syncSubscribedErrorAt','syncSubscribedErrorCount','syncToken','syncedAt','syncErrorAt','syncErrorCount','delegationCredentialId','error','lastErrorAt','watchAttempts','unwatchAttempts','maxAttempts','eventTypeId']);

export default SelectedCalendarScalarFieldEnumSchema;
