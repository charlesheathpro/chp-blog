'use strict';

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const slug = (event.queryStringParameters || {}).slug;
  if (!slug) {
    return { statusCode: 400, body: 'Missing slug' };
  }

  const store = getStore({
    name:   'post-images',
    siteID: process.env.NETLIFY_SITE_ID || process.env.SITE_ID,
    token:  process.env.NETLIFY_AUTH_TOKEN,
  });

  try {
    const result = await store.getWithMetadata(slug, { type: 'arrayBuffer' });
    if (!result || !result.data) {
      return { statusCode: 404, body: 'Image not yet generated' };
    }

    const contentType = result.metadata?.contentType || 'image/png';
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(result.data).toString('base64'),
      isBase64Encoded: true,
    };
  } catch {
    return { statusCode: 404, body: 'Image not found' };
  }
};
