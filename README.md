# Leonida Trophy Codex

An offline guide and tracker for all **55 GTA VI PlayStation 5 trophies** — 1 platinum, 2 gold, 6 silver, 46 bronze (28 hidden). Free, open source (MIT), no network at run time.

## What it does

- **Tracker** — every trophy with its official name, description and grade, a checklist saved in `localStorage`, export/import of progress, and per-trophy notes.
- **Filters** — by kind (story, side characters, collectibles, activities, robberies, exploration, one-offs, 100% completion, platinum), by grade, by text search, and remaining-only.
- **Spoiler mode** — hides the name and description of hidden story trophies until they are earned.
- **Platinum Roadmap** — three stages in order: play the story, open Leonida, then cleanup to 100% and the Platinum.
- **Missables** — exactly one trophy is flagged missable: **Positive Mental Attitude** (meditate at all 18 spots). A watch list covers the side-character finals and the unconfirmed trophies, with save advice.
- **Up Next planner** — the next five trophies in order: missable first, then story, then the short jobs.
- **Cited guides** — every trophy's guide is written in our own words from the official description and cites its sources (Exophase, PSNProfiles, and the guide pages named beside each trophy). Three trophies are honestly marked **unconfirmed** — Personal Best, Bad Luck, I Guess, The Truth Is Out There — because no source has verified their trigger yet. This guide guesses nothing.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open `app/index.html` in any desktop browser. No build step, no network.

## Screenshots

```sh
node shots.mjs           # renders the 4 views in shots.json to screenshots/
```

Uses the Playwright headless shell; each shot is 1280×800 JPEG under 256 KiB.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier` from `vendor/makefun-frontend.ts`.

## Sources

- Official trophy list: Exophase — https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/
- PSN progress targets: PSNProfiles — https://psnprofiles.com/trophies/43531-grand-theft-auto-vi
- Cross-checks: Of Zen and Computing, EGamers, HowToVideoGame (linked per trophy where used).

No Rockstar logo or official artwork is used anywhere; the look is original.
