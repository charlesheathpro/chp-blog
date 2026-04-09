'use strict';

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const slug = (event.queryStringParameters || {}).slug;
  if (!slug) return { statusCode: 400, body: '[]' };

  const store = getStore({
    name:   'related-posts',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_AUTH_TOKEN,
  });

  try {
    const raw = await store.get(slug, { type: 'text' });
    if (!raw) return { statusCode: 404, body: '[]' };
    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
      body: raw,
    };
  } catch {
    return { statusCode: 404, body: '[]' };
  }
};
