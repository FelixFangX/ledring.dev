# ledring.dev

Source for the landing page at **https://ledring.dev**, the home of [LEDRING](https://github.com/FelixFangX/ledring): status lights for AI agents, and LEDRING Play, a browser game where you decide what an AI builder ships.

- `public/` static site (one HTML file, no external CDNs, English with a 中文 toggle; `?lang=zh` forces Chinese)
- `src/index.js` tiny Worker: redirects `www.ledring.dev` to the apex and `/play` to https://play.ledring.dev/play/, otherwise serves `public/`
- `?src=<channel>` on the landing page is forwarded to the Play link, so content-pack tracking keeps working

## Deploy

Hosted on Cloudflare Workers static assets (free plan).

```sh
export CLOUDFLARE_API_TOKEN=...   # needs Workers Scripts:Edit and zone Workers Routes:Edit
npx wrangler@3 deploy
```

## License

MIT
