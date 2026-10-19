import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
const cjk = /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/u;
const decode = s => s.replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
// Include nested pages, generated showcase output and the source for future notes.
const pages = readdirSync('public', { recursive: true }).filter(file => file.endsWith('.html')).map(file => `public/${file}`);
for (const file of [...pages, 'templates/note.html']) {
  const html = readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  scripts.forEach((s, i) => new vm.Script(s, { filename: `${file}:script${i}` }));
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const nodes = [...markup.matchAll(/<([\w-]+)\b([^>]*\bdata-i18n(?:-aria)?="[^"]+"[^>]*)>/g)].map(m => {
    const attrs = Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], decode(a[2])]));
    return { dataset: { i18n: attrs['data-i18n'], i18nAria: attrs['data-i18n-aria'] }, textContent: decode(markup.slice(m.index+m[0].length, markup.indexOf('</'+m[1]+'>',m.index+m[0].length)).replace(/<[^>]*>/g, '')), getAttribute: k => attrs[k] };
  });
  const document = { documentElement: { dataset: {} }, getElementById: () => ({}), querySelectorAll: selector => nodes.filter(n => selector === '[data-i18n]' ? n.dataset.i18n : n.dataset.i18nAria) };
  const source = scripts.find(s => s.includes('var zh='));
  const end = source.includes('var q=new') ? source.indexOf('var q=new') : source.indexOf('function tlabel');
  const context = vm.createContext({ document });
  vm.runInContext((source.includes('var q=new') ? 'var D=document;'+source.slice(source.indexOf('var zh='), end) : source.slice(source.indexOf('var D='), end)), context);
  const { en, zh } = context;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort(), `${file}: dictionary keys differ`);
  for (const [key, value] of Object.entries(en)) assert(!cjk.test(value), `${file}: English ${key} contains CJK: ${value}`);
  const staticEnglish = decode(markup.replace(/(<button\b[^>]*\bid="lang"[^>]*>)中文(<\/button>)/g, '$1$2').replace(/<!--[\s\S]*?-->/g, ''));
  assert(!cjk.test(staticEnglish), `${file}: static English markup contains CJK`);
  // Run the actual startup selection statement with browser inputs, including
  // forced-query persistence and a server-provided automatic default.
  const selection = source.slice(source.lastIndexOf('var ql=' )).split('\n')[0];
  for (const [query, stored, automatic, expected] of [
    ['zh', 'en', 'en', 'zh'], ['en', 'zh', 'zh', 'en'],
    [null, 'zh', 'en', 'zh'], [null, 'en', 'zh', 'en'],
    ['invalid', null, 'zh', 'zh'], [null, null, 'en', 'en'],
    [null, null, undefined, 'zh'],
  ]) {
    const storage = new Map(stored ? [['lang', stored]] : []);
    const search = query ? `?lang=${query}` : '';
    const browser = vm.createContext({
      URLSearchParams, location: { search }, q: new URLSearchParams(search),
      localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
      R: { dataset: { geoLang: automatic } }, navigator: { language: 'zh-CN' },
      set: language => { assert.equal(language, expected, `${file}: language precedence`); }, splitAll() {},
    });
    vm.runInContext(selection, browser);
    if (query === 'en' || query === 'zh') assert.equal(storage.get('lang'), query, `${file}: query must persist`);
  }
  console.log(`${file}: ${Object.keys(en).length} matching keys; English markup and script syntax OK`);
}

// Terminal replies are pure renderers; check every command in both languages.
const home = readFileSync('public/index.html', 'utf8');
const terminal = vm.createContext({ cur: 'en', dark: false, score: 3, esc: 2 });
const dictionaries = home.slice(home.indexOf('var zh='), home.indexOf('var q=new'));
terminal.document = { querySelectorAll: () => [] };
vm.runInContext('var D=document;'+dictionaries, terminal);
terminal.en.ab1 = 'Engineer.'; terminal.en.ab2 = 'Maker.';
vm.runInContext(home.slice(home.indexOf('var CMDS='), home.indexOf('function openT')), terminal);
for (const lang of ['en', 'zh']) {
  terminal.cur = lang;
  for (const [name, command] of Object.entries(terminal.CMDS)) {
    const reply = command();
    assert(!reply.includes('undefined'), `${lang}: terminal ${name} is undefined`);
    if (lang === 'en') assert(!cjk.test(reply), `English terminal ${name} contains CJK`);
  }
}
const terminalNodes = new Map();
terminal.document.getElementById = id => {
  if (!terminalNodes.has(id)) terminalNodes.set(id, { value: '', innerHTML: '' });
  return terminalNodes.get(id);
};
terminal.cur = 'en';
vm.runInContext(home.slice(home.indexOf('var term=D.getElementById'), home.indexOf('/* v12: hero sequence')), terminal);
for (const command of ['help', 'about', 'coffee', 'whoami', 'nonsense']) {
  terminalNodes.get('tin').value = command;
  terminalNodes.get('tform').onsubmit({ preventDefault() {} });
}
const historyLength = terminal.terminalHistory.length;
terminal.cur = 'zh'; terminal.renderTerminal();
assert.match(terminalNodes.get('tout').innerHTML, /找不到命令/);
terminal.cur = 'en'; terminal.renderTerminal();
assert.equal(terminal.terminalHistory.length, historyLength);
assert(!cjk.test(terminalNodes.get('tout').innerHTML), 'English terminal history retains Chinese');
console.log('Terminal: every command renders in both languages; English replies contain no CJK');

// Exercise routing without Cloudflare or network access. This rewriter stub only
// checks html attributes; production streaming behavior requires the Worker runtime.
class HTMLRewriter {
  on(selector, handler) { this.handler = handler; return this; }
}
// Real HTMLRewriter.transform is synchronous and returns a Response. Capture its
// synchronous header interface while asynchronously rewriting the body.
HTMLRewriter.prototype.transform = function(asset) {
  const attrs = {};
  this.handler.element({ setAttribute: (name, value) => { attrs[name] = value; } });
  const body = new ReadableStream({ async start(controller) {
    let html = await asset.text();
    for (const [name, value] of Object.entries(attrs)) html = html.replace(/<html\b([^>]*)>/, (_, old) => `<html${old.replace(new RegExp(` ${name}="[^"]*"`, 'g'), '')} ${name}="${value}">`);
    controller.enqueue(new TextEncoder().encode(html)); controller.close();
  } });
  return new Response(body, { status: asset.status, headers: asset.headers });
};
const workerContext = vm.createContext({ Request, Response, Headers, URL, HTMLRewriter });
vm.runInContext(readFileSync('src/index.js', 'utf8').replace('export default', 'globalThis.worker =').replace(/export \{ canonicalURL \};/, ''), workerContext);
const assets = new Map([
  ['/', ['text/html', '<html lang="en">home</html>']],
  ['/tools/', ['text/html', '<html lang="en">tools</html>']],
  ['/404', ['text/html', readFileSync('public/404.html', 'utf8')]],
  ['/style.css', ['text/css', 'body{}']],
  ['/showcase/', ['text/html', '<html>preview</html>']],
]);
const env = { ASSETS: { async fetch(request) {
  const asset = assets.get(new URL(request.url).pathname);
  return new Response(asset ? asset[1] : '', { status: asset ? 200 : 404, headers: { 'Content-Type': asset ? asset[0] : 'text/plain', 'Cache-Control': 'public, max-age=3600', Vary: 'Accept-Encoding' } });
} } };
for (const method of ['GET', 'HEAD']) for (const lang of ['en-US', 'zh-CN']) {
  for (const [path, status, cache] of [
    ['/', 200, 'private, no-store'], ['/tools/', 200, 'private, no-store, no-transform'],
    ['/missing', 404, 'private, no-store, no-transform'], ['/missing.js', 404, 'private, no-store, no-transform'],
    ['/showcase/', 404, 'private, no-store, no-transform'], ['/showcase-anything', 404, 'private, no-store, no-transform'],
    ['/style.css', 200, 'public, max-age=3600'],
  ]) {
    const response = await workerContext.worker.fetch(new Request(`https://ledring.dev${path}`, { method, headers: { 'Accept-Language': lang } }), env);
    assert.equal(response.status, status, `${method} ${path}`);
    assert.equal(response.headers.get('Cache-Control'), cache, path);
    const body = await response.text();
    if (method === 'HEAD') assert.equal(body, '');
    else if (path !== '/style.css') assert(body.includes(`lang="${lang === 'zh-CN' ? 'zh-CN' : 'en'}"`), path);
    if (path !== '/style.css') assert.match(response.headers.get('Vary'), /Accept-Language/i);
  }
}
const preview = await workerContext.worker.fetch(new Request('https://preview.workers.dev/showcase/'), env);
assert.equal(preview.status, 200);
console.log('Worker: GET/HEAD, language injection, 404s, cache headers, existing assets and preview routes OK');
