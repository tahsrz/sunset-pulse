export const FALLBACK_AGENT_ID = 'taz-realty-001';

const AGENT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-_]{0,62}[a-z0-9])?$/;

export type AgentScopedInput = {
  agentId?: string | null;
};

export type AgentProfile = {
  displayName: string;
  brokerageName: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  markets: string[];
  headshotUrl?: string;
  officeAddress?: string;
};

export type AssistantProfile = {
  displayName: string;
  roleLabel: string;
  tone: string;
  statusLabel: string;
  placeholder: string;
  toolActionLabel: string;
};

export type ComplianceProfile = {
  jurisdiction: string;
  footerDisclaimer: string;
  mlsDisclaimer: string;
  equalHousing: boolean;
};

export type IntegrationProfile = {
  mlsProvider?: string;
  leadEmail?: string;
  calendarUrl?: string;
  crmTag?: string;
  hotListMlsIds?: string[];
};

export const defaultAgentProfile: AgentProfile = {
  displayName: 'Tahsin Reza',
  brokerageName: 'Lion Drive Realty',
  email: 'tahsin.reza817@gmail.com',
  markets: ['North Texas'],
};

export const defaultAssistantProfile: AssistantProfile = {
  displayName: 'Jamie',
  roleLabel: 'Analyst Online',
  tone: 'warm, practical, local, and direct',
  statusLabel: 'working',
  placeholder: 'Ask Jamie...',
  toolActionLabel: 'Jamie action',
};

export const defaultComplianceProfile: ComplianceProfile = {
  jurisdiction: 'Texas',
  footerDisclaimer: 'Information is deemed reliable but not guaranteed. Verify all details with the listing broker and applicable MLS disclosures.',
  mlsDisclaimer: 'MLS data is provided for consumer property search and should be independently verified.',
  equalHousing: true,
};

export const defaultIntegrationProfile: IntegrationProfile = {
  mlsProvider: 'NTREIS',
  leadEmail: 'tahsin.reza817@gmail.com',
  crmTag: 'sunset-pulse',
  hotListMlsIds: [],
};

export function mergeAgentProfile(value?: Partial<AgentProfile> | null): AgentProfile {
  return {
    ...defaultAgentProfile,
    ...(value || {}),
    markets: Array.isArray(value?.markets) && value.markets.length ? value.markets : defaultAgentProfile.markets,
  };
}

export function mergeAssistantProfile(value?: Partial<AssistantProfile> | null): AssistantProfile {
  return {
    ...defaultAssistantProfile,
    ...(value || {}),
  };
}

export function mergeComplianceProfile(value?: Partial<ComplianceProfile> | null): ComplianceProfile {
  return {
    ...defaultComplianceProfile,
    ...(value || {}),
  };
}

export function mergeIntegrationProfile(value?: Partial<IntegrationProfile> | null): IntegrationProfile {
  return {
    ...defaultIntegrationProfile,
    ...(value || {}),
    hotListMlsIds: Array.isArray(value?.hotListMlsIds)
      ? value.hotListMlsIds.map(String).map((id) => id.trim()).filter(Boolean)
      : defaultIntegrationProfile.hotListMlsIds,
  };
}

export function normalizeAgentId(value: string | null | undefined): string | null {
  const agentId = value?.trim().toLowerCase();
  if (!agentId || !AGENT_ID_PATTERN.test(agentId)) return null;
  return agentId;
}

export function getDefaultAgentId(env: NodeJS.ProcessEnv = process.env): string {
  return (
    normalizeAgentId(env.NEXT_PUBLIC_DEFAULT_AGENT_ID) ||
    normalizeAgentId(env.DEFAULT_AGENT_ID) ||
    FALLBACK_AGENT_ID
  );
}

export function getAgentIdFromInput(input: AgentScopedInput = {}, env: NodeJS.ProcessEnv = process.env): string {
  return normalizeAgentId(input.agentId) || getDefaultAgentId(env);
}

export function getAgentIdFromHeaders(headers: Headers, env: NodeJS.ProcessEnv = process.env): string {
  return (
    normalizeAgentId(headers.get('x-sunset-agent-id')) ||
    normalizeAgentId(headers.get('x-sunset-tenant-agent-id')) ||
    getDefaultAgentId(env)
  );
}
