'use strict';

const BLOG_BASE  = 'https://cohomeprotection.blogspot.com';
const SITE_BASE  = 'https://blog.coloradohomeprotection.net';
const BATCH_SIZE = 150;   // Blogger's safe max per request
const TIMEOUT_MS = 12000;

/* ── Blogger entry normalizer (mirrors feed.js) ──────── */
function getAlternateUrl(entry) {
  return (entry.link || []).find(l => l.rel === 'alternate')?.href || '';
}

function extractSlug(url) {
  if (!url) return '';
  return url.split('/').pop().replace(/\.html$/, '');
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
  return html.replace(
    /https?:\/\/cohomeprotection\.blogspot\.com\/(\d{4}\/\d{2}\/)([^"'\s<>]+?)\.html/gi,
    (_, _path, slug) => `${SITE_BASE}/post/?slug=${slug.split('/').pop()}`
  );
}

function bestImage(entry, content, slug) {
  const thumb = entry['media$thumbnail'];
  if (thumb?.url) return thumb.url.replace(/\/s\d+(-c)?\//g, '/s1200/');
  const m = (content || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1];
  // Fall back to AI-generated image
  return slug ? `/api/post-image?slug=${encodeURIComponent(slug)}` : null;
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
    canonicalUrl: `${SITE_BASE}/post/?slug=${encodeURIComponent(slug)}`,
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
  const slug = (event.queryStringParameters || {}).slug;

  if (!slug) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: '`slug` query parameter is required.' }),
    };
  }

  // Page through Blogger's feed in large batches until the slug is found.
  // For a blog under 150 posts this is a single request; scales linearly beyond that.
  let startIndex = 1;

  while (true) {
    const url = `${BLOG_BASE}/feeds/posts/default?alt=json&max-results=${BATCH_SIZE}&start-index=${startIndex}`;

    let data;
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`Blogger returned HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      const timedOut = err.name === 'AbortError';
      return {
        statusCode: timedOut ? 504 : 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: timedOut ? 'Request timed out.' : 'Could not fetch post.',
          detail: err.message,
        }),
      };
    }

    const feed    = data.feed;
    const total   = parseInt(feed['openSearch$totalResults']?.['$t'] || '0', 10);
    const entries = [].concat(feed.entry || []);

    // Search this batch for the requested slug
    const match = entries.find(e => extractSlug(getAlternateUrl(e)) === slug);
    if (match) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          // Fresh for 10 min; serve stale for up to 2 hrs while revalidating
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=7200',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(normalize(match)),
      };
    }

    // Advance to the next batch or give up
    startIndex += BATCH_SIZE;
    if (entries.length === 0 || startIndex > total) break;
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Post not found.' }),
  };
};
