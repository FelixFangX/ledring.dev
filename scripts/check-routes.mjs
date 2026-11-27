import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Import as ESM without requiring a package.json or changing the Worker's format.
const source = readFileSync('src/index.js', 'utf8');
const { default: worker, canonicalURL } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
// Exercise the registered selectors and mutations, without a Cloudflare runtime.
globalThis.HTMLRewriter = class {
  handlers = [];
  on(selector, handler) { this.handlers.push([selector, handler]); return this; }
  transform(asset) {
    const handlers = this.handlers;
    const body = new ReadableStream({ async start(controller) {
      let html = await asset.text();
      for (const [selector, handler] of handlers) {
        const pattern = selector === 'html' ? /<html\b[^>]*>/g : selector === 'link[rel="canonical"]' ? /<link rel="canonical"[^>]*>/g : /<meta property="og:url"[^>]*>/g;
        html = html.replace(pattern, tag => {
          handler.element({ setAttribute(name, value) {
            const attr = new RegExp(` ${name}="[^"]*"`);
            tag = attr.test(tag) ? tag.replace(attr, ` ${name}="${value}"`) : tag.replace('>', ` ${name}="${value}">`);
          } });
          return tag;
        });
      }
      controller.enqueue(new TextEncoder().encode(html)); controller.close();
    } });
    return new Response(body, { status: asset.status, headers: asset.headers });
  }
};
const env = { ASSETS: { async fetch(request) {
  const path = new URL(request.url).pathname;
  const html = !path.endsWith('.css');
  return new Response(html ? '<html lang="en"><link rel="canonical" href="https://ledring.dev/projects/"><meta property="og:url" content="https://ledring.dev/projects/"></html>' : 'body{}', { headers: { 'Content-Type': html ? 'text/html' : 'text/css', 'Cache-Control': 'public, max-age=3600' } });
} } };
for (const host of ['ledring.dev', 'ledring-landing-preview.ledring.workers.dev', 'version-ledring-landing-preview.ledring.workers.dev']) {
  for (const method of ['GET', 'HEAD']) {
    for (const [path, target] of [['/projects', '/projects/'], ['/notes?x=1', '/notes/?x=1']]) {
      const res = await worker.fetch(new Request(`https://${host}${path}`, { method }), env);
      assert.equal(res.status, 301);
      assert.equal(res.headers.get('Location'), `https://${host}${target}`);
      assert.equal(res.headers.get('X-Robots-Tag'), host.endsWith('.workers.dev') ? 'noindex, nofollow' : null);
    }
    for (const path of ['/', '/tools/', '/projects/', '/projects/index.html', '/notes/', '/notes/index.html', '/style.css', '/gh']) {
      const res = await worker.fetch(new Request(`https://${host}${path}`, { method }), env);
      assert.equal(res.headers.get('X-Robots-Tag'), host.endsWith('.workers.dev') ? 'noindex, nofollow' : null);
      if (/^\/(tools|projects|notes)\//.test(path)) assert.equal(res.headers.get('Cache-Control'), 'private, no-store, no-transform');
      if (path === '/style.css') assert.equal(res.headers.get('Cache-Control'), 'public, max-age=3600');
      if (method === 'HEAD') assert.equal(await res.text(), '');
    }
  }
}
assert.equal(canonicalURL(new URL('https://ledring.dev/projects/?lang=zh&utm=1')), 'https://ledring.dev/projects/?lang=zh');
assert.equal(canonicalURL(new URL('https://preview.workers.dev/projects/index.html?lang=en&x=1')), 'https://ledring.dev/projects/?lang=en');
for (const lang of ['en', 'zh', 'invalid']) {
  const res = await worker.fetch(new Request(`https://ledring.dev/projects/?lang=${lang}&utm=1`, { headers: { 'Accept-Language': 'en' } }), env);
  const html = await res.text();
  assert(html.includes(`lang="${lang === 'zh' ? 'zh-CN' : 'en'}"`));
  const canonical = `https://ledring.dev/projects/${lang === 'invalid' ? '' : '?lang='+lang}`;
  assert(html.includes(`href="${canonical}"`));
  assert(html.includes(`content="${canonical}"`));
}
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
assert.match(sitemap, /<urlset\s[^>]*xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml"[^>]*>/);
assert(sitemap.trim().endsWith('</urlset>'));
const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]);
const sitemapPaths = ['', 'tools/', 'projects/', 'notes/', 'notes/harness-notes-part-1/'];
assert.equal(urls.length, sitemapPaths.length);
for (const path of sitemapPaths) {
  const url = 'https://ledring.dev/'+path;
  const entry = urls.find(entry => entry.includes(`<loc>${url}</loc>`));
  assert(entry, url);
  for (const [lang, query] of [['en', '?lang=en'], ['zh-CN', '?lang=zh'], ['x-default', '']]) {
    assert(entry.includes(`hreflang="${lang}" href="${url}${query}"`));
    const html = readFileSync(`public/${path}index.html`, 'utf8');
    assert(html.includes(`rel="alternate" hreflang="${lang}" href="${url}${query}"`));
    assert(html.includes(`rel="canonical" href="${url}"`));
  }
}
console.log('Routes: redirects, GET/HEAD, preview noindex, HTML caching and localized canonical/og:url OK');
console.log(`Sitemap: ${sitemapPaths.length} URLs with en, zh-CN and x-default alternates; page SEO links OK`);

// Discovery files must pass through ASSETS without localization or rewriting.
for (const path of ['/llms.txt', '/projects.json']) {
  const body = readFileSync(`public${path}`, 'utf8');
  for (const method of ['GET', 'HEAD']) {
    let fetched = false;
    const headers = { 'Content-Type': path.endsWith('.json') ? 'application/json' : 'text/plain', 'Cache-Control': 'public, max-age=3600' };
    const assets = { ASSETS: { async fetch(request) {
      assert.equal(new URL(request.url).pathname, path);
      assert.equal(request.method, 'GET');
      fetched = true;
      return new Response(body, { status: 200, headers });
    } } };
    const response = await worker.fetch(new Request(`https://ledring.dev${path}`, { method, headers: { 'Accept-Language': 'zh-CN' } }), assets);
    assert(fetched);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), method === 'HEAD' ? '' : body);
    for (const [key, value] of Object.entries(headers)) assert.equal(response.headers.get(key), value);
    assert.equal(response.headers.get('Vary'), null);
  }
}
console.log('Discovery assets: /llms.txt and /projects.json pass through ASSETS unchanged with 200');

// RSS feed must be valid RSS 2.0 with self-link, wired into HTML, and served as application/rss+xml.
const rss = readFileSync('public/rss.xml', 'utf8');
assert(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert(rss.includes('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'));
assert(rss.includes('<atom:link href="https://ledring.dev/rss.xml" rel="self" type="application/rss+xml"/>'));
assert(rss.includes('<link>https://ledring.dev/notes/harness-notes-part-1/</link>'));
assert(rss.includes('<pubDate>Tue, 03 Nov 2026 00:00:00 GMT</pubDate>'));
assert(rss.trim().endsWith('</rss>'));
const rssLink = '<link rel="alternate" type="application/rss+xml" title="ledring.dev notes" href="/rss.xml">';
for (const page of ['public/index.html', 'public/notes/index.html']) {
  assert(readFileSync(page, 'utf8').includes(rssLink), `${page}: missing RSS link`);
}
for (const method of ['GET', 'HEAD']) {
  let fetched = false;
  const assets = { ASSETS: { async fetch(request) {
    assert.equal(new URL(request.url).pathname, '/rss.xml');
    assert.equal(request.method, 'GET');
    fetched = true;
    return new Response(rss, { status: 200, headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } });
  } } };
  const response = await worker.fetch(new Request('https://ledring.dev/rss.xml', { method, headers: { 'Accept-Language': 'zh-CN' } }), assets);
  assert(fetched);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/rss+xml; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=3600');
  assert.equal(response.headers.get('Vary'), null);
  assert.equal(await response.text(), method === 'HEAD' ? '' : rss);
}
console.log('RSS feed: /rss.xml valid RSS 2.0, autodiscovery wired, served as application/rss+xml; charset=utf-8');
