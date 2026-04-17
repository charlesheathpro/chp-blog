// Netlify Edge Function: server-side render /articles/ with real <a href> links.
// Ahrefs and Google receive fully-formed HTML — no JS needed to discover post links.
// This fixes the "orphan pages" issue caused by JS-rendered post lists.

const SITE_BASE   = 'https://blog.coloradohomeprotection.net';
const BLOG_BASE   = 'https://cohomeprotection.blogspot.com';
const BATCH_SIZE  = 50;
const TIMEOUT_MS  = 10000;

const TOPICS = [
  { label: 'mortgage protection',  heading: 'Mortgage Protection',   slug: 'mortgage-protection'  },
  { label: 'life insurance',       heading: 'Life Insurance',         slug: 'life-insurance'        },
  { label: 'term life',            heading: 'Term Life Insurance',    slug: 'term-life'             },
  { label: 'disability insurance', heading: 'Disability Insurance',   slug: 'disability-insurance'  },
  { label: 'final expense',        heading: 'Final Expense',          slug: 'final-expense'         },
  { label: 'medicare',             heading: 'Medicare',               slug: 'medicare'              },
  { label: 'colorado',             heading: 'Colorado Guides',        slug: 'colorado'              },
];

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchAllPosts() {
  const posts = [];
  let startIndex = 1;
  while (true) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const url = `${BLOG_BASE}/feeds/posts/default?alt=json&max-results=${BATCH_SIZE}&start-index=${startIndex}`;
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) break;
      const data    = await res.json();
      const feed    = data.feed;
      const total   = parseInt(feed['openSearch$totalResults']?.['$t'] || '0', 10);
      const entries = [].concat(feed.entry || []);
      for (const entry of entries) {
        const link   = (entry.link || []).find(l => l.rel === 'alternate')?.href || '';
        const slug   = link.split('/').pop().replace(/\.html$/, '');
        const title  = entry.title?.['$t'] || '';
        const labels = (entry.category || []).map(c => (c.term || '').toLowerCase());
        if (slug && title) posts.push({ slug, title, labels });
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

export default async function handler(request, context) {
  try {
    const posts = await fetchAllPosts();

    // Group posts by topic
    const grouped  = {};
    const uncategorised = [];
    for (const post of posts) {
      const matched = TOPICS.find(t => post.labels.includes(t.label));
      if (matched) {
        if (!grouped[matched.label]) grouped[matched.label] = [];
        grouped[matched.label].push(post);
      } else {
        uncategorised.push(post);
      }
    }

    // Build topic sections HTML
    let sectionsHtml = '';
    for (const topic of TOPICS) {
      const items = grouped[topic.label] || [];
      if (!items.length) continue;
      sectionsHtml += `
      <div class="topic-group">
        <div class="topic-heading">
          <a href="${SITE_BASE}/topic/${topic.slug}/">${esc(topic.heading)}</a>
        </div>
        <ul class="post-list">
          ${items.map(p => `<li><a href="${SITE_BASE}/post/${encodeURIComponent(p.slug)}/">${esc(p.title)}</a></li>`).join('\n          ')}
        </ul>
      </div>`;
    }
    if (uncategorised.length) {
      sectionsHtml += `
      <div class="topic-group">
        <div class="topic-heading">Other Guides</div>
        <ul class="post-list">
          ${uncategorised.map(p => `<li><a href="${SITE_BASE}/post/${encodeURIComponent(p.slug)}/">${esc(p.title)}</a></li>`).join('\n          ')}
        </ul>
      </div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All Articles | Colorado Home Protection Blog</title>
  <meta name="description" content="Browse all mortgage protection, life insurance, and homeowner guides from Colorado Home Protection — plain-English articles for Colorado homeowners.">
  <link rel="canonical" href="${SITE_BASE}/articles/">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="All Articles | Colorado Home Protection Blog">
  <meta property="og:description" content="Browse all mortgage protection, life insurance, and homeowner guides — plain-English articles for Colorado homeowners.">
  <meta property="og:url" content="${SITE_BASE}/articles/">
  <meta property="og:image" content="${SITE_BASE}/og-image.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="All Articles | Colorado Home Protection Blog">
  <meta name="twitter:description" content="Browse all mortgage protection, life insurance, and homeowner guides — plain-English articles for Colorado homeowners.">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --navy:#1a3256; --navy-dark:#0f1f38; --gold:#c49a2e; --bg:#f4f4f0; --border:#e8e4dc; --text-dark:#1a1a2e; --text-light:#8492a6; }
    body { font-family:'Inter',sans-serif; background:var(--bg); color:var(--text-dark); }
    .nav { position:sticky; top:0; z-index:100; background:var(--navy-dark); border-bottom:1px solid rgba(255,255,255,.07); padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between; }
    .nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
    .nav-brand { color:#fff; font-weight:700; font-size:13px; letter-spacing:.1em; line-height:1; }
    .nav-sub { font-size:9px; letter-spacing:.14em; color:var(--gold); margin-top:3px; }
    .nav-links { display:flex; align-items:center; gap:24px; }
    .nav-link { color:rgba(255,255,255,.75); font-size:14px; text-decoration:none; }
    .btn-gold-sm { background:var(--gold); color:var(--navy-dark); font-weight:700; font-size:13px; padding:9px 18px; border-radius:8px; text-decoration:none; }
    .page-header { background:var(--navy-dark); padding:52px 24px 48px; }
    .page-header-inner { max-width:760px; margin:0 auto; }
    .page-header-inner a.back { color:rgba(255,255,255,.5); font-size:13px; text-decoration:none; display:inline-block; margin-bottom:20px; }
    .page-header-inner h1 { font-family:'Playfair Display',serif; font-size:36px; color:#fff; margin-bottom:10px; }
    .page-header-inner p { font-size:15px; color:rgba(255,255,255,.6); line-height:1.6; }
    .articles-section { max-width:760px; margin:0 auto; padding:48px 24px 80px; }
    .topic-group { margin-bottom:48px; }
    .topic-heading { font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border); }
    .topic-heading a { color:var(--gold); text-decoration:none; }
    .topic-heading a:hover { text-decoration:underline; }
    .post-list { list-style:none; }
    .post-list li { border-bottom:1px solid var(--border); }
    .post-list li:first-child { border-top:1px solid var(--border); }
    .post-list a { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 0; text-decoration:none; color:var(--text-dark); font-size:15px; font-weight:500; transition:color .18s; }
    .post-list a:hover { color:var(--navy); }
    .post-list a::after { content:'→'; color:var(--text-light); flex-shrink:0; }
    .post-list a:hover::after { color:var(--gold); }
    .footer { background:var(--navy-dark); padding:40px 24px; text-align:center; }
    .footer a { color:rgba(255,255,255,.45); font-size:13px; text-decoration:none; margin:0 12px; }
    .footer a:hover { color:#fff; }
    .footer p { color:rgba(255,255,255,.22); font-size:12px; margin-top:16px; }
  </style>
</head>
<body>
<nav class="nav">
  <a href="/" class="nav-logo">
    <svg width="26" height="30" viewBox="0 0 120 136" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 4 L102 4 L116 18 L116 76 Q116 118 60 133 Q4 118 4 76 L4 18 Z" fill="#1a3256"/>
      <polyline points="16,85 60,44 104,85" stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="68" y="30" width="13" height="22" rx="1.5" fill="white"/>
    </svg>
    <div><div class="nav-brand">COLORADO</div><div class="nav-sub">HOME PROTECTION</div></div>
  </a>
  <div class="nav-links">
    <a href="/" class="nav-link">Articles</a>
    <a href="https://coloradohomeprotection.net" class="btn-gold-sm">Get Free Quote</a>
  </div>
</nav>

<div class="page-header">
  <div class="page-header-inner">
    <a href="/" class="back">← Back to blog</a>
    <h1>All Articles</h1>
    <p>Every guide published on Colorado Home Protection Blog — organised by topic.</p>
  </div>
</div>

<div class="articles-section">
  ${sectionsHtml || '<p style="color:var(--text-light)">No articles found.</p>'}
</div>

<footer class="footer">
  <div>
    <a href="/">Blog Home</a>
    <a href="/topic/mortgage-protection/">Mortgage Protection</a>
    <a href="/topic/life-insurance/">Life Insurance</a>
    <a href="/topic/colorado/">Colorado Guides</a>
    <a href="https://coloradohomeprotection.net">Get a Free Quote</a>
  </div>
  <p>© 2026 Colorado Home Protection. All rights reserved.</p>
</footer>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });

  } catch (err) {
    // Fall through to static file on any error
    return context.next();
  }
}

export const config = { path: '/articles/' };
