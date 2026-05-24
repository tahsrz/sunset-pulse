import { z } from 'zod';

export const WebhookScheduledTriggersScalarFieldEnumSchema = z.enum(['id','jobName','subscriberUrl','payload','startAfter','retryCount','createdAt','appId','webhookId','bookingId']);

export default WebhookScheduledTriggersScalarFieldEnumSchema;
