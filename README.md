# ledring.dev

Source for **https://ledring.dev**, Felix Fang's personal site and the home of [LEDRING](https://github.com/FelixFangX/ledring): status lights for AI agents, and LEDRING Play, a browser game where you decide what an AI builder ships.

## What's on the site

- **Hero**: a live tick ring (canvas). The travelling segment is the "light". Press Space or tap to catch the rogue light at the gate.
- **About**: path (frontend → full-stack → AI-native), principles, and how I build with agents.
- **LEDRING**: how to play, AI modes, content packs (EN dev pack and 中文 pack), the trace toolkit, and live links (Play, sample reports, concept demo).
- **Tools page**: [/tools/](https://ledring.dev/tools/) lists Convert and Research, with live links, source and manually maintained status.
- **Selected work**: research-thinking-ai, lakeboard-converter, n8n-workflow-collection, dev-work-grok-bot-skill and the profile control room, each with its key features, stack and links.
- **Open source**: GitHub achievements and accepted answers.
- **Now / Stack**: Become Human, the LEDRING roadmap, and the tools I use.
- **Off the clock**: coffee, two kittens, the gym and live shows, as hairline icons. There's also a rotating "Currently" line in the hero, and two kittens occasionally walk across the page (type `cats` in the terminal to call them).
- **Contact**: felix@ledring.dev, [GitHub](https://github.com/FelixFangX), [X @ColeFangX](https://x.com/ColeFangX).

Everything on it comes from the public repos and the profile README.

## Design and build

- One file, `public/index.html`, with inline CSS and JS. No framework and no CDN. Fonts (Instrument Serif, JetBrains Mono, OFL) are self-hosted in `public/fonts/`, so the site loads fine from mainland China.
- Light ink-on-paper theme by default. A dark theme is available from the toggle and remembered in `localStorage` with no flash on load.
- English by default, with a 中文 toggle. `?lang=zh` or `?lang=en` forces a language.
- WebGL paper/silk background at half resolution. It pauses when the tab is hidden.
- Respects `prefers-reduced-motion`: no shader animation, no reveals, no game.
- Responsive from 375 px phones to 5K displays, with safe-area insets and 44 px touch targets. Hover effects apply only on hover-capable pointers.
- Extras: press `/` for a terminal (try `coffee`, `cats`, `gym`, `live`, `whoami`), the Konami code turns on overdrive, and there's a magnetic cursor.

## Routes (`src/index.js`)

| Path | Behaviour |
|---|---|
| `www.ledring.dev/*` | 301 redirect to the apex |
| `/tools` | 301 to `/tools/`, preserving the query string; `/tools/` and `/tools/index.html` serve the bilingual tools directory with private, no-store, no-transform caching |
| `/play` | Redirects to https://play.ledring.dev/play/ and keeps the query string (`?src=` content-pack tracking) |
| `/x`, `/github` (`/gh`) | Redirect to X @ColeFangX and GitHub FelixFangX |
| everything else | Static assets from `public/` (including `og.png`) |

## Develop and deploy

```sh
python3 -m http.server 8787 -d public            # local preview

export CLOUDFLARE_API_TOKEN=...                   # Workers Scripts:Edit + zone Workers Routes:Edit
npx wrangler@3 deploy -c wrangler.preview.toml    # preview: ledring-landing-preview.ledring.workers.dev
npx wrangler@3 deploy                             # production: ledring.dev (worker "ledring-landing")
```

## License

MIT. The fonts are under the SIL Open Font License; see `public/fonts/`.
