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
  mainBackground?: string;
  navBackground?: string;
  quadrants?: LaunchKitQuadrants;
  visualLoci?: LaunchKitVisualLoci;
};

export type LaunchKitQuadrantStyle = {
  background: string;
  color: string;
};

export type LaunchKitQuadrants = {
  topLeft: LaunchKitQuadrantStyle;
  topRight: LaunchKitQuadrantStyle;
  bottomLeft: LaunchKitQuadrantStyle;
  bottomRight: LaunchKitQuadrantStyle;
};

export type LaunchKitVisualLoci = {
  source: 'dictionary' | 'extracted';
  name: string;
  sourceId?: string;
  tone?: string;
  pacing?: string;
};

export type LaunchKitHero = {
  title: string;
  subtitle: string;
  backgroundImage?: string;
};

export type AgentLaunchKit = {
  agentId: string;
  ownerId?: string;
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
  billingProfile: LaunchKitBillingProfile;
  reviewProfile: LaunchKitReviewProfile;
  provisioningAudit: LaunchKitProvisioningAuditEvent[];
};

export type AgentLaunchKitResponse = {
  kit: AgentLaunchKit;
  publicUrl: string;
  readiness: SiteReadinessCheck[];
  readyToPublish: boolean;
  publishGate: LaunchKitPublishGate;
};

export type LaunchKitBillingProfile = {
  userId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  trialEndsAt?: string;
  billingStatus: 'unknown' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
};

export type LaunchKitReviewProfile = {
  status: 'not_started' | 'setup_saved' | 'requested' | 'in_review' | 'approved' | 'changes_requested';
  requestedAt?: string;
  requestedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
};

export type LaunchKitProvisioningAuditEvent = {
  id: string;
  occurredAt: string;
  action: string;
  source: string;
  status: 'received' | 'succeeded' | 'failed' | 'skipped';
  message: string;
  actor?: string;
  stripeCheckoutSessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingStatus?: LaunchKitBillingProfile['billingStatus'];
  siteStatus?: AgentLaunchKit['status'];
  savedStores?: string[];
};

export type LaunchKitPublishGate = {
  allowed: boolean;
  checks: Array<{
    key: string;
    label: string;
    complete: boolean;
  }>;
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
const hexColorSchema = z.string().trim().regex(/^#[0-9a-f]{6}$/i);
const visualLociSchema = z.object({
  source: z.enum(['dictionary', 'extracted']),
  name: z.string().trim().min(1).max(120),
  sourceId: optionalStringSchema,
  tone: optionalStringSchema,
  pacing: optionalStringSchema,
}).optional();
const quadrantStyleSchema = z.object({
  background: hexColorSchema,
  color: hexColorSchema,
});
const quadrantsSchema = z.object({
  topLeft: quadrantStyleSchema,
  topRight: quadrantStyleSchema,
  bottomLeft: quadrantStyleSchema,
  bottomRight: quadrantStyleSchema,
}).optional();
const billingProfileSchema = z.object({
  userId: optionalStringSchema,
  stripeCustomerId: optionalStringSchema,
  stripeSubscriptionId: optionalStringSchema,
  stripeCheckoutSessionId: optionalStringSchema,
  trialEndsAt: optionalStringSchema,
  billingStatus: z.enum(['unknown', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete']).default('unknown'),
});
const reviewProfileSchema = z.object({
  status: z.enum(['not_started', 'setup_saved', 'requested', 'in_review', 'approved', 'changes_requested']).default('not_started'),
  requestedAt: optionalStringSchema,
  requestedBy: optionalStringSchema,
  reviewedAt: optionalStringSchema,
  reviewedBy: optionalStringSchema,
  notes: optionalStringSchema,
});
const provisioningAuditEventSchema = z.object({
  id: z.string().trim().min(1).max(120),
  occurredAt: optionalStringSchema,
  action: z.string().trim().min(1).max(120),
  source: z.string().trim().min(1).max(120),
  status: z.enum(['received', 'succeeded', 'failed', 'skipped']).default('received'),
  message: z.string().trim().min(1).max(500),
  actor: optionalStringSchema,
  stripeCheckoutSessionId: optionalStringSchema,
  stripeCustomerId: optionalStringSchema,
  stripeSubscriptionId: optionalStringSchema,
  billingStatus: z.enum(['unknown', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete']).optional(),
  siteStatus: statusSchema.optional(),
  savedStores: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

export const agentLaunchKitSchema = z.object({
  agentId: z.string().trim().toLowerCase().min(2).max(64).regex(/^[a-z0-9](?:[a-z0-9-_]{0,62}[a-z0-9])?$/),
  ownerId: optionalStringSchema,
  ownerName: z.string().trim().min(2).max(120),
  subdomain: z.string().trim().toLowerCase().min(2).max(63).regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
  customDomain: optionalStringSchema,
  status: statusSchema,
  subscriptionTier: subscriptionTierSchema,
  branding: z.object({
    siteName: z.string().trim().min(2).max(120),
    primaryColor: hexColorSchema,
    fontFamily: z.string().trim().min(2).max(80),
    mainBackground: hexColorSchema.optional(),
    navBackground: hexColorSchema.optional(),
    quadrants: quadrantsSchema,
    visualLoci: visualLociSchema,
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
  billingProfile: billingProfileSchema,
  reviewProfile: reviewProfileSchema,
  provisioningAudit: z.array(provisioningAuditEventSchema).max(80).default([]),
});

export function createDefaultLaunchKit(agentIdInput?: string | null): AgentLaunchKit {
  const agentId = normalizeAgentId(agentIdInput) || 'taz-realty-001';
  const subdomain = getAgentSiteSubdomain(agentId);
  const agentProfile = mergeAgentProfile(defaultAgentProfile);
  const assistantProfile = mergeAssistantProfile(defaultAssistantProfile);

  return {
    agentId,
    ownerId: '',
    ownerName: agentProfile.displayName,
    subdomain,
    status: 'draft',
    subscriptionTier: 'site',
    branding: {
      siteName: `${agentProfile.displayName} Homes`,
      primaryColor: '#2563eb',
      fontFamily: 'Inter',
      mainBackground: '#0f172a',
      navBackground: '#1e293b',
      quadrants: {
        topLeft: { background: '#0f172a', color: '#f8fafc' },
        topRight: { background: '#1e293b', color: '#f8fafc' },
        bottomLeft: { background: '#1e293b', color: '#f8fafc' },
        bottomRight: { background: '#0f172a', color: '#f8fafc' },
      },
      visualLoci: {
        source: 'dictionary',
        name: 'Dark Mode',
        sourceId: 'Dark Mode',
      },
    },
    hero: {
      title: `${agentProfile.displayName}'s local home search`,
      subtitle: `Explore listings, request tours, and get local market context from ${assistantProfile.displayName}.`,
    },
    agentProfile,
    assistantProfile,
    complianceProfile: mergeComplianceProfile(defaultComplianceProfile),
    integrationProfile: mergeIntegrationProfile(defaultIntegrationProfile),
    billingProfile: {
      billingStatus: 'unknown',
    },
    reviewProfile: {
      status: 'not_started',
    },
    provisioningAudit: [],
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
  const billingProfile = value.billingProfile || value.billing_profile || fallback.billingProfile;
  const reviewProfile = value.reviewProfile || value.review_profile || fallback.reviewProfile;
  const provisioningAudit = value.provisioningAudit || value.provisioning_audit || fallback.provisioningAudit;

  return agentLaunchKitSchema.parse({
    agentId,
    ownerId: value.ownerId || value.owner_id || billingProfile.userId || fallback.ownerId || '',
    ownerName: value.ownerName || value.owner_name || agentProfile.displayName || fallback.ownerName,
    subdomain,
    customDomain: value.customDomain || value.custom_domain || '',
    status: value.status || fallback.status,
    subscriptionTier: value.subscriptionTier || value.subscription_tier || fallback.subscriptionTier,
    branding: {
      siteName: branding.siteName || fallback.branding.siteName,
      primaryColor: branding.primaryColor || fallback.branding.primaryColor,
      fontFamily: branding.fontFamily || fallback.branding.fontFamily,
      mainBackground: branding.mainBackground || fallback.branding.mainBackground,
      navBackground: branding.navBackground || fallback.branding.navBackground,
      quadrants: normalizeQuadrants(branding.quadrants, fallback.branding.quadrants),
      visualLoci: branding.visualLoci || fallback.branding.visualLoci,
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
    billingProfile: {
      userId: billingProfile.userId || value.ownerId || value.owner_id || fallback.billingProfile.userId || '',
      stripeCustomerId: billingProfile.stripeCustomerId || billingProfile.stripe_customer_id || fallback.billingProfile.stripeCustomerId || '',
      stripeSubscriptionId: billingProfile.stripeSubscriptionId || billingProfile.stripe_subscription_id || fallback.billingProfile.stripeSubscriptionId || '',
      stripeCheckoutSessionId: billingProfile.stripeCheckoutSessionId || billingProfile.stripe_checkout_session_id || fallback.billingProfile.stripeCheckoutSessionId || '',
      trialEndsAt: billingProfile.trialEndsAt || billingProfile.trial_ends_at || fallback.billingProfile.trialEndsAt || '',
      billingStatus: billingProfile.billingStatus || billingProfile.billing_status || fallback.billingProfile.billingStatus || 'unknown',
    },
    reviewProfile: {
      status: reviewProfile.status || reviewProfile.review_status || fallback.reviewProfile.status || 'not_started',
      requestedAt: reviewProfile.requestedAt || reviewProfile.requested_at || fallback.reviewProfile.requestedAt || '',
      requestedBy: reviewProfile.requestedBy || reviewProfile.requested_by || fallback.reviewProfile.requestedBy || '',
      reviewedAt: reviewProfile.reviewedAt || reviewProfile.reviewed_at || fallback.reviewProfile.reviewedAt || '',
      reviewedBy: reviewProfile.reviewedBy || reviewProfile.reviewed_by || fallback.reviewProfile.reviewedBy || '',
      notes: reviewProfile.notes || fallback.reviewProfile.notes || '',
    },
    provisioningAudit: normalizeProvisioningAudit(provisioningAudit),
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

  const publishGate = getLaunchKitPublishGate(kit, readiness);

  return {
    kit,
    publicUrl,
    readiness,
    readyToPublish: publishGate.allowed,
    publishGate,
  };
}

export function getLaunchKitPublishGate(
  kit: AgentLaunchKit,
  readiness: SiteReadinessCheck[] = getSiteReadinessChecks({
    siteName: kit.branding.siteName,
    agentProfile: kit.agentProfile,
    complianceProfile: kit.complianceProfile,
    integrationProfile: kit.integrationProfile,
  }),
): LaunchKitPublishGate {
  const trialEndsAt = kit.billingProfile.trialEndsAt || '';
  const billingStatus = kit.billingProfile.billingStatus;
  const billingCurrent = billingStatus === 'active' || (
    billingStatus === 'trialing' && (!trialEndsAt || new Date(trialEndsAt).getTime() > Date.now())
  );
  const checks = [
    ...readiness,
    {
      key: 'billing',
      label: 'Paid or trialing billing profile',
      complete: billingCurrent,
    },
    {
      key: 'review',
      label: 'Operator approval',
      complete: kit.reviewProfile.status === 'approved',
    },
  ];

  return {
    allowed: checks.every((check) => check.complete),
    checks,
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
    owner_id: kit.ownerId || kit.billingProfile.userId || null,
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
    billing_profile: kit.billingProfile,
    review_profile: kit.reviewProfile,
    provisioning_audit: kit.provisioningAudit,
    sections: defaultAgentSiteSections,
    last_modified_by: getUpdatedByLabel(updatedBy),
    updated_at: new Date().toISOString(),
  };
}

export function toSiteConfigMongoRecord(kit: AgentLaunchKit, updatedBy: unknown) {
  return {
    agentId: kit.agentId,
    ownerId: kit.ownerId || kit.billingProfile.userId || undefined,
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
    billingProfile: kit.billingProfile,
    reviewProfile: kit.reviewProfile,
    provisioningAudit: kit.provisioningAudit,
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

function normalizeQuadrants(value: any, fallback?: LaunchKitQuadrants): LaunchKitQuadrants | undefined {
  if (!fallback) return undefined;

  return {
    topLeft: normalizeQuadrantStyle(value?.topLeft, fallback.topLeft),
    topRight: normalizeQuadrantStyle(value?.topRight, fallback.topRight),
    bottomLeft: normalizeQuadrantStyle(value?.bottomLeft, fallback.bottomLeft),
    bottomRight: normalizeQuadrantStyle(value?.bottomRight, fallback.bottomRight),
  };
}

function normalizeQuadrantStyle(value: any, fallback: LaunchKitQuadrantStyle): LaunchKitQuadrantStyle {
  return {
    background: isHexColor(value?.background) ? value.background : fallback.background,
    color: isHexColor(value?.color) ? value.color : fallback.color,
  };
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function normalizeProvisioningAudit(value: unknown): LaunchKitProvisioningAuditEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((event) => provisioningAuditEventSchema.safeParse(event))
    .filter((result): result is z.SafeParseSuccess<LaunchKitProvisioningAuditEvent> => result.success)
    .map((result) => ({
      ...result.data,
      occurredAt: normalizeAuditDate(result.data.occurredAt),
    }))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 80);
}

function normalizeAuditDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}
