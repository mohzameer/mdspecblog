import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const site = context.site ?? new URL('https://blog.mdspec.dev');
  const posts = await getCollection('blog');

  const postUrls = posts.map((p) => ({
    url: new URL(`/blog/${p.slug}/`, site).href,
    lastmod: p.data.pubDate.toISOString().split('T')[0],
  }));

  const tagSet = new Set(posts.flatMap((p) => p.data.tags));
  const tagUrls = [...tagSet].map((tag) => ({
    url: new URL(`/tag/${tag.toLowerCase().replace(/[\s\/]+/g, '-')}/`, site).href,
    lastmod: new Date().toISOString().split('T')[0],
  }));

  const staticUrls = [
    { url: new URL('/', site).href, lastmod: new Date().toISOString().split('T')[0] },
  ];

  const allUrls = [...staticUrls, ...postUrls, ...tagUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(({ url, lastmod }) => `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
