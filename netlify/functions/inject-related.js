'use strict';

// Runs @hourly. For every post, computes the most relevant related articles
// and stores them in Netlify Blobs so the post page can render a pre-built
// "Related for Colorado Homeowners" section automatically.

const { getStore } = require('@netlify/blobs');

const BLOG_BASE  = 'https://cohomeprotection.blogspot.com';
const SITE_BASE  = 'https://blog.coloradohomeprotection.net';
const BATCH_SIZE = 150;
const TIMEOUT_MS = 12000;
const TOP_N      = 5;

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

function sigWords(text) {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  );
}

function score(post, other) {
  const sharedLabels = (post.labels || [])
    .filter(l => (other.labels || []).includes(l)).length;
  const pw = sigWords(post.title);
  const ow = sigWords(other.title);
  let sharedWords = 0;
  for (const w of ow) if (pw.has(w)) sharedWords++;
  return sharedLabels * 3 + sharedWords;
}

function getAlternateUrl(entry) {
  return (entry.link || []).find(l => l.rel === 'alternate')?.href || '';
}

function extractSlug(url) {
  return url.split('/').pop().replace(/\.html$/, '');
}

async function fetchAllPosts() {
  const posts = [];
  let startIndex = 1;
  while (true) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(
        `${BLOG_BASE}/feeds/posts/default?alt=json&max-results=${BATCH_SIZE}&start-index=${startIndex}`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      if (!res.ok) break;
      const data    = await res.json();
      const feed    = data.feed;
      const total   = parseInt(feed['openSearch$totalResults']?.['$t'] || '0', 10);
      const entries = [].concat(feed.entry || []);
      for (const entry of entries) {
        const slug   = extractSlug(getAlternateUrl(entry));
        const title  = entry.title?.['$t'] || '';
        const labels = (entry.category || []).map(c => c.term).filter(Boolean);
        const pub    = entry.published?.['$t'] || '';
        if (slug) posts.push({ slug, title, labels, published: pub,
          canonicalUrl: `${SITE_BASE}/post/${encodeURIComponent(slug)}/` });
      }
      startIndex += BATCH_SIZE;
      if (entries.length === 0 || startIndex > total) break;
    } catch {
      clearTimeout(timer);
      break;
    }
  }
  return posts;
}

exports.handler = async () => {
  let posts;
  try {
    posts = await fetchAllPosts();
  } catch (err) {
    return { statusCode: 502, body: `Failed to fetch posts: ${err.message}` };
  }

  if (posts.length < 2) {
    return { statusCode: 200, body: 'Not enough posts to compute related.' };
  }

  const store = getStore({
    name:   'related-posts',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_AUTH_TOKEN,
  });

  let saved = 0;
  for (const post of posts) {
    const others  = posts.filter(p => p.slug !== post.slug);
    const scored  = others
      .map(other => ({ ...other, _score: score(post, other) }))
      .filter(p => p._score > 0)
      .sort((a, b) => b._score - a._score ||
        new Date(b.published) - new Date(a.published))
      .slice(0, TOP_N);

    const related = scored.map(({ slug, title, canonicalUrl, labels }) =>
      ({ slug, title, canonicalUrl, labels })
    );

    await store.set(post.slug, JSON.stringify(related));
    saved++;
  }

  console.log(`inject-related: saved related lists for ${saved} posts`);
  return { statusCode: 200, body: JSON.stringify({ saved }) };
};
