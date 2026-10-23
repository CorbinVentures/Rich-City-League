#!/usr/bin/env node
// Check the actual first HTTP document, not a hydrated DOM or a source string.
// Run against a built local server and the exact Vercel preview commit URL.
const url = process.env.PUBLIC_HOME_URL ?? 'http://127.0.0.1:3105/';
const requests = Number(process.env.PUBLIC_HOME_REQUESTS ?? 5);

if (!Number.isInteger(requests) || requests < 1 || requests > 100) {
  throw new Error('PUBLIC_HOME_REQUESTS must be an integer from 1 through 100');
}

function renderedElementsWithClass(html, className, tag = '[a-z][a-z0-9-]*') {
  // Inspect rendered tags, not JSON/RSC payload strings that only mention a class.
  const tags = new RegExp('<' + tag + '\\b[^>]*\\bclass=(["\\\'])([^"\\\']*)\\1', 'gi');
  return [...html.matchAll(tags)].filter((match) => match[2].split(/\\s+/).includes(className)).length;
}

for (let i = 0; i < requests; i += 1) {
  const begin = performance.now();
  const response = await fetch(url, { headers: { Accept: 'text/html' }, redirect: 'follow' });
  const html = await response.text();
  const ms = Math.round(performance.now() - begin);
  const header = renderedElementsWithClass(html, 'rch-public-header', 'header');
  const home = renderedElementsWithClass(html, 'rch-browser-home', 'main');
  const loader = renderedElementsWithClass(html, 'rch-browser-loading');

  console.log('Homepage response ' + (i + 1) + '/' + requests
    + ': HTTP ' + response.status + ', ' + ms + 'ms, headers=' + header
    + ', home=' + home + ', mode-loaders=' + loader);

  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')
      || header !== 1 || home !== 1 || loader !== 0) {
    throw new Error('Missing server-rendered public shell or unexpected loading fallback on response ' + (i + 1));
  }
}
