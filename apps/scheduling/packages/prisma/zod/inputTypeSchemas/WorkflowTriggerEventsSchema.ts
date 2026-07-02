import { z } from 'zod';

export const WorkflowTriggerEventsSchema = z.enum(['BEFORE_EVENT','EVENT_CANCELLED','NEW_EVENT','RESCHEDULE_EVENT','AFTER_EVENT','BOOKING_REJECTED','BOOKING_REQUESTED','BOOKING_PAYMENT_INITIATED','BOOKING_PAID','BOOKING_NO_SHOW_UPDATED','AFTER_HOSTS_CAL_VIDEO_NO_SHOW','AFTER_GUESTS_CAL_VIDEO_NO_SHOW','FORM_SUBMITTED']);

export type WorkflowTriggerEventsType = `${z.infer<typeof WorkflowTriggerEventsSchema>}`

export default WorkflowTriggerEventsSchema;
