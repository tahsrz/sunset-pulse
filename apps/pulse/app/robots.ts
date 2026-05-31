import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://sunsetpulse.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/tah', '/api/tah', '/llms.txt'],
      disallow: ['/api/tah/eval', '/admin', '/dashboard', '/profile']
    },
    sitemap: `${host}/sitemap.xml`
  };
}
