import type { APIRoute } from 'astro';
import { siteUrl } from '../config';

export const GET: APIRoute = () => {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap-index.xml`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};