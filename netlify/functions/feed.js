'use strict';

const BLOG_BASE = 'https://cohomeprotection.blogspot.com';
const SITE_BASE = 'https://blog.coloradohomeprotection.net';
const PER_PAGE  = 12;
const TIMEOUT_MS = 12000;

/* ── Blogger entry normalizer ────────────────────────── */
function getAlternateUrl(entry) {
  return (entry.link || []).find(l => l.rel === 'alternate')?.href || '';
}

function extractSlug(url) {
  if (!url) return '';
  const last = url.split('/').pop();
  return last.replace(/\.html$/, '');
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function toExcerpt(html, max = 220) {
  const text = stripHtml(html);
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

function rewriteLinks(html) {
  if (!html) return html;
  // Replace blogspot post links with canonical custom-domain URLs
  return html.replace(
    /https?:\/\/cohomeprotection\.blogspot\.com\/(\d{4}\/\d{2}\/)([^"'\s<>]+?)\.html/gi,
    (_, _path, slug) => `${SITE_BASE}/post/?slug=${slug.split('/').pop()}`
  );
}

function bestImage(entry, content, slug) {
  // media:thumbnail is Blogger's own high-quality image — always reliable
  const thumb = entry['media$thumbnail'];
  if (thumb?.url) return thumb.url.replace(/\/s\d+(-c)?\//g, '/s1200/');
  // AI-generated image preferred over inline content images (which are often
  // hotlink-blocked and cause broken card thumbnails)
  if (slug) return `/api/post-image?slug=${encodeURIComponent(slug)}&v=2`;
  // Last resort: first <img> in post content
  const m = (content || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function normalize(entry) {
  const bloggerUrl = getAlternateUrl(entry);
  const slug       = extractSlug(bloggerUrl);
  const content    = rewriteLinks(entry.content?.['$t'] || entry.summary?.['$t'] || '');
  const title      = entry.title?.['$t'] || 'Untitled';
  const published  = entry.published?.['$t'] || null;
  const updated    = entry.updated?.['$t'] || null;
  const labels     = (entry.category || []).map(c => c.term).filter(Boolean);

  return {
    title,
    slug,
    published,
    updated,
    excerpt: toExcerpt(content),
    content,
    image: bestImage(entry, content, slug),
    labels,
    canonicalUrl: `${SITE_BASE}/post/${encodeURIComponent(slug)}/`,
    bloggerUrl,
  };
}

/* ── Fetch with timeout ──────────────────────────────── */
async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
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

/* ── Handler ─────────────────────────────────────────── */
exports.handler = async (event) => {
  const qs         = event.queryStringParameters || {};
  const page       = Math.max(1, parseInt(qs.page || '1', 10));
  const label      = qs.label || '';
  const startIndex = (page - 1) * PER_PAGE + 1;

  const labelPath  = label ? `/-/${encodeURIComponent(label)}` : '';
  const url = `${BLOG_BASE}/feeds/posts/default${labelPath}?alt=json&max-results=${PER_PAGE}&start-index=${startIndex}&orderby=published`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Blogger returned HTTP ${res.status}`);
    const data  = await res.json();
    const feed  = data.feed;

    const total      = parseInt(feed['openSearch$totalResults']?.['$t'] || '0', 10);
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const entries    = [].concat(feed.entry || []);
    const posts      = entries.map(normalize);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Fresh for 5 min; serve stale for up to 1 hr while revalidating
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        posts,
        pagination: {
          page,
          perPage: PER_PAGE,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }),
    };
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    return {
      statusCode: timedOut ? 504 : 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: timedOut ? 'Feed request timed out.' : 'Could not load posts.',
        detail: err.message,
      }),
    };
  }
};
