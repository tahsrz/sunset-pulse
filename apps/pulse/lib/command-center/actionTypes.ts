export type CommandActionKind = 'external-link' | 'copy' | 'command' | 'saved';

export type CommandActionItem = {
  id: string;
  label: string;
  description: string;
  kind: CommandActionKind;
  href?: string;
  copyText?: string;
  command?: string;
};

export type CivicServiceRecord = {
  category: string;
  status: string;
  outcome: string;
  location: string;
  reported: string;
  coordinates: string;
  serviceRequest: string;
  lookupUrl: string;
};

export type SaveCommandActionInput = {
  commandId: string;
  command: string;
  workerId?: string;
  action: CommandActionItem;
};
