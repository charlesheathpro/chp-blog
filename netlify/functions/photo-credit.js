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
    if (!raw) return { statusCode: 404, body: '{}' };

    let meta;
    try { meta = JSON.parse(raw); } catch { return { statusCode: 404, body: '{}' }; }

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        photographer:    meta.photographer    || '',
        photographerUrl: meta.photographerUrl || '',
        pexelsUrl:       meta.pexelsUrl       || '',
      }),
    };
  } catch {
    return { statusCode: 404, body: '{}' };
  }
};
