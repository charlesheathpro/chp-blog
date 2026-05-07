// Netlify Edge Function: inject SEO metadata + FAQ schema into post pages.
// Runs before static HTML is served so crawlers and AI search tools see
// correct titles, meta descriptions, and structured data immediately.

const SITE_BASE = 'https://blog.coloradohomeprotection.net';

// ── Per-slug SEO overrides ────────────────────────────────────────────────
// title: replaces <title> tag
// description: replaces meta description
// faq: injected as FAQPage JSON-LD schema (boosts AI citation & featured snippets)

const POST_META = {

  'mortgage-protection-insurance-cost-colorado': {
    title: 'Mortgage Protection Insurance Cost in Colorado: 2026 Average Monthly Premiums',
    description: 'What does mortgage protection insurance cost in Colorado in 2026? See average monthly premiums by age, health class, and term length — plus a free rate calculator.',
    faq: [
      { q: 'What is the average cost of mortgage protection insurance in Colorado in 2026?', a: 'The average monthly premium ranges from $20 to $150 depending on age, mortgage balance, and health. A healthy 35-year-old with a $300,000 mortgage on a 20-year term typically pays $38–$55/month in Colorado.' },
      { q: 'What factors affect mortgage protection insurance premiums in Colorado?', a: 'The main factors are age, mortgage balance, term length, health class, gender, and tobacco use. Age is the single biggest driver — premiums increase significantly with each decade.' },
      { q: 'Is mortgage protection insurance cheaper than regular life insurance in Colorado?', a: 'For healthy applicants, term life insurance is often cheaper per dollar of coverage. However, mortgage protection insurance may be easier to qualify for with health issues. A licensed Colorado agent can compare both options side by side.' },
    ],
  },

  'can-you-get-mortgage-protection-without-medical-exam-colorado': {
    title: 'No Medical Exam Mortgage Protection Insurance in Colorado: Companies & Options (2026)',
    description: 'Looking for no medical exam mortgage protection insurance in Colorado? Compare simplified and guaranteed issue options from companies serving Colorado homeowners in 2026.',
    faq: [
      { q: 'Can I get mortgage protection insurance in Colorado without a medical exam?', a: 'Yes. Several companies offer simplified issue or guaranteed issue mortgage protection insurance in Colorado requiring no medical exam — just a few health questions, no blood work or physical.' },
      { q: 'What companies offer no medical exam mortgage protection insurance in Colorado?', a: 'Multiple top-rated carriers offer no-exam coverage in Colorado. A licensed independent agent can compare several carriers simultaneously to find the best rate for your situation.' },
      { q: 'Is no medical exam mortgage protection insurance more expensive in Colorado?', a: 'Generally yes — no-exam policies carry slightly higher premiums because the insurer takes on more risk. For applicants with health issues, it may still be the most affordable option available.' },
    ],
  },

  'can-smokers-get-mortgage-protection-insurance': {
    title: 'Colorado Mortgage Protection Insurance Smoker Rates 2026 — Monthly Cost at Age 45',
    description: 'What do smokers pay for mortgage protection insurance in Colorado in 2026? See average monthly rates for a 45-year-old smoker by term length and how to qualify for lower rates.',
    faq: [
      { q: 'What is the average monthly cost of mortgage protection insurance for a 45-year-old smoker in Colorado in 2026?', a: 'A 45-year-old smoker in Colorado typically pays 2.5–3x the non-smoker rate. For a $300,000 mortgage on a 20-year term, that is approximately $180–$280/month versus $70–$110/month for a non-smoker.' },
      { q: 'Can smokers get mortgage protection insurance in Colorado?', a: 'Yes. Most carriers serving Colorado issue mortgage protection insurance to tobacco users, though at significantly higher rates. Shopping multiple carriers through an independent agent is essential to find the lowest smoker rate.' },
      { q: 'How long do you have to quit smoking to get non-smoker rates in Colorado?', a: 'Most Colorado carriers require 12 consecutive months tobacco-free to qualify for non-smoker pricing. Some require 24 months. Quitting is the single biggest way to reduce your mortgage protection premium.' },
    ],
  },

  'what-happens-to-mortgage-when-co-borrower-dies-colorado': {
    title: 'Colorado Law: What Happens to a Mortgage When a Co-Borrower Dies — Due-on-Sale, Probate & Surviving Spouse Rights',
    description: 'When a co-borrower dies in Colorado, what happens to the mortgage? Learn how Colorado law, the Garn-St Germain Act, probate, and due-on-sale clauses affect your home.',
    faq: [
      { q: 'What happens to a mortgage in Colorado when a co-borrower dies?', a: 'The surviving co-borrower becomes solely responsible for the mortgage. Under the federal Garn-St Germain Act, the lender cannot invoke the due-on-sale clause simply because one borrower died.' },
      { q: 'Does a mortgage go through probate in Colorado when a co-borrower dies?', a: 'The mortgage itself does not go through probate, but the property may if it was not jointly titled. An heir who inherits through probate can assume the mortgage under Colorado law without triggering a due-on-sale clause.' },
      { q: 'Can a Colorado lender foreclose after a co-borrower dies?', a: 'A lender cannot foreclose solely because a co-borrower died. However, if payments stop, the lender can foreclose for non-payment — which is precisely the scenario mortgage protection insurance is designed to prevent.' },
    ],
  },

  'what-happens-to-mortgage-when-primary-earner-dies-colorado': {
    title: 'What Happens to the Mortgage When the Primary Earner Dies in Colorado?',
    description: 'If the primary income earner dies in Colorado, what happens to the mortgage? Learn about Colorado law, surviving spouse rights, and how mortgage protection insurance protects your family.',
    faq: [
      { q: 'What happens to a mortgage in Colorado when the primary earner dies?', a: 'The mortgage balance does not disappear — it remains owed by whoever inherits the property. The surviving spouse typically assumes full responsibility and must continue payments, refinance, or sell the home.' },
      { q: 'Can a surviving spouse keep the house in Colorado if the primary earner dies?', a: 'Yes, in most cases. Federal Garn-St Germain Act protections prevent lenders from calling the loan due simply because a spouse died. However, the surviving spouse must be able to continue making payments.' },
      { q: 'How does mortgage protection insurance help when the primary earner dies in Colorado?', a: 'Mortgage protection insurance pays off the remaining mortgage balance upon the death of the insured, eliminating the home loan entirely and removing the family\'s largest expense during an already devastating time.' },
    ],
  },

  'what-happens-to-mortgage-when-someone-dies': {
    title: 'What Happens to a Mortgage When Someone Dies in Colorado? Due-on-Sale, Probate & Your Options',
    description: 'What happens to a mortgage in Colorado when the homeowner dies? Learn about due-on-sale clauses, probate, surviving spouse rights, and how mortgage protection insurance protects your family.',
    faq: [
      { q: 'What happens to a mortgage when someone dies in Colorado?', a: 'In Colorado, the mortgage does not disappear when a homeowner dies. The outstanding balance transfers to whoever inherits the property. Federal law under the Garn-St Germain Act prevents the lender from calling the loan due solely because of death.' },
      { q: 'Does a mortgage go into probate in Colorado when the homeowner dies?', a: 'The mortgage itself does not go through probate, but the property may if titled solely in the deceased\'s name. It typically passes through Colorado probate court before ownership can be formally transferred.' },
      { q: 'Can a lender foreclose on a home in Colorado after the homeowner dies?', a: 'A lender cannot foreclose because someone died, but can foreclose for non-payment. Mortgage protection insurance prevents this by paying off the loan balance in full upon the insured\'s death.' },
    ],
  },

  'what-happens-if-surviving-spouse-cannot-afford-mortgage-colorado': {
    title: 'What Happens If a Surviving Spouse Cannot Afford the Mortgage in Colorado?',
    description: 'If a surviving spouse in Colorado cannot afford mortgage payments after a death, what are the options? Learn about Colorado law, lender options, and how mortgage protection insurance prevents this situation.',
    faq: [
      { q: 'What options does a surviving spouse have in Colorado if they cannot afford the mortgage?', a: 'Options include loan modification, refinancing, forbearance, selling the home, or a short sale. A Colorado housing counselor can help evaluate the best path. Mortgage protection insurance would have paid off the mortgage entirely, preventing this situation.' },
      { q: 'Can a Colorado lender foreclose on a surviving spouse who cannot pay the mortgage?', a: 'Yes — while a lender cannot foreclose because of a death, they can foreclose for non-payment. Colorado follows a deed of trust foreclosure process that typically takes 4–6 months.' },
      { q: 'How does mortgage protection insurance protect surviving spouses in Colorado?', a: 'Mortgage protection insurance pays the full remaining mortgage balance upon the insured\'s death, meaning the surviving spouse owns the home free and clear and never faces foreclosure risk.' },
    ],
  },

  'mortgage-protection-for-recently-widowed-homeowners-colorado': {
    title: 'Colorado Surviving Spouse Mortgage Protections: Garn-St Germain, Homestead & Foreclosure Rights',
    description: 'Widowed in Colorado and worried about your mortgage? Learn your legal rights under the Garn-St Germain Act, Colorado homestead exemption, elective share, and foreclosure protections.',
    faq: [
      { q: 'What mortgage protections does a surviving spouse have in Colorado?', a: 'Colorado surviving spouses are protected by the federal Garn-St Germain Act, which prevents lenders from invoking due-on-sale clauses when a spouse dies. Colorado also provides a homestead exemption protecting up to $250,000 of home equity from creditors.' },
      { q: 'What is the Garn-St Germain Act and how does it protect Colorado surviving spouses?', a: 'The Garn-St Germain Depository Institutions Act of 1982 prohibits lenders from enforcing due-on-sale clauses when property transfers to a relative upon death. In Colorado, this means a surviving spouse can assume the mortgage without the lender demanding full repayment.' },
      { q: 'Can a lender foreclose on a Colorado home after a spouse dies?', a: 'A lender cannot foreclose because a spouse died, but can foreclose for non-payment. Mortgage protection insurance eliminates this risk by paying off the loan upon the insured\'s death.' },
    ],
  },

  'is-mortgage-protection-insurance-worth-it-colorado': {
    title: 'Is Mortgage Protection Insurance Required by Lenders in Colorado — And Is It Worth It?',
    description: 'Is mortgage protection insurance required in Colorado? Lenders cannot require it, but many homeowners choose it. See who it is worth it for, what it costs, and how it compares to term life.',
    faq: [
      { q: 'Is mortgage protection insurance required by lenders in Colorado?', a: 'No. Colorado lenders cannot legally require you to purchase mortgage protection insurance as a condition of your loan. It is an entirely voluntary product — lenders may recommend it, but the choice is yours.' },
      { q: 'Is mortgage protection insurance worth it for Colorado homeowners?', a: 'For homeowners with dependents, a single income, or health issues that make term life expensive, mortgage protection insurance provides strong value. For healthy dual-income households, standard term life insurance may offer better coverage at lower cost.' },
      { q: 'What is the difference between PMI and mortgage protection insurance in Colorado?', a: 'PMI (Private Mortgage Insurance) is required by lenders when your down payment is under 20% and protects the lender. Mortgage protection insurance is optional, protects your family, and pays off your mortgage if you die.' },
    ],
  },

  'mortgage-protection-in-colorado-how-it-works': {
    title: 'How Mortgage Protection Insurance Works in Colorado — 2026 Complete Guide',
    description: 'How does mortgage protection insurance work in Colorado? Learn what it covers, how claims are filed, what it costs in 2026, and how to get coverage from a licensed Colorado agent.',
    faq: [
      { q: 'How does mortgage protection insurance work in Colorado?', a: 'You pay a fixed monthly premium for a term matching your mortgage length. If you die during that term, the insurance pays off your remaining mortgage balance — ensuring your family keeps the home free and clear.' },
      { q: 'How does a mortgage protection insurance claim work in Colorado?', a: 'The beneficiary submits a death certificate, policy number, and claim form to the insurer. The insurer verifies the claim and pays the remaining mortgage balance, typically within 30–60 days.' },
      { q: 'How do I get mortgage protection insurance in Colorado?', a: 'Contact a licensed Colorado insurance agent who can shop multiple carriers and compare rates for your specific age, mortgage balance, and health profile. Most applications can be completed in a single phone call.' },
    ],
  },

  'mortgage-protection-insurance-colorado-how-it-works': {
    title: 'Mortgage Protection Insurance in Colorado: How It Works, What It Costs & How to Apply (2026)',
    description: 'Everything Colorado homeowners need to know about mortgage protection insurance in 2026 — how it works, what it costs, how claims are paid, and how to apply through a licensed Colorado agent.',
    faq: [
      { q: 'What does mortgage protection insurance cover in Colorado?', a: 'Mortgage protection insurance covers your remaining mortgage balance if you die during the policy term. Some policies also include disability or involuntary unemployment riders that pause payments if you cannot work.' },
      { q: 'How long does it take to get mortgage protection insurance in Colorado?', a: 'Simplified issue policies with no medical exam can be approved in 24–48 hours. Fully underwritten policies with a medical exam typically take 2–6 weeks. Many Colorado homeowners choose simplified issue to get covered quickly after closing.' },
      { q: 'What is the mortgage protection insurance claim process in Colorado?', a: 'File a claim by contacting your insurer with a death certificate and policy information. The insurer reviews and pays the remaining mortgage balance within 30–60 days, directly eliminating the debt.' },
    ],
  },

  'best-age-mortgage-protection-colorado': {
    title: 'Average Mortgage Protection Insurance Rates by Age in Colorado (2026) — Best Age to Buy',
    description: 'What are average mortgage protection insurance rates by age in Colorado in 2026? See how premiums change at 35, 45, and 55 — and why buying younger saves thousands over the life of your policy.',
    faq: [
      { q: 'What is the best age to get mortgage protection insurance in Colorado?', a: 'The best age is as early as possible. Premiums lock in at your current age and health — a 35-year-old pays dramatically less than a 45-year-old for identical coverage over the full policy term.' },
      { q: 'What are average mortgage protection insurance rates for a 45-year-old in Colorado in 2026?', a: 'A 45-year-old non-smoker with standard health in Colorado can expect $76–$112/month for a $300,000 mortgage on a 30-year term. Preferred health pricing can reduce this 20–30%.' },
      { q: 'How much does mortgage protection insurance increase with age in Colorado?', a: 'Increases are gradual through your 30s, steeper in your 40s, and significant in your 50s. Locking in before age 40 is generally recommended to minimize lifetime premium costs.' },
    ],
  },

  'mortgage-protection-vs-life-insurance-colorado': {
    title: 'Mortgage Protection Insurance vs Life Insurance in Colorado: Which Is Better? (2026)',
    description: 'Comparing mortgage protection insurance vs life insurance in Colorado? See key differences in cost, flexibility, and eligibility — and which option makes more sense for your situation in 2026.',
    faq: [
      { q: 'What is the difference between mortgage protection insurance and life insurance in Colorado?', a: 'Life insurance pays a cash benefit to beneficiaries who can use it for anything. Mortgage protection insurance specifically pays off your home loan. Life insurance is more flexible; mortgage protection insurance is easier to qualify for and protects your home directly.' },
      { q: 'Is mortgage protection insurance cheaper than term life insurance in Colorado?', a: 'For healthy applicants, term life is often cheaper per dollar of coverage. However, mortgage protection insurance is more accessible for those with health issues or who have been declined for traditional life insurance.' },
      { q: 'Which is better for Colorado homeowners — mortgage protection or term life insurance?', a: 'It depends on your health and financial situation. A licensed Colorado agent can compare both products side by side and recommend the option that provides the best coverage for your premium dollar.' },
    ],
  },

  'term-life-vs-mortgage-protection-which-is-better': {
    title: 'Term Life vs Mortgage Protection Insurance for Colorado Homeowners: Which Is Better? (2026)',
    description: 'Term life vs mortgage protection insurance — which is better for Colorado homeowners in 2026? Compare cost, flexibility, and which one protects your family and home most effectively.',
    faq: [
      { q: 'Is term life insurance better than mortgage protection insurance for Colorado homeowners?', a: 'Term life is generally more flexible and often cheaper for healthy applicants — beneficiaries receive cash usable for the mortgage or anything else. Mortgage protection insurance is simpler, easier to qualify for, and designed specifically to protect the home.' },
      { q: 'Can I use term life insurance to cover my mortgage in Colorado?', a: 'Yes. A term life policy with a death benefit matching your mortgage balance effectively protects your home. Many Colorado homeowners choose this for the added flexibility of the cash benefit.' },
      { q: 'Which has lower premiums in Colorado — term life or mortgage protection insurance?', a: 'For healthy non-smokers under 50, term life typically has lower premiums per dollar of coverage. For those with health issues or prior coverage declines, mortgage protection insurance is often more accessible.' },
    ],
  },

  'do-you-need-mortgage-protection-if-you-have-life-insurance': {
    title: 'Do You Need Mortgage Protection Insurance If You Already Have Life Insurance in Colorado?',
    description: 'Already have life insurance in Colorado? Learn whether you still need mortgage protection insurance, how the two differ, and how to avoid being underinsured on your home.',
    faq: [
      { q: 'Do you need mortgage protection insurance if you already have life insurance in Colorado?', a: 'Not necessarily — if your life insurance death benefit is large enough to pay off your mortgage, you may already be covered. However, employer-provided policies are not portable, meaning you lose coverage if you change jobs.' },
      { q: 'What if my life insurance does not fully cover my Colorado mortgage?', a: 'If there is a gap between your life insurance payout and remaining mortgage balance, mortgage protection insurance can fill that gap specifically. A Colorado agent can review your current coverage and identify any shortfall.' },
      { q: 'Can I have both life insurance and mortgage protection insurance in Colorado?', a: 'Yes, and many Colorado homeowners carry both. Life insurance covers broader needs like income replacement and debt, while mortgage protection insurance specifically ensures the home is paid off regardless of other expenses.' },
    ],
  },

  'what-to-expect-when-applying-for-mortgage-protection-insurance-colorado': {
    title: 'How to Apply for Mortgage Protection Insurance in Colorado — Step-by-Step Process (2026)',
    description: 'What is the process for applying for mortgage protection insurance in Colorado in 2026? Learn what to expect, how long it takes, what you need, and how a licensed Colorado agent shops multiple carriers for you.',
    faq: [
      { q: 'How do I apply for mortgage protection insurance in Colorado?', a: 'Contact a licensed Colorado insurance agent. They gather your mortgage balance, age, and health history, then shop multiple carriers to find your best rate. Most applications are completed in a single phone call.' },
      { q: 'How long does it take to get mortgage protection insurance in Colorado?', a: 'Simplified issue policies with no medical exam can be approved in 24–48 hours. Fully underwritten policies take 2–6 weeks. Many Colorado homeowners choose simplified issue to get covered quickly after closing.' },
      { q: 'What is the Colorado mortgage protection insurance claim process?', a: 'Submit a death certificate, policy number, and claim form to the insurer. They verify the claim and pay the remaining mortgage balance within 30–60 days, directly eliminating the debt on the home.' },
    ],
  },

  'what-affects-mortgage-protection-insurance-cost': {
    title: 'What Affects Mortgage Protection Insurance Cost in Colorado? 2026 Rate Factors Explained',
    description: 'What drives mortgage protection insurance rates in Colorado? Learn how age, health, term length, tobacco use, and mortgage balance affect your 2026 monthly premium.',
    faq: [
      { q: 'What factors affect mortgage protection insurance cost in Colorado?', a: 'The main factors are age (the biggest driver), mortgage balance, term length, health class, gender, and tobacco use. Each factor is applied as a multiplier to your base premium.' },
      { q: 'How much does tobacco use increase mortgage protection insurance rates in Colorado?', a: 'Tobacco users in Colorado typically pay 2.5–3x the non-smoker rate. Quitting for 12 consecutive months usually qualifies you for non-smoker pricing at most carriers.' },
      { q: 'Does health class significantly affect mortgage protection insurance rates in Colorado?', a: 'Yes. Preferred health pricing can be 20–40% lower than standard health pricing for the same age and coverage. Managed conditions like high blood pressure do not necessarily disqualify you.' },
    ],
  },

  'mortgage-protection-colorado-health-issues': {
    title: 'Mortgage Protection Insurance in Colorado With Health Issues — Who Qualifies in 2026?',
    description: 'Can you get mortgage protection insurance in Colorado with health problems in 2026? Learn which conditions are insurable, what no-exam options exist, and how Colorado agents shop carriers for you.',
    faq: [
      { q: 'Can I get mortgage protection insurance in Colorado if I have health problems?', a: 'Yes, in many cases. Simplified and guaranteed issue policies require no medical exam and are available to Colorado homeowners with managed conditions like diabetes, high blood pressure, or prior cancer history.' },
      { q: 'What health conditions might disqualify someone from mortgage protection insurance in Colorado?', a: 'Terminal illness, recent major cardiac events, or certain advanced conditions may disqualify applicants from some carriers. However, guaranteed issue policies have no health questions at all — though at higher rates.' },
      { q: 'How do Colorado agents help people with health issues get mortgage protection insurance?', a: 'An independent Colorado agent shops multiple carriers simultaneously, each with different underwriting guidelines. A condition that disqualifies you at one carrier may be fully insurable at another.' },
    ],
  },

  'how-fast-can-you-get-mortgage-protection-after-closing-colorado': {
    title: 'How Fast Can You Get Mortgage Protection Insurance After Closing in Colorado? (2026)',
    description: 'Just closed on a Colorado home and need mortgage protection insurance fast? Learn how quickly you can get covered in 2026 — some policies are approved in under 48 hours.',
    faq: [
      { q: 'How quickly can you get mortgage protection insurance after closing in Colorado?', a: 'Simplified issue policies with no medical exam can be approved and active in 24–48 hours after closing. Fully underwritten policies take 2–6 weeks. You can apply the same day you close.' },
      { q: 'Is there a waiting period for mortgage protection insurance in Colorado?', a: 'Some policies have a short waiting period of 2 years for death by natural causes, but accidental death is typically covered immediately. Review policy terms with your agent before applying.' },
      { q: 'What information do I need to apply for mortgage protection insurance right after closing in Colorado?', a: 'You need your mortgage statement showing the balance and lender, a government-issued ID, and answers to health questions. Your agent can start the application the same day you receive your closing documents.' },
    ],
  },

};

// ── Build FAQPage JSON-LD from faq array ──────────────────────────────────
function buildFaqSchema(faqItems) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  });
}

// ── Edge Function Handler ─────────────────────────────────────────────────
export default async function handler(request, context) {
  try {
    const url   = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] !== 'post' || parts.length < 2) {
      return context.next();
    }

    const slug      = decodeURIComponent(parts.slice(1).join('/').replace(/\/$/, ''));
    const canonical = `${SITE_BASE}/post/${slug}/`;
    const meta      = POST_META[slug] || null;

    const response = await context.next();

    if (!response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    let html = await response.text();

    // ── Always: fix canonical ────────────────────────────────────────────
    html = html.replace(
      /<link rel="canonical" id="canonical"[^>]*>/,
      `<link rel="canonical" id="canonical" href="${canonical}">`
    );

    // ── If slug has overrides: inject title, meta description, FAQ schema ─
    if (meta) {
      // Title
      html = html.replace(
        /<title>[^<]*<\/title>/,
        `<title>${meta.title}</title>`
      );

      // Meta description — replace if exists, otherwise inject before </head>
      if (/<meta name="description"[^>]*>/.test(html)) {
        html = html.replace(
          /<meta name="description"[^>]*>/,
          `<meta name="description" content="${meta.description}">`
        );
      } else {
        html = html.replace(
          '</head>',
          `<meta name="description" content="${meta.description}">\n</head>`
        );
      }

      // FAQ schema — inject before </head>
      if (meta.faq?.length) {
        const schemaTag = `<script type="application/ld+json">${buildFaqSchema(meta.faq)}</script>`;
        html = html.replace('</head>', `${schemaTag}\n</head>`);
      }
    }

    return new Response(html, {
      status:  response.status,
      headers: new Headers(response.headers),
    });

  } catch (_) {
    return context.next();
  }
}

export const config = { path: '/post/*' };
