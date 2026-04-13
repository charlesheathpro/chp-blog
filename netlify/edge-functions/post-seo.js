// Netlify Edge Function: inject correct canonical URL into post pages.
// This runs before the static HTML is served so crawlers see the right
// canonical without waiting for client-side JS to execute.
// No API call — derivable from the URL alone, zero added latency.

const SITE_BASE = 'https://blog.coloradohomeprotection.net';

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

    const response = await context.next();

    if (!response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    let html = await response.text();

    html = html.replace(
      /<link rel="canonical" id="canonical"[^>]*>/,
      `<link rel="canonical" id="canonical" href="${canonical}">`
    );

    return new Response(html, {
      status:  response.status,
      headers: new Headers(response.headers),
    });

  } catch (_) {
    return context.next();
  }
}

export const config = { path: '/post/*' };
