# Leonida Trophy Codex

An offline guide and tracker for all 55 PlayStation 5 trophies of **Grand Theft Auto VI** — built for the make.fun bounty `gta6-trophy-guide-01`.

## What it is

A static web app (no build step, no network at run time) that covers the whole official list — 1 platinum, 2 gold, 6 silver, 46 bronze, 28 hidden, 0 online — with:

- **Checklist tracker** — tick trophies off as you earn them; progress is saved in `localStorage`, with export to a JSON file and import back. Each trophy can carry a personal note.
- **Kind filters** — story, missable, collectibles, activities, crime, side quests, exploration, and online (which honestly reports that there are no online trophies), plus a grade filter and full-text search.
- **Spoiler setting** — hides the names and descriptions of story trophies until you earn them.
- **Roadmap to the platinum** — three stages in order (story 60–80h, the 100% checklist ~100h, cleanup ~10h), built from PowerPyx's roadmap and the official descriptions. About 200 hours total, difficulty 4/10, one playthrough.
- **Missables** — exactly one trophy is flagged as possibly missable, Positive Mental Attitude, with the Chapter 1 warning spelled out. Three trophies (Personal Best, Bad Luck, I Guess, The Truth Is Out There) are flagged **unconfirmed**: no guide has verified how they unlock, so this codex says so instead of guessing.
- **Up next planner** — your next five trophies in chase order: the missable first, then the story stage, then the checklist grind.
- **Cited guides** — every trophy's guide is written for this codex in its own words and names its sources beside it (PowerPyx, GTABase, Push Square, KeenGamer, GTASpotter, Exophase, PSNProfiles), with links.

The look is our own — warm dusk colours, no Rockstar logo or artwork anywhere.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Add `?demo=1` to preview the app with 13 trophies already earned (in-memory only; your real progress is untouched). `?tab=roadmap`, `?focus=<slug>` and `?spoilers=on` jump straight to a view, which is how the screenshots were taken.

## Screenshots

```sh
node shots.mjs
```

Serves the app locally, renders the four views in `shots.json` with a headless browser, and writes JPEGs to `screenshots/` — each under the 256 KiB gate cap.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates the trophy catalog (55 items, every guide non-blank) and the screenshots (3–4 files, each under 256 KiB, dimensions inside the gate), copies `app/` and `screenshots/` to the output directory, and writes `dossier.json` with the vendored `buildDossier` library.

## Sources

- Trophy names, descriptions and grades: the official PS5 list as published by Exophase (`exophase.com/game/grand-theft-auto-vi-psn/trophies/`) and PSNProfiles (`psnprofiles.com/trophies/43531-grand-theft-auto-vi`).
- Roadmap and method facts: PowerPyx (`powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/`), GTABase, Push Square, KeenGamer and GTASpotter — cited per trophy inside the app. No guide text is copied from any of them.

## License

MIT — see `LICENSE`.
