import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://dabliofoto.com.br';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/cliente'] },
    ],
    sitemap: `${base.replace(/\/$/, '')}/sitemap.xml`,
  };
}
