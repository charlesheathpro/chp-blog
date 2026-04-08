'use strict';

const { getStore } = require('@netlify/blobs');

const BLOG_BASE   = 'https://cohomeprotection.blogspot.com';
const BATCH_SIZE  = 150;
const TIMEOUT_MS  = 20000;
const DALL_E_DELAY_MS = 14000; // ~4 requests/min — stays under tier-1 rate limit

/* ── Blogger helpers ─────────────────────────────────── */
function getAlternateUrl(entry) {
  return (entry.link || []).find(l => l.rel === 'alternate')?.href || '';
}

function extractSlug(url) {
  if (!url) return '';
  return url.split('/').pop().replace(/\.html$/, '');
}

function hasOwnImage(entry, content) {
  if (entry['media$thumbnail']?.url) return true;
  if ((content || '').match(/<img[^>]+src=["'][^"']+["']/i)) return true;
  return false;
}

/* ── Fetch all Blogger posts ─────────────────────────── */
async function fetchAllPosts() {
  const posts = [];
  let startIndex = 1;

  while (true) {
    const url = `${BLOG_BASE}/feeds/posts/default?alt=json&max-results=${BATCH_SIZE}&start-index=${startIndex}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let data;
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) break;
      data = await res.json();
    } catch {
      clearTimeout(timer);
      break;
    }

    const feed    = data.feed;
    const total   = parseInt(feed['openSearch$totalResults']?.['$t'] || '0', 10);
    const entries = [].concat(feed.entry || []);

    for (const entry of entries) {
      const bloggerUrl = getAlternateUrl(entry);
      const slug       = extractSlug(bloggerUrl);
      const content    = entry.content?.['$t'] || entry.summary?.['$t'] || '';
      const title      = entry.title?.['$t'] || 'Untitled';
      const labels     = (entry.category || []).map(c => c.term).filter(Boolean);
      if (slug) posts.push({ slug, title, labels, hasImage: hasOwnImage(entry, content) });
    }

    startIndex += BATCH_SIZE;
    if (entries.length === 0 || startIndex > total) break;
  }

  return posts;
}

/* ── Build DALL-E prompt ────────────────────────────── */
function buildPrompt(post) {
  const title = post.title;
  const label = (post.labels || [])[0] || '';
  const topic = label.toLowerCase().includes('life')
    ? 'life insurance and family financial security'
    : label.toLowerCase().includes('mortgage')
    ? 'mortgage protection and home ownership security'
    : 'Colorado homeowner protection and financial peace of mind';

  return (
    `Professional editorial photograph for a financial services blog article. ` +
    `Article title: "${title}". Topic: ${topic}. ` +
    `Scene ideas: a beautiful Colorado home exterior at golden hour, a family relaxing safely in their home, ` +
    `a Colorado mountain community, or a couple peacefully reviewing finances. ` +
    `Style: warm natural light, modern lifestyle photography, trustworthy and approachable aesthetic. ` +
    `Colorado Rocky Mountain setting preferred. ` +
    `No text, no watermarks, no logos, no handshakes or suits pointing at charts. Photorealistic, landscape orientation.`
  );
}

/* ── Generate image via DALL-E 3 ────────────────────── */
async function generateImage(post) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'dall-e-3',
      prompt:          buildPrompt(post),
      n:               1,
      size:            '1792x1024',
      quality:         'standard',
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data  = await res.json();
  const b64   = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data in OpenAI response');

  return Buffer.from(b64, 'base64');
}

/* ── Handler (runs on schedule) ─────────────────────── */
exports.handler = async () => {
  const store = getStore('post-images');

  // Load manifest of already-generated slugs
  let manifest = {};
  try {
    const raw = await store.get('__manifest', { type: 'text' });
    if (raw) manifest = JSON.parse(raw);
  } catch {}

  // Fetch all posts and find ones that need images
  let allPosts;
  try {
    allPosts = await fetchAllPosts();
  } catch (err) {
    return { statusCode: 502, body: `Failed to fetch posts: ${err.message}` };
  }

  const needsImage = allPosts.filter(p => !p.hasImage && !manifest[p.slug]);
  console.log(`generate-images: ${allPosts.length} total posts, ${needsImage.length} need images`);

  if (needsImage.length === 0) {
    return { statusCode: 200, body: 'All posts have images — nothing to do.' };
  }

  let generated = 0;
  let failed    = 0;

  for (const post of needsImage) {
    try {
      console.log(`Generating image for: ${post.slug}`);
      const buffer = await generateImage(post);
      await store.set(post.slug, buffer, { metadata: { contentType: 'image/png' } });
      manifest[post.slug] = true;
      await store.set('__manifest', JSON.stringify(manifest));
      generated++;
    } catch (err) {
      console.error(`Failed for ${post.slug}: ${err.message}`);
      failed++;
    }

    // Throttle to stay under rate limits — skip delay after the last item
    if (post !== needsImage[needsImage.length - 1]) {
      await new Promise(r => setTimeout(r, DALL_E_DELAY_MS));
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ generated, failed, remaining: 0 }),
  };
};
