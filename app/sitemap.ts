import type { MetadataRoute } from 'next';

const BASE = 'https://www.psicologosenred.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    '',
    '/catalogo',
    '/academia',
    '/nosotros',
    '/contacto',
    '/trabaja-con-nosotros',
    '/registro',
    '/login',
    '/blog',
    '/para-ia',
    '/terminos-condiciones',
    '/aviso-privacidad',
  ];

  return paths.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === '/para-ia' || path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/para-ia' || path === '/catalogo' ? 0.9 : 0.7,
  }));
}
