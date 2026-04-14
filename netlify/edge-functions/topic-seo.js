// Netlify Edge Function: inject topic metadata into /topic/* pages.
// Runs before the static HTML is served so crawlers see the correct
// title, description, canonical URL, OG tags, and data island without
// waiting for client-side JS.

const SITE_BASE = 'https://blog.coloradohomeprotection.net';

const TOPICS = {
  'mortgage-protection': {
    label:       'mortgage protection',
    h1:          'Mortgage Protection Insurance',
    title:       'Mortgage Protection Insurance Guides | Colorado Home Protection',
    description: 'Everything Colorado homeowners need to know about mortgage protection insurance — how it works, what it costs, and whether it\'s right for you.',
    intro:       'Mortgage protection insurance pays off or covers your mortgage if you die or become disabled — so your family keeps the house no matter what. These guides explain how it works, what it costs in Colorado, and how to decide if it\'s right for your household.',
  },
  'life-insurance': {
    label:       'life insurance',
    h1:          'Life Insurance',
    title:       'Life Insurance Guides for Colorado Homeowners | CHP Blog',
    description: 'Plain-English life insurance guides for Colorado homeowners — term vs. whole life, how much coverage you need, and how to protect your family.',
    intro:       'Life insurance is one of the most important financial decisions a homeowner can make. These guides break down the different types of coverage, how much you need, and what to look for when shopping for a policy in Colorado.',
  },
  'term-life': {
    label:       'term life',
    h1:          'Term Life Insurance',
    title:       'Term Life Insurance Guides | Colorado Home Protection Blog',
    description: 'How term life insurance works, how much coverage Colorado homeowners need, and how it compares to mortgage protection insurance.',
    intro:       'Term life insurance provides a death benefit for a fixed number of years — typically 10, 20, or 30. It\'s the most affordable type of life insurance and a common choice for homeowners looking to cover their mortgage. These guides cover everything you need to know.',
  },
  'disability-insurance': {
    label:       'disability insurance',
    h1:          'Disability Insurance',
    title:       'Disability Insurance Guides | Colorado Home Protection Blog',
    description: 'How disability insurance protects your income and mortgage payments if you\'re unable to work — guides for Colorado homeowners.',
    intro:       'Most homeowners insure their home and their life — but forget to insure their income. Disability insurance replaces a portion of your paycheck if illness or injury prevents you from working. These guides explain how it works and what Colorado homeowners should consider.',
  },
  'final-expense': {
    label:       'final expense',
    h1:          'Final Expense Insurance',
    title:       'Final Expense Insurance Guides | Colorado Home Protection Blog',
    description: 'Final expense life insurance explained — how it works, who needs it, and how to find affordable coverage in Colorado.',
    intro:       'Final expense insurance is a small whole life policy designed to cover funeral costs and end-of-life expenses. It\'s easier to qualify for than most life insurance and stays in force for life. These guides help Colorado families understand their options.',
  },
  'medicare': {
    label:       'medicare',
    h1:          'Medicare',
    title:       'Medicare Guides for Colorado Homeowners | CHP Blog',
    description: 'Understanding Medicare options and how Medicare works alongside your other financial protections as a Colorado homeowner.',
    intro:       'Medicare can be confusing. These guides break it down in plain English — from understanding Parts A through D, to choosing a supplement plan, to knowing how Medicare fits alongside your other coverage as a Colorado homeowner.',
  },
  'colorado': {
    label:       'colorado',
    h1:          'Colorado Homeowner Guides',
    title:       'Colorado Mortgage Protection & Insurance Guides | CHP Blog',
    description: 'Local guides on mortgage protection and life insurance for Colorado homeowners in Denver, Colorado Springs, Fort Collins, Arvada, Lakewood, and more.',
    intro:       'Colorado homeowners face unique considerations when it comes to mortgage protection and life insurance. These guides cover city-specific resources and what Colorado residents should know before buying coverage.',
  },
};

function esc(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(request, context) {
  try {
    const url   = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    // Only intercept /topic/<slug> — not /topic/ base
    if (parts[0] !== 'topic' || parts.length < 2) {
      return context.next();
    }

    const slug  = parts[1];
    const topic = TOPICS[slug];

    if (!topic) {
      return context.next();
    }

    const canonical = `${SITE_BASE}/topic/${slug}/`;

    const response = await context.next();

    if (!response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    let html = await response.text();

    // Replace <title>
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${esc(topic.title)}</title>`
    );

    // Replace <meta name="description">
    html = html.replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${esc(topic.description)}">`
    );

    // Replace canonical
    html = html.replace(
      /<link rel="canonical" id="canonical"[^>]*>/,
      `<link rel="canonical" id="canonical" href="${canonical}">`
    );

    // Replace OG title
    html = html.replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${esc(topic.title)}">`
    );

    // Replace OG description
    html = html.replace(
      /<meta property="og:description"[^>]*>/,
      `<meta property="og:description" content="${esc(topic.description)}">`
    );

    // Replace OG url
    html = html.replace(
      /<meta property="og:url"[^>]*>/,
      `<meta property="og:url" content="${canonical}">`
    );

    // Inject data island before </head>
    const island = `<script>window.__TOPIC__ = ${JSON.stringify({ slug, label: topic.label, h1: topic.h1, intro: topic.intro })};</script>`;
    html = html.replace('</head>', `${island}\n</head>`);

    return new Response(html, {
      status:  response.status,
      headers: new Headers(response.headers),
    });

  } catch (_) {
    return context.next();
  }
}

export const config = { path: '/topic/*' };
