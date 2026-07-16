import { z } from 'zod';
import {
  defaultAgentProfile,
  defaultAssistantProfile,
  defaultComplianceProfile,
  defaultIntegrationProfile,
  mergeAgentProfile,
  mergeAssistantProfile,
  mergeComplianceProfile,
  mergeIntegrationProfile,
  normalizeAgentId,
  type AgentProfile,
  type AssistantProfile,
  type ComplianceProfile,
  type IntegrationProfile,
} from '@/lib/sites/agentConfig';
import { getAgentSiteSubdomain, getPublicAgentSiteUrl, normalizeTenantSlug } from '@/lib/sites/siteUrls';
import { getSiteReadinessChecks, type SiteReadinessCheck } from '@/lib/sites/siteReadiness';

export type LaunchKitBranding = {
  siteName: string;
  primaryColor: string;
  fontFamily: string;
};

export type LaunchKitHero = {
  title: string;
  subtitle: string;
  backgroundImage?: string;
};

export type AgentLaunchKit = {
  agentId: string;
  ownerName: string;
  subdomain: string;
  customDomain?: string;
  status: 'draft' | 'active' | 'suspended';
  subscriptionTier: 'starter' | 'site' | 'atlas' | 'enterprise';
  branding: LaunchKitBranding;
  hero: LaunchKitHero;
  agentProfile: AgentProfile;
  assistantProfile: AssistantProfile;
  complianceProfile: ComplianceProfile;
  integrationProfile: IntegrationProfile;
};

export type AgentLaunchKitResponse = {
  kit: AgentLaunchKit;
  publicUrl: string;
  readiness: SiteReadinessCheck[];
  readyToPublish: boolean;
};

const statusSchema = z.enum(['draft', 'active', 'suspended']).default('draft');
const subscriptionTierSchema = z.enum(['starter', 'site', 'atlas', 'enterprise']).default('site');
const optionalStringSchema = z.preprocess(
  trimOptionalString,
  z.string().optional(),
);
const optionalUrlSchema = z.preprocess(
  trimOptionalString,
  z.string().url().optional().or(z.literal('')),
);

export const agentLaunchKitSchema = z.object({
  agentId: z.string().trim().toLowerCase().min(2).max(64).regex(/^[a-z0-9](?:[a-z0-9-_]{0,62}[a-z0-9])?$/),
  ownerName: z.string().trim().min(2).max(120),
  subdomain: z.string().trim().toLowerCase().min(2).max(63).regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
  customDomain: optionalStringSchema,
  status: statusSchema,
  subscriptionTier: subscriptionTierSchema,
  branding: z.object({
    siteName: z.string().trim().min(2).max(120),
    primaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i),
    fontFamily: z.string().trim().min(2).max(80),
  }),
  hero: z.object({
    title: z.string().trim().min(2).max(160),
    subtitle: z.string().trim().min(2).max(260),
    backgroundImage: optionalUrlSchema,
  }),
  agentProfile: z.object({
    displayName: z.string().trim().min(2).max(120),
    brokerageName: z.string().trim().min(2).max(120),
    licenseNumber: optionalStringSchema,
    phone: optionalStringSchema,
    email: optionalStringSchema,
    markets: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    headshotUrl: optionalUrlSchema,
    officeAddress: optionalStringSchema,
  }),
  assistantProfile: z.object({
    displayName: z.string().trim().min(2).max(80),
    roleLabel: z.string().trim().min(2).max(120),
    tone: z.string().trim().min(2).max(180),
    statusLabel: z.string().trim().min(2).max(80),
    placeholder: z.string().trim().min(2).max(140),
    toolActionLabel: z.string().trim().min(2).max(80),
  }),
  complianceProfile: z.object({
    jurisdiction: z.string().trim().min(2).max(80),
    footerDisclaimer: z.string().trim().min(8).max(1_500),
    mlsDisclaimer: z.string().trim().min(8).max(1_500),
    equalHousing: z.boolean(),
  }),
  integrationProfile: z.object({
    mlsProvider: optionalStringSchema,
    leadEmail: optionalStringSchema,
    calendarUrl: optionalUrlSchema,
    crmTag: optionalStringSchema,
    hotListMlsIds: z.array(z.string().trim().min(1).max(40)).max(24),
  }),
});

export function createDefaultLaunchKit(agentIdInput?: string | null): AgentLaunchKit {
  const agentId = normalizeAgentId(agentIdInput) || 'taz-realty-001';
  const subdomain = getAgentSiteSubdomain(agentId);
  const agentProfile = mergeAgentProfile(defaultAgentProfile);
  const assistantProfile = mergeAssistantProfile(defaultAssistantProfile);

  return {
    agentId,
    ownerName: agentProfile.displayName,
    subdomain,
    status: 'draft',
    subscriptionTier: 'site',
    branding: {
      siteName: `${agentProfile.displayName} Homes`,
      primaryColor: '#2563eb',
      fontFamily: 'Inter',
    },
    hero: {
      title: `${agentProfile.displayName}'s local home search`,
      subtitle: `Explore listings, request tours, and get local market context from ${assistantProfile.displayName}.`,
    },
    agentProfile,
    assistantProfile,
    complianceProfile: mergeComplianceProfile(defaultComplianceProfile),
    integrationProfile: mergeIntegrationProfile(defaultIntegrationProfile),
  };
}

export function normalizeLaunchKit(input: unknown, fallbackAgentId?: string | null): AgentLaunchKit {
  const value = (input || {}) as Record<string, any>;
  const fallback = createDefaultLaunchKit(fallbackAgentId || value.agentId || value.agent_id);
  const agentProfile = mergeAgentProfile(value.agentProfile || value.agent_profile || fallback.agentProfile);
  const assistantProfile = mergeAssistantProfile(value.assistantProfile || value.assistant_profile || fallback.assistantProfile);
  const complianceProfile = mergeComplianceProfile(value.complianceProfile || value.compliance_profile || fallback.complianceProfile);
  const integrationProfile = mergeIntegrationProfile(value.integrationProfile || value.integration_profile || fallback.integrationProfile);
  const branding = value.branding || fallback.branding;
  const hero = value.hero || fallback.hero;
  const agentId = normalizeAgentId(value.agentId || value.agent_id) || fallback.agentId;
  const subdomain = normalizeTenantSlug(value.subdomain) || getAgentSiteSubdomain(agentId);

  return agentLaunchKitSchema.parse({
    agentId,
    ownerName: value.ownerName || value.owner_name || agentProfile.displayName || fallback.ownerName,
    subdomain,
    customDomain: value.customDomain || value.custom_domain || '',
    status: value.status || fallback.status,
    subscriptionTier: value.subscriptionTier || value.subscription_tier || fallback.subscriptionTier,
    branding: {
      siteName: branding.siteName || fallback.branding.siteName,
      primaryColor: branding.primaryColor || fallback.branding.primaryColor,
      fontFamily: branding.fontFamily || fallback.branding.fontFamily,
    },
    hero: {
      title: hero.title || fallback.hero.title,
      subtitle: hero.subtitle || fallback.hero.subtitle,
      backgroundImage: hero.backgroundImage || '',
    },
    agentProfile,
    assistantProfile,
    complianceProfile,
    integrationProfile,
  }) as AgentLaunchKit;
}

export function getLaunchKitSummary(kit: AgentLaunchKit): AgentLaunchKitResponse {
  const publicUrl = getPublicAgentSiteUrl({
    agentId: kit.agentId,
    subdomain: kit.subdomain,
    customDomain: kit.customDomain,
  });
  const readiness = getSiteReadinessChecks({
    siteName: kit.branding.siteName,
    agentProfile: kit.agentProfile,
    complianceProfile: kit.complianceProfile,
    integrationProfile: kit.integrationProfile,
  });

  return {
    kit,
    publicUrl,
    readiness,
    readyToPublish: readiness.every((check) => check.complete),
  };
}

export function parseListInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toSiteConfigSupabaseRecord(kit: AgentLaunchKit, updatedBy: unknown) {
  return {
    agent_id: kit.agentId,
    owner_name: kit.ownerName,
    subdomain: kit.subdomain,
    custom_domain: kit.customDomain || null,
    status: kit.status,
    subscription_tier: kit.subscriptionTier,
    branding: kit.branding,
    hero: kit.hero,
    agent_profile: kit.agentProfile,
    assistant_profile: kit.assistantProfile,
    compliance_profile: kit.complianceProfile,
    integration_profile: kit.integrationProfile,
    sections: defaultAgentSiteSections,
    last_modified_by: getUpdatedByLabel(updatedBy),
    updated_at: new Date().toISOString(),
  };
}

export function toSiteConfigMongoRecord(kit: AgentLaunchKit, updatedBy: unknown) {
  return {
    agentId: kit.agentId,
    ownerName: kit.ownerName,
    subdomain: kit.subdomain,
    customDomain: kit.customDomain || undefined,
    status: kit.status,
    subscriptionTier: kit.subscriptionTier,
    branding: kit.branding,
    hero: kit.hero,
    agentProfile: kit.agentProfile,
    assistantProfile: kit.assistantProfile,
    complianceProfile: kit.complianceProfile,
    integrationProfile: kit.integrationProfile,
    sections: defaultAgentSiteSections,
    lastModifiedBy: getUpdatedByLabel(updatedBy),
  };
}

const defaultAgentSiteSections = [
  { type: 'hero', visible: true, order: 10 },
  { type: 'featured_listings', visible: true, order: 20 },
  { type: 'about_agent', visible: true, order: 30 },
  { type: 'contact', visible: true, order: 40 },
  { type: 'compliance', visible: true, order: 50 },
];

function getUpdatedByLabel(updatedBy: any) {
  return updatedBy?.email || updatedBy?.name || updatedBy?.role || updatedBy?.userId || 'Launch Kit';
}

function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}
