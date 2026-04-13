// Netlify Edge Function: inject correct SEO tags into post pages server-side.
// API fetch and HTML fetch run concurrently — no added latency vs. serving
// static HTML directly. Falls back to unmodified HTML on any error.

const SITE_BASE = 'https://blog.coloradohomeprotection.net';

function escapeAttr(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchPost(slug) {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res   = await fetch(
      `${SITE_BASE}/api/post?slug=${encodeURIComponent(slug)}`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    return res.ok ? res.json() : null;
  } catch (_) {
    return null;
  }
}

export default async function handler(request, context) {
  try {
    const url   = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    // Only intercept /post/<slug> — not /post/ base
    if (parts[0] !== 'post' || parts.length < 2) {
      return context.next();
    }

    const slug      = parts.slice(1).join('/');
    const canonical = `${SITE_BASE}/post/${slug}/`;

    // Fetch post metadata and static HTML concurrently — no added latency
    const [response, post] = await Promise.all([
      context.next(),
      fetchPost(slug),
    ]);

    // Only modify HTML responses
    if (!response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    let html = await response.text();

    // ── 1. Always fix canonical (derivable from URL alone) ──────────────────
    html = html.replace(
      /<link rel="canonical" id="canonical"[^>]*>/,
      `<link rel="canonical" id="canonical" href="${canonical}">`
    );

    if (post) {
      const fullTitle = escapeAttr(`${post.title} | Colorado Home Protection`);
      const desc      = escapeAttr(post.excerpt || '');
      const rawTitle  = escapeAttr(post.title);

      // ── 2. Page title ──────────────────────────────────────────────────────
      html = html.replace(
        /<title[^>]*>[^<]*<\/title>/,
        `<title>${fullTitle}</title>`
      );

      // ── 3. Meta description ────────────────────────────────────────────────
      html = html.replace(
        /<meta name="description" id="page-desc"[^>]*>/,
        `<meta name="description" id="page-desc" content="${desc}">`
      );

      // ── 4. OG / Twitter tags ───────────────────────────────────────────────
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

  } catch (_) {
    // On any unexpected error, fall through to normal Netlify routing
    return context.next();
  }
}

export const config = { path: '/post/*' };
