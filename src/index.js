// Keep only a supported language parameter; aliases share the clean page URL.
function canonicalURL(url) {
  const clean = new URL(url.pathname.replace(/index\.html$/, ""), "https://ledring.dev");
  const language = url.searchParams.get("lang");
  if (language === "en" || language === "zh") clean.searchParams.set("lang", language);
  return clean.href;
}

function defaultLanguage(request, url) {
  let country = request.cf && request.cf.country;
  if (url.hostname.endsWith(".workers.dev")) {
    country = url.searchParams.get("__cc") ?? request.headers.get("x-test-country") ?? country;
  }
  country = (country || "").trim().toUpperCase();
  if (country && country !== "XX" && country !== "T1") {
    return ["CN", "HK", "MO", "TW", "SG"].includes(country) ? "zh" : "en";
  }
  const preferred = (request.headers.get("Accept-Language") || "").split(",")
    .map(part => {
      const [language, ...parameters] = part.trim().split(";");
      const quality = parameters.find(parameter => /^\s*q=/i.test(parameter));
      return { language, quality: quality ? Number(quality.split("=")[1]) : 1 };
    })
    .filter(part => part.quality > 0)
    .sort((a, b) => b.quality - a.quality)[0];
  return preferred && /^zh/i.test(preferred.language) ? "zh" : "en";
}

async function localizedAsset(request, env, url, tools = false, missing = false) {
  const source = missing ? new Request(new URL("/404", url), request) : request;
  let asset = await env.ASSETS.fetch(source);
  if (missing) asset = new Response(asset.body, { status: 404, headers: asset.headers });
  if (!(asset.headers.get("Content-Type") || "").toLowerCase().includes("text/html")) return asset;
  const forced = url.searchParams.get("lang");
  const explicit = forced === "en" || forced === "zh";
  const language = explicit ? forced : defaultLanguage(request, url);
  const rewriter = new HTMLRewriter().on("html", {
    element(element) {
      element.setAttribute("data-geo-lang", language);
      element.setAttribute("lang", language === "zh" ? "zh-CN" : "en");
    },
  });
  if (explicit) {
    rewriter.on('link[rel="canonical"]', { element(element) { element.setAttribute("href", canonicalURL(url)); } });
    rewriter.on('meta[property="og:url"]', { element(element) { element.setAttribute("content", canonicalURL(url)); } });
  }
  const response = rewriter.transform(asset);
  const vary = response.headers.get("Vary");
  if (!vary || !vary.split(",").some(value => value.trim().toLowerCase() === "accept-language")) {
    response.headers.set("Vary", vary ? `${vary}, Accept-Language` : "Accept-Language");
  }
  response.headers.set("Cache-Control", tools ? "private, no-store, no-transform" : "private, no-store");
  return response;
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (url.hostname === "www.ledring.dev") {
    url.hostname = "ledring.dev";
    return Response.redirect(url.toString(), 301);
  }
  if (url.pathname === "/play" || url.pathname === "/play/") {
    const target = new URL("https://play.ledring.dev/play/");
    target.search = url.search;
    return Response.redirect(target.toString(), 302);
  }
  if (["/tools", "/projects", "/notes"].includes(url.pathname)) {
    url.pathname += "/";
    return Response.redirect(url.toString(), 301);
  }
  if (/^\/(tools|projects|notes)\/(index\.html)?$/.test(url.pathname) || /^\/notes\/[a-z0-9-]+\/(index\.html)?$/.test(url.pathname)) {
    return localizedAsset(request, env, url, true);
  }
  // /showcase is preview-only (auto-playing, non-interactive demo); never served on the production domain
  if (url.pathname.startsWith("/showcase") && url.hostname.endsWith("ledring.dev")) return localizedAsset(request, env, url, true, true);
  const short = { "/x": "https://x.com/ColeFangX", "/github": "https://github.com/FelixFangX", "/gh": "https://github.com/FelixFangX" };
  if (short[url.pathname]) return Response.redirect(short[url.pathname], 302);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return localizedAsset(request, env, url);
  }
  const asset = await env.ASSETS.fetch(request);
  return asset.status === 404 ? localizedAsset(request, env, url, true, true) : asset;
}

export default {
  async fetch(request, env) {
    // Run HEAD through GET because HTMLRewriter needs a body.
    const head = request.method === "HEAD";
    const response = await handle(head ? new Request(request, { method: "GET" }) : request, env);
    if (head || new URL(request.url).hostname.endsWith(".workers.dev")) {
      // Redirect headers are immutable: always copy before adding preview policy.
      const headers = new Headers(response.headers);
      if (new URL(request.url).hostname.endsWith(".workers.dev")) headers.set("X-Robots-Tag", "noindex, nofollow");
      return new Response(head ? null : response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  },
};

export { canonicalURL };
