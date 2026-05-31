import type { MetadataRoute } from 'next';
import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';

export default function sitemap(): MetadataRoute.Sitemap {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.app';
  const now = new Date();
  const tahPages = listPulseCartridges().map(cartridge => ({
    url: `${host}/tah/${cartridge.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7
  }));

  return [
    {
      url: host,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: `${host}/tah`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    },
    ...tahPages
  ];
}
