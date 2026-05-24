import { z } from 'zod';

export const WebhookScalarFieldEnumSchema = z.enum(['id','userId','teamId','eventTypeId','platformOAuthClientId','subscriberUrl','payloadTemplate','createdAt','active','eventTriggers','appId','secret','platform','time','timeUnit','version']);

export default WebhookScalarFieldEnumSchema;
