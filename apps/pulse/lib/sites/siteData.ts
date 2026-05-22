import connectDB from '@/lib/core/database';
import { SiteConfig } from '@/models/SiteConfig';

export type TenantSite = {
  site: string;
  agentId: string;
  siteName: string;
  title: string;
  subtitle: string;
  primaryColor: string;
  fontFamily: string;
  backgroundImage?: string;
  status: 'active' | 'draft' | 'suspended';
  ownerName: string;
};

export async function getTenantSite(site: string): Promise<TenantSite> {
  const fallback = createFallbackTenantSite(site);

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

    return {
      site,
      agentId: config.agentId || fallback.agentId,
      siteName: config.branding?.siteName || fallback.siteName,
      title: config.hero?.title || fallback.title,
      subtitle: config.hero?.subtitle || fallback.subtitle,
      primaryColor: config.branding?.primaryColor || fallback.primaryColor,
      fontFamily: config.branding?.fontFamily || fallback.fontFamily,
      backgroundImage: config.hero?.backgroundImage,
      status: config.status || fallback.status,
      ownerName: config.ownerName || config.branding?.siteName || fallback.ownerName,
    };
  } catch (error) {
    console.error('[TENANT_SITE_DATA_ERROR]', error);
    return fallback;
  }
}

function createFallbackTenantSite(site: string): TenantSite {
  const title = toTitleCase(site);

  return {
    site,
    agentId: `${site}-site`,
    siteName: `${title} Sunset Pulse`,
    title: `${title}'s local intelligence atlas`,
    subtitle: 'Listings, neighborhood context, and Jamie-powered market memory in one branded place.',
    primaryColor: '#22d3ee',
    fontFamily: 'Inter',
    status: 'active',
    ownerName: title,
  };
}

function toTitleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Your';
}
