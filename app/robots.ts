import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/panel-admin', '/panel-doctor', '/perfil', '/api/'],
    },
    sitemap: 'https://www.psicologosenred.com/sitemap.xml',
    host: 'https://www.psicologosenred.com',
  };
}
