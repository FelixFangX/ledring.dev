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
    const short = { "/x": "https://x.com/ColeFangX", "/github": "https://github.com/FelixFangX", "/gh": "https://github.com/FelixFangX" };
    if (short[url.pathname]) return Response.redirect(short[url.pathname], 302);
    return env.ASSETS.fetch(request);
  },
};
