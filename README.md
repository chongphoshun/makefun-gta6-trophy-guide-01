# Leonida Field Journal — GTA VI Trophy Guide & Tracker

An unofficial, offline field guide and tracker for all 55 PlayStation 5 trophies of
Grand Theft Auto VI. Static files only: open `app/index.html` in a desktop browser
(or run `node serve.ts` and visit http://localhost:8080) — it works with the network
off and makes no network request at run time.

## What it is

- **The official list, whole.** Every trophy with its official name, description and
  grade (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden), in
  `app/data/trophies.json`.
- **A tracker that saves.** Tick trophies off; progress and per-trophy notes live in
  localStorage, with export to a file and import back. Filters by kind and grade,
  text search, remaining-only, and a spoiler mode that veils hidden story trophies
  until you earn them.
- **A roadmap to the platinum.** Six stages, about 200 hours (PowerPyx estimate),
  built from the official descriptions: story first, then stranger strands, then
  the mapped collectibles, the ranges and races, and the money grind into 100%
  completion.
- **Exactly one missable, flagged everywhere.** *Positive Mental Attitude* — its
  first meditation spot (Lucia on the balcony at Jason's house, Chapter 1, after
  *Down to Earth*) disappears when Chapter 1 ends. Everything else stays earnable
  in free-roam after the story.
- **Guides in our own words, each with two cited sources.** PowerPyx, KeenGamer,
  Push Square, GTA Zone, Exophase and PSNProfiles are named beside each trophy's
  guide; nothing is copied from them. Three trophies are marked **unconfirmed**
  (*Personal Best*, *Bad Luck, I Guess*, *The Truth Is Out There*) because no guide
  has pinned down their trigger yet — the journal says so instead of guessing.
- **Up Next planner.** The five most useful trophies to chase next: missable first,
  then story in order, then the cheapest remaining trophy. It re-sorts itself every
  time you tick one off.

## Honesty notes

- The game released 19 November 2026; the list is the one Exophase and PSNProfiles
  published, the two agreeing on every name, description and grade. Counts (42
  Shooting Range golds, 250 stunts, 18 meditation spots, 100 WAiNK locations and
  the rest) come from the cited guides.
- Cheats disable trophies and saving — keep them off for a trophy run.
- No Rockstar Games logo, official artwork or game screenshot is used. This is a
  fan-made guide, not affiliated with Rockstar Games or PlayStation.

## Files

| File | Job |
| --- | --- |
| `main.ts` | Entry program: copies `app/` + `screenshots/` to the output dir and writes `dossier.json` with the kit's vendored library |
| `app/index.html` | The journal page: masthead + progress ring, views, toolbar, sidebar, trophy list |
| `app/app.js` | Boot and render: views, filters, progress ring, roadmap, missables, planner |
| `app/vault.js` | Saved progress + notes in localStorage, export / import |
| `app/filters.js` | Kind / grade / search / spoiler / remaining filtering |
| `app/planner.js` | The six roadmap stages and the Up Next ranking |
| `app/detail.js` | The guide pane inside a trophy card: steps, target, sources, notes |
| `app/style.css` | Light paper theme — cream pages, ink text, teal accent |
| `app/data/trophies.json` | The 55 trophies: official data + own-words guides + sources |
| `serve.ts` | Tiny static server for local development |
| `shots.mjs` | Takes the 4 screenshots via the Playwright headless shell over CDP |
| `shots.json` | Which view each screenshot was taken of |

## Run it

```sh
node serve.ts            # http://localhost:8080
node shots.mjs           # regenerate screenshots/ (needs the headless shell)
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand the entry in
```

## License

MIT — see `LICENSE`.
