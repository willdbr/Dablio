import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://dabliofoto.com.br';
  const raiz = base.replace(/\/$/, '');
  return [
    { url: raiz, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${raiz}/privacidade`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
