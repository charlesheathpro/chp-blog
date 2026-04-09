'use strict';

const BLOG_BASE  = 'https://cohomeprotection.blogspot.com';
const SITE_BASE  = 'https://blog.coloradohomeprotection.net';
const BATCH_SIZE = 150;
const TIMEOUT_MS = 12000;

async function fetchWithTimeout(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function xmlEscape(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

exports.handler = async () => {
  const posts = [];
  let startIndex = 1;

  while (true) {
    const url = `${BLOG_BASE}/feeds/posts/default?alt=json&max-results=${BATCH_SIZE}&start-index=${startIndex}`;
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) break;
      const data    = await res.json();
      const feed    = data.feed;
      const total   = parseInt(feed['openSearch$totalResults']?.['$t'] || '0', 10);
      const entries = [].concat(feed.entry || []);

      for (const entry of entries) {
        const link      = (entry.link || []).find(l => l.rel === 'alternate')?.href || '';
        const slug      = link.split('/').pop().replace(/\.html$/, '');
        const published = entry.published?.['$t'] || '';
        const updated   = entry.updated?.['$t']   || published;
        if (slug) posts.push({ slug, lastmod: (updated || published).split('T')[0] });
      }

      startIndex += BATCH_SIZE;
      if (entries.length === 0 || startIndex > total) break;
    } catch {
      break;
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const staticUrls = [
    { loc: `${SITE_BASE}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    // privacy page is noindex — excluded from sitemap intentionally
  ];

  const postUrls = posts.map(p => ({
    loc:        `${SITE_BASE}/post/${encodeURIComponent(p.slug)}/`,
    lastmod:    p.lastmod || today,
    changefreq: 'monthly',
    priority:   '0.8',
  }));

  const allUrls = [...staticUrls, ...postUrls];

  const urlXml = allUrls.map(u => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
    body: xml,
  };
};
