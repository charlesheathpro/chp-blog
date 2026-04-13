// Netlify Edge Function: inject correct SEO tags into post pages server-side.
// Runs before the static HTML is served so crawlers see real title, description,
// canonical, and H1 without waiting for client-side JS to execute.

const SITE_BASE = 'https://blog.coloradohomeprotection.net';

function escapeAttr(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


export default async function handler(request, context) {
  const url   = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);

  // Only intercept /post/<slug> — not /post/ base
  if (parts[0] !== 'post' || parts.length < 2) {
    return context.next();
  }

  const slug      = parts.slice(1).join('/');
  const canonical = `${SITE_BASE}/post/${slug}/`;

  // Fetch post metadata (3 s timeout — if slow, we still fix canonical at minimum)
  let post = null;
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res   = await fetch(
      `${SITE_BASE}/api/post?slug=${encodeURIComponent(slug)}`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (res.ok) post = await res.json();
  } catch (_) { /* fall through with post = null */ }

  // Get the underlying static HTML (triggers the /post/* → /post/index.html redirect)
  const response = await context.next();

  // Only modify HTML responses
  if (!response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  let html = await response.text();

  // ── 1. Always fix canonical (derivable from URL alone) ──────────────────────
  html = html.replace(
    /<link rel="canonical" id="canonical"[^>]*>/,
    `<link rel="canonical" id="canonical" href="${canonical}">`
  );

  // ── 2. Fix inline canonical script default (belt-and-suspenders) ───────────
  // The script sets document.title to a generic string; leave it — JS will override

  if (post) {
    const fullTitle = escapeAttr(`${post.title} | Colorado Home Protection`);
    const desc      = escapeAttr(post.excerpt || '');
    const rawTitle  = escapeAttr(post.title);

    // ── 3. Page title ──────────────────────────────────────────────────────────
    html = html.replace(
      /<title[^>]*>[^<]*<\/title>/,
      `<title>${fullTitle}</title>`
    );

    // ── 4. Meta description ────────────────────────────────────────────────────
    html = html.replace(
      /<meta name="description" id="page-desc"[^>]*>/,
      `<meta name="description" id="page-desc" content="${desc}">`
    );

    // ── 5. OG / Twitter tags ───────────────────────────────────────────────────
    html = html
      .replace(/<meta property="og:title" id="og-title"[^>]*>/,
        `<meta property="og:title" id="og-title" content="${rawTitle}">`)
      .replace(/<meta property="og:description" id="og-desc"[^>]*>/,
        `<meta property="og:description" id="og-desc" content="${desc}">`)
      .replace(/<meta property="og:url" id="og-url"[^>]*>/,
        `<meta property="og:url" id="og-url" content="${canonical}">`)
      .replace(/<meta name="twitter:title" id="twitter-title"[^>]*>/,
        `<meta name="twitter:title" id="twitter-title" content="${fullTitle}">`)
      .replace(/<meta name="twitter:description" id="twitter-desc"[^>]*>/,
        `<meta name="twitter:description" id="twitter-desc" content="${desc}">`);

  }

  return new Response(html, {
    status:  response.status,
    headers: new Headers(response.headers),
  });
}

export const config = { path: '/post/*' };
