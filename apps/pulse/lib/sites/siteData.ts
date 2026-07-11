import connectDB from '@/lib/core/database';
import { hasUsableRemoteListingImage, type Listing } from '@/lib/data/listingContract';
import { getTourHotList, resolveTourHotListTargets } from '@/lib/data/tourHotList';
import { supabaseAdmin } from '@/lib/supabase';
import {
  type AgentProfile,
  type AssistantProfile,
  type ComplianceProfile,
  type IntegrationProfile,
  mergeAgentProfile,
  mergeAssistantProfile,
  mergeComplianceProfile,
  mergeIntegrationProfile,
} from '@/lib/sites/agentConfig';
import { getAgentSiteSubdomain, getPublicAgentSiteUrl } from '@/lib/sites/siteUrls';
import { SiteConfig } from '@/models/SiteConfig';

export type TenantSite = {
  site: string;
  agentId: string;
  subdomain?: string;
  customDomain?: string;
  publicUrl: string;
  siteName: string;
  title: string;
  subtitle: string;
  primaryColor: string;
  fontFamily: string;
  backgroundImage?: string;
  status: 'active' | 'draft' | 'suspended';
  isConfigured: boolean;
  isPublished: boolean;
  ownerName: string;
  agentProfile: AgentProfile;
  assistantProfile: AssistantProfile;
  complianceProfile: ComplianceProfile;
  integrationProfile: IntegrationProfile;
  sections: Array<{ type: string; visible?: boolean; order?: number }>;
};

export type AgentTenantSite = TenantSite & {
  featuredListings: Listing[];
};

const DEFAULT_AGENT_SITE_SECTIONS = [
  { type: 'hero', visible: true, order: 10 },
  { type: 'featured_listings', visible: true, order: 20 },
  { type: 'about_agent', visible: true, order: 30 },
  { type: 'contact', visible: true, order: 40 },
  { type: 'compliance', visible: true, order: 50 },
];

export async function getTenantSite(site: string): Promise<TenantSite> {
  const fallback = createFallbackTenantSite(site);

  try {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('*')
      .or(`subdomain.eq.${escapePostgrestValue(site)},agent_id.eq.${escapePostgrestValue(site)},agent_id.eq.${escapePostgrestValue(`${site}-site`)}`)
      .maybeSingle();

    if (error) {
      console.warn('[TENANT_SITE_SUPABASE_LOOKUP]', error.message);
    }

    if (data) {
      return normalizeTenantSite(site, data, fallback);
    }
  } catch (error) {
    console.warn('[TENANT_SITE_SUPABASE_FALLBACK]', error);
  }

  try {
    await connectDB();

    const config: any = await SiteConfig.findOne({
      $or: [
        { subdomain: site },
        { agentId: site },
        { agentId: `${site}-site` },
      ],
    }).lean();

    if (!config) return fallback;

    return normalizeTenantSite(site, config, fallback);
  } catch (error) {
    console.error('[TENANT_SITE_DATA_ERROR]', error);
    return fallback;
  }
}

export async function getAgentTenantSite(site: string, options: { limit?: number } = {}): Promise<AgentTenantSite> {
  const tenantSite = await getTenantSite(site);
  const configuredMlsIds = tenantSite.integrationProfile.hotListMlsIds || [];
  const result = configuredMlsIds.length > 0
    ? await resolveTourHotListTargets(
      configuredMlsIds.map((value) => ({ kind: 'mlsId' as const, value })),
      { limit: options.limit || 6 },
    )
    : await getTourHotList({ limit: options.limit || 6 });

  return {
    ...tenantSite,
    featuredListings: result.listings.filter(hasUsableRemoteListingImage),
  };
}

function normalizeTenantSite(site: string, config: any, fallback: TenantSite): TenantSite {
  const branding = config.branding || {};
  const hero = config.hero || {};
  const agentProfile = mergeAgentProfile(config.agent_profile || config.agentProfile);
  const assistantProfile = mergeAssistantProfile(config.assistant_profile || config.assistantProfile);
  const complianceProfile = mergeComplianceProfile(config.compliance_profile || config.complianceProfile);
  const integrationProfile = mergeIntegrationProfile(config.integration_profile || config.integrationProfile);
  const agentId = config.agent_id || config.agentId || fallback.agentId;
  const subdomain = config.subdomain || fallback.subdomain || getAgentSiteSubdomain(agentId, site);
  const customDomain = config.custom_domain || config.customDomain || undefined;
  const status = config.status || fallback.status;

  return {
    site: subdomain || site,
    agentId,
    subdomain,
    customDomain,
    publicUrl: getPublicAgentSiteUrl({ agentId, subdomain, customDomain }),
    siteName: branding.siteName || fallback.siteName,
    title: hero.title || `${agentProfile.displayName}'s local home search`,
    subtitle: hero.subtitle || `Explore listings, request tours, and get market context from ${assistantProfile.displayName}.`,
    primaryColor: branding.primaryColor || fallback.primaryColor,
    fontFamily: branding.fontFamily || fallback.fontFamily,
    backgroundImage: hero.backgroundImage,
    status,
    isConfigured: true,
    isPublished: status === 'active',
    ownerName: config.owner_name || config.ownerName || agentProfile.displayName || fallback.ownerName,
    agentProfile,
    assistantProfile,
    complianceProfile,
    integrationProfile,
    sections: normalizeSections(config.sections),
  };
}

function createFallbackTenantSite(site: string): TenantSite {
  const title = toTitleCase(site);
  const agentProfile = mergeAgentProfile({ displayName: title, brokerageName: `${title} Realty` });
  const assistantProfile = mergeAssistantProfile();
  const subdomain = getAgentSiteSubdomain(`${site}-site`, site);

  return {
    site: subdomain,
    agentId: `${site}-site`,
    subdomain,
    publicUrl: getPublicAgentSiteUrl({ agentId: `${site}-site`, subdomain }),
    siteName: `${title} Homes`,
    title: `${title}'s local home search`,
    subtitle: `Listings, neighborhood context, and ${assistantProfile.displayName}-powered market support in one place.`,
    primaryColor: '#22d3ee',
    fontFamily: 'Inter',
    status: 'draft',
    isConfigured: false,
    isPublished: false,
    ownerName: title,
    agentProfile,
    assistantProfile,
    complianceProfile: mergeComplianceProfile(),
    integrationProfile: mergeIntegrationProfile(),
    sections: DEFAULT_AGENT_SITE_SECTIONS,
  };
}

function toTitleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Your';
}

function normalizeSections(value: unknown) {
  const sections = Array.isArray(value) ? value : DEFAULT_AGENT_SITE_SECTIONS;
  return sections
    .map((section: any, index) => ({
      type: String(section?.type || '').trim(),
      visible: section?.visible !== false,
      order: Number.isFinite(Number(section?.order)) ? Number(section.order) : index * 10,
    }))
    .filter((section) => section.type)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function escapePostgrestValue(value: string) {
  return value.replace(/["'(),]/g, '');
}
