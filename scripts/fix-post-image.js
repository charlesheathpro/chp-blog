#!/usr/bin/env node
/**
 * Force-regenerates the Pexels image for a specific post slug.
 * Usage: netlify env:pull .env && node scripts/fix-post-image.js
 *
 * Requires: PEXELS_API_KEY, NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID in env.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getStore } = require('@netlify/blobs');

const PEXELS_API_BASE = 'https://api.pexels.com/v1';

const OVERRIDES = [
  {
    slug:  'what-happens-to-mortgage-when-co-borrower-dies-colorado',
    query: 'american couple home mortgage paperwork USA',
  },
  // Add more overrides here as needed:
  // { slug: 'blog-post_19', query: '...' },
];

async function fetchPexelsPhoto(slug, query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error('PEXELS_API_KEY not set');

  const res = await fetch(
    `${PEXELS_API_BASE}/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape&size=large`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.photos?.length) throw new Error(`No results for query: "${query}"`);

  // Deterministic pick by slug hash (same logic as generate-images)
  const hash  = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const photo = data.photos[Math.abs(hash) % data.photos.length];

  return {
    url:             photo.src.large2x || photo.src.large,
    photographer:    photo.photographer,
    photographerUrl: photo.photographer_url,
    pexelsUrl:       photo.url,
  };
}

async function main() {
  const store = getStore({
    name:   'post-images-v2',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_AUTH_TOKEN,
  });

  // Load manifest
  let manifest = {};
  try {
    const raw = await store.get('__manifest', { type: 'text' });
    if (raw) manifest = JSON.parse(raw);
  } catch {}

  for (const override of OVERRIDES) {
    const { slug, query } = override;
    console.log(`\nProcessing: ${slug}`);
    console.log(`  Query: "${query}"`);
    try {
      const meta = await fetchPexelsPhoto(slug, query);
      await store.set(slug, JSON.stringify(meta));
      manifest[slug] = true;
      console.log(`  ✓ New image: ${meta.url}`);
      console.log(`  ✓ Photographer: ${meta.photographer}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  // Save updated manifest
  await store.set('__manifest', JSON.stringify(manifest));
  console.log('\nDone. Clear your CDN cache or wait for it to expire.');
}

main().catch(err => { console.error(err); process.exit(1); });
