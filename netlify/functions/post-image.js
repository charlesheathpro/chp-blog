'use strict';

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const slug = (event.queryStringParameters || {}).slug;
  if (!slug) {
    return { statusCode: 400, body: 'Missing slug' };
  }

  const store = getStore({
    name:   'post-images-v2',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_AUTH_TOKEN,
  });

  try {
    const raw = await store.get(slug, { type: 'text' });
    if (!raw) {
      return { statusCode: 404, body: 'Image not yet generated' };
    }

    let meta;
    try {
      meta = JSON.parse(raw);
    } catch {
      // Old binary format from previous DALL-E version — treat as missing
      return { statusCode: 404, body: 'Image regenerating' };
    }

    if (!meta?.url) {
      return { statusCode: 404, body: 'Invalid image record' };
    }

    return {
      statusCode: 302,
      headers: {
        Location:        meta.url,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
      body: '',
    };
  } catch {
    return { statusCode: 404, body: 'Image not found' };
  }
};
