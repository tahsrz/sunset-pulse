import { z } from 'zod';

export const RedirectTypeSchema = z.enum(['UserEventType','TeamEventType','User','Team']);

export type RedirectTypeType = `${z.infer<typeof RedirectTypeSchema>}`

export default RedirectTypeSchema;
