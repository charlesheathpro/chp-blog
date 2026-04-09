'use strict';

const { getStore } = require('@netlify/blobs');

const BLOG_BASE        = 'https://cohomeprotection.blogspot.com';
const PEXELS_API_BASE  = 'https://api.pexels.com/v1';
const BATCH_SIZE       = 150;
const TIMEOUT_MS       = 20000;
const MAX_PER_RUN      = 15;   // Pexels is fast — no artificial delay needed
// Bump STORE_VERSION to clear old images and re-fetch from new provider
const STORE_VERSION    = 'pexels-v1';

const STOP_WORDS = new Set([
  'about','after','also','always','are','been','before','being','between',
  'but','can','could','does','doing','done','each','even','every','find',
  'from','get','gets','got','have','having','help','here','home','how',
  'into','its','just','know','like','make','many','more','most','much',
  'need','needs','not','now','often','once','only','other','our','out',
  'over','plan','right','should','some','take','than','that','their',
  'them','then','there','they','this','time','under','until','use','used',
  'using','want','well','what','when','where','which','while','will',
  'with','work','would','your','the','and','for','you','can','are',
  'not','was','has','had',
]);

/* ── Blogger helpers ─────────────────────────────────── */
function getAlternateUrl(entry) {
  return (entry.link || []).find(l => l.rel === 'alternate')?.href || '';
}

function extractSlug(url) {
  if (!url) return '';
  return url.split('/').pop().replace(/\.html$/, '');
}

function hasOwnImage(entry) {
  return !!entry['media$thumbnail']?.url;
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
      const title      = entry.title?.['$t'] || 'Untitled';
      const labels     = (entry.category || []).map(c => c.term).filter(Boolean);
      if (slug) posts.push({ slug, title, labels, hasImage: hasOwnImage(entry) });
    }

    startIndex += BATCH_SIZE;
    if (entries.length === 0 || startIndex > total) break;
  }

  return posts;
}

/* ── Build Pexels search query ───────────────────────── */
function buildQuery(post) {
  const label = (post.labels || [])[0] || '';
  const labelLc = label.toLowerCase();

  // Topic-aware base query
  const base = labelLc.includes('life')
    ? 'family life insurance protection'
    : labelLc.includes('mortgage')
    ? 'house mortgage family home'
    : 'colorado home family protection';

  // Pull meaningful words from the title
  const titleWords = post.title
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOP_WORDS.has(w))
    .slice(0, 3)
    .join(' ');

  return (titleWords ? `${titleWords} ${base}` : base).trim();
}

/* ── Fetch a photo from Pexels ───────────────────────── */
async function fetchPexelsPhoto(post) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error('PEXELS_API_KEY not set');

  const query = buildQuery(post);

  const search = async (q) => {
    const res = await fetch(
      `${PEXELS_API_BASE}/search?query=${encodeURIComponent(q)}&per_page=10&orientation=landscape&size=large`,
      { headers: { Authorization: apiKey } }
    );
    if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text()}`);
    return res.json();
  };

  let data = await search(query);

  // Fallback to broader query if no results
  if (!data.photos?.length) {
    data = await search('colorado family home protection');
  }
  if (!data.photos?.length) throw new Error('No Pexels photos found');

  // Deterministic pick by slug hash so the same post always gets the same photo
  const hash  = post.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const photo = data.photos[Math.abs(hash) % data.photos.length];

  return {
    url:             photo.src.large2x || photo.src.large,
    photographer:    photo.photographer,
    photographerUrl: photo.photographer_url,
    pexelsUrl:       photo.url,
  };
}

function getImageStore() {
  return getStore({
    name:   'post-images-v2',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_AUTH_TOKEN,
  });
}

/* ── Handler (runs @hourly) ──────────────────────────── */
exports.handler = async () => {
  const store = getImageStore();

  // Load manifest; reset if it belongs to a different store version
  let manifest = {};
  try {
    const raw = await store.get('__manifest', { type: 'text' });
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.__version === STORE_VERSION) {
        manifest = parsed;
      }
      // If version mismatch, start fresh so all posts get new Pexels photos
    }
  } catch {}

  let allPosts;
  try {
    allPosts = await fetchAllPosts();
  } catch (err) {
    return { statusCode: 502, body: `Failed to fetch posts: ${err.message}` };
  }

  const needsImage = allPosts.filter(p => !p.hasImage && !manifest[p.slug]);
  const toProcess  = needsImage.slice(0, MAX_PER_RUN);
  console.log(`generate-images: ${allPosts.length} posts total, ${needsImage.length} need photos, processing ${toProcess.length} this run`);

  if (needsImage.length === 0) {
    return { statusCode: 200, body: 'All posts have photos — nothing to do.' };
  }

  let generated = 0;
  let failed    = 0;

  for (const post of toProcess) {
    try {
      console.log(`Fetching Pexels photo for: ${post.slug}`);
      const meta = await fetchPexelsPhoto(post);
      await store.set(post.slug, JSON.stringify(meta));
      manifest[post.slug]    = true;
      manifest.__version     = STORE_VERSION;
      await store.set('__manifest', JSON.stringify(manifest));
      generated++;
      console.log(`  ✓ ${post.slug} → ${meta.photographer}`);
    } catch (err) {
      console.error(`  ✗ ${post.slug}: ${err.message}`);
      failed++;
    }
  }

  const remaining = needsImage.length - toProcess.length;
  return {
    statusCode: 200,
    body: JSON.stringify({ generated, failed, remaining }),
  };
};
