import { WorkflowActions, WorkflowMethods, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";

export { WorkflowTriggerEvents, WorkflowActions, WorkflowTemplates, WorkflowMethods };

export const WORKFLOW_TRIGGER_EVENTS = Object.values(WorkflowTriggerEvents);
export const WORKFLOW_ACTIONS = Object.values(WorkflowActions);
export const WORKFLOW_TEMPLATES = Object.values(WorkflowTemplates);
export const WORKFLOW_METHODS = Object.values(WorkflowMethods);

export const TIME_UNIT = ["day", "hour", "minute"] as const;

export type TimeUnit = (typeof TIME_UNIT)[number];
