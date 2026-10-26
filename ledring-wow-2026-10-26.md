# ledring.dev — 2026-10-26

Visual: kept Instrument Serif, bone paper, ink-blue LEDs and the interactive hero. Added an ink-blue Craft interlude, human intent → agent code → care thread, numbered editorial work rows, restrained tag borders, a contact LED, oversized project/notes mastheads with etched rings, offset desktop project cards, timeline notes, and dark-theme edge highlights. Shared CSS adds no JS; hover transitions respect reduced motion. Added a bilingual homepage notebook link and contact email on projects/notes surfaces.

Content: applied drafted EN/ZH four-tool wording to Home and showcase; aligned the source case study and bilingual mind-maps note with convert, from_markdown, convert_many, inspect; rebuilt projects. Enriched the bilingual Notes introduction. Restored showcase #work skip link. Deleted unreferenced 1,482,024-byte play.gif. Home Now EN/ZH is byte-for-byte unchanged; Dashtaste stays v0.0.7. No product launch, BI, HSTS, employer or private content changes.

Validation: build-projects (including --check), check-i18n, check-routes, git diff --check and explicit protected-copy assertions passed. Browser verification blocked by sandbox Chromium launch restrictions; local HTTP listening also denied.

Release: requested branch site/content-ui-wow-2026-10-26 exists in /tmp/ledring-wow-release because the original workspace .git is read-only. All site edits are also in /workspace/ledring.dev. GitHub push blocked by DNS/network restrictions; configured gh token also reports invalid. No PR, merge or production deployment occurred. README specifies explicit Wrangler deployment, not automatic deployment on main push.

To finish from a network-enabled shell:

```sh
cd /tmp/ledring-wow-release
gh auth refresh -h github.com
git push -u origin site/content-ui-wow-2026-10-26
gh pr create --base main --title 'Refine paper and LED visual language and complete bilingual content' --body-file /tmp/ledring-wow-pr.md
# Review desktop/mobile, EN/ZH, light/dark, reduced motion; then merge.
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
npx wrangler@3 deploy
```

No Worker version is available because deployment did not run.
