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

async function localizedAsset(request, env, url, tools = false) {
  const asset = await env.ASSETS.fetch(request);
  if (!(asset.headers.get("Content-Type") || "").toLowerCase().includes("text/html")) return asset;
  const language = defaultLanguage(request, url);
  const response = new HTMLRewriter().on("html", {
    element(element) {
      element.setAttribute("data-geo-lang", language);
      element.setAttribute("lang", language === "zh" ? "zh-CN" : "en");
    },
  }).transform(asset);
  const vary = response.headers.get("Vary");
  if (!vary || !vary.split(",").some(value => value.trim().toLowerCase() === "accept-language")) {
    response.headers.set("Vary", vary ? `${vary}, Accept-Language` : "Accept-Language");
  }
  response.headers.set("Cache-Control", tools ? "private, no-store, no-transform" : "private, no-store");
  return response;
}

export default {
  async fetch(request, env) {
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
    if (url.pathname === "/tools") {
      url.pathname = "/tools/";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === "/tools/" || url.pathname === "/tools/index.html") {
      return localizedAsset(request, env, url, true);
    }
    // /showcase is preview-only (auto-playing, non-interactive demo); never served on the production domain
    if (url.pathname.startsWith("/showcase") && url.hostname.endsWith("ledring.dev")) return new Response("Not found", { status: 404 });
    const short = { "/x": "https://x.com/ColeFangX", "/github": "https://github.com/FelixFangX", "/gh": "https://github.com/FelixFangX" };
    if (short[url.pathname]) return Response.redirect(short[url.pathname], 302);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return localizedAsset(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },
};
