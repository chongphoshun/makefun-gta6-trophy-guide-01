# makefun-gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/chongphoshun/makefun-gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/chongphoshun/makefun-gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Trophy Codex: an offline web app with all 55 GTA VI PlayStation 5 trophies — official names, descriptions and grades verbatim as PlayStation publishes them, each with a guide in plain words and a named source beside it (PowerPyx, KeenGamer, GTA Zone, PlanetGTA6, Output Lag, Sixshore and FullSweep), a three-stage platinum roadmap (~200 hours, difficulty 4/10), the one missable trophy flagged loud (Positive Mental Attitude — meditate at Jason's house in Chapter 1), and a tracker that saves in localStorage, exports to a file and imports it back, filters by kind (story, missable, collectibles, activities, online — none at launch) and grade, searches, and hides story trophies until earned in spoiler mode. Three hidden trophies are marked unconfirmed rather than guessed (Personal Best, Bad Luck, I Guess, The Truth Is Out There). Every trophy renders exactly once, in its primary group — a trophy that also belongs to another group is cross-listed there by name with an anchor, never as a second card. Each trophy's detail panel now also lists related trophies (same chapter, same collectible chain, or same activity), so a chain like the collectibles can be followed without searching. No Rockstar logo, artwork or game screenshot anywhere — every visual is original CSS.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Everything runs offline from the files under app/; your progress stays in your browser.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
