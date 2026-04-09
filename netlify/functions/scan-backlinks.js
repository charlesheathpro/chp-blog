'use strict';

const { getStore } = require('@netlify/blobs');

const BLOG_BASE  = 'https://cohomeprotection.blogspot.com';
const BATCH_SIZE = 150;
const TIMEOUT_MS = 12000;
const DAYS_BACK  = 30;

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

function significantWords(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract text that is already wrapped in <a> tags */
function linkedTextsInHtml(html) {
  const linked = [];
  const re = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) !== null) {
    linked.push(stripHtml(m[1]).toLowerCase());
  }
  return linked;
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
        const slug      = extractSlug(getAlternateUrl(entry));
        const content   = entry.content?.['$t'] || entry.summary?.['$t'] || '';
        const title     = entry.title?.['$t'] || '';
        const published = entry.published?.['$t'] || '';
        if (slug) posts.push({ slug, title, content, published });
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
  let allPosts;
  try {
    allPosts = await fetchAllPosts();
  } catch (err) {
    return { statusCode: 502, body: `Failed to fetch posts: ${err.message}` };
  }

  const cutoff      = new Date(Date.now() - DAYS_BACK * 86400000);
  const recentPosts = allPosts.filter(p => p.published && new Date(p.published) >= cutoff);

  console.log(`scan-backlinks: ${allPosts.length} total, ${recentPosts.length} in last ${DAYS_BACK} days`);

  const issues = [];

  for (const post of recentPosts) {
    const plainText  = stripHtml(post.content).toLowerCase();
    const linkedTexts = linkedTextsInHtml(post.content);
    const missing    = [];

    for (const other of allPosts) {
      if (other.slug === post.slug) continue;

      const otherSigWords = significantWords(other.title);
      if (otherSigWords.length < 2) continue;

      // Check how many of the other post's significant words appear in this post's plain text
      const matches = otherSigWords.filter(w => plainText.includes(w));
      if (matches.length < 3) continue; // Not meaningfully mentioned — skip

      // Check if that mention is already linked (a significant overlap in existing <a> text)
      const alreadyLinked = linkedTexts.some(lt => {
        const ltSig = significantWords(lt);
        return ltSig.filter(w => otherSigWords.includes(w)).length >= 3;
      });

      if (!alreadyLinked) {
        missing.push({ slug: other.slug, title: other.title });
      }
    }

    if (missing.length > 0) {
      issues.push({ slug: post.slug, title: post.title, published: post.published, missing });
      console.log(`  ⚠ ${post.slug}: missing links to ${missing.map(m => m.slug).join(', ')}`);
    } else {
      console.log(`  ✓ ${post.slug}: fully backlinked`);
    }
  }

  // Persist the report in Netlify Blobs
  const report = {
    generated:    new Date().toISOString(),
    postsScanned: recentPosts.length,
    issueCount:   issues.length,
    issues,
  };

  try {
    const store = getStore({
      name:   'backlink-reports',
      siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
      token:  process.env.NETLIFY_AUTH_TOKEN,
    });
    await store.set('latest', JSON.stringify(report));
    console.log(`scan-backlinks: report saved (${issues.length} issues)`);
  } catch (err) {
    console.error('Failed to save report:', err.message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ postsScanned: recentPosts.length, issues: issues.length }),
  };
};
