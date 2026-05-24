import { z } from 'zod';

export const AgentScalarFieldEnumSchema = z.enum(['id','name','userId','teamId','providerAgentId','inboundEventTypeId','outboundEventTypeId','enabled','createdAt','updatedAt']);

export default AgentScalarFieldEnumSchema;
