// planner.js — the roadmap and the Up Next list. The six stages are built from the
// official descriptions and the cited guides: story first, the one missable spot
// protected in Chapter 1, then the 100% checklist and the money grind.
export const STAGES = [
  {
    n: 1,
    title: 'First light — the story',
    time: '60–80 hours',
    text: 'Play the five chapters and take the side missions as they appear. Scan vehicles and study animals through the binoculars on the way — that quiet background progress feeds the 100% checklist later. Before Chapter 1 ends, take the balcony meditation (see Stage 3).',
  },
  {
    n: 2,
    title: 'Loose ends — strangers & side folk',
    time: '10–20 hours',
    text: 'Finish the stranger strands and the named side characters: Andy, Kenton, Billy, Randy, Tyrone and Bret. Eight strands complete earns Strangers & Freaks; Bret’s quests also feed the 100% checklist in full.',
  },
  {
    n: 3,
    title: 'The one that can slip away',
    time: 'Do it in Chapter 1',
    text: 'Positive Mental Attitude is the only missable trophy. Its first meditation spot — Lucia on the balcony at Jason’s house after Down to Earth — disappears when Chapter 1 ends. The other 17 spots across Leonida stay open in free-roam.',
  },
  {
    n: 4,
    title: 'Leonida, mapped',
    time: '20–30 hours',
    text: 'One long road trip that fills three counters at once: explore all 52 areas, tag 100 WAiNK locations and pick up collectible cards (3 sets for the trophy, 15 for 100%). Discover 100 vehicles on the way — 200 are wanted for the checklist.',
  },
  {
    n: 5,
    title: 'Range, track & rink',
    time: '20–30 hours',
    text: 'Gold all 42 Shooting Range challenges, win the 14 Top Fun drone races and 20 different races, pull 250 stunts, finish 50 challenges (70 for 100% — the hardest 10 can be skipped), and try every activity type once.',
  },
  {
    n: 6,
    title: 'Money, then the legend',
    time: '30–40 hours, then cleanup',
    text: 'Rob the vaults, trucks and gang operations, launder $250,000 of Marked Bills, spend $100,000 and buy all 8 garages. Then clear the 100% checklist itself for A Long Road — and the platinum lands on its own.',
  },
];

export function trophiesInStage(trophies, stageNumber) {
  return trophies.filter((t) => t.stage === stageNumber);
}

export function stageProgress(trophies, stageNumber, earnedSet) {
  const inStage = trophiesInStage(trophies, stageNumber);
  const done = inStage.filter((t) => earnedSet.has(t.name)).length;
  return { done, total: inStage.length };
}

// Up Next: the missable trophy leads until earned; then story in order; then the
// earliest roadmap stage; unconfirmed trophies sort last, because chasing a trophy
// nobody has verified is the worst use of an evening.
export function upNext(trophies, earnedSet, count = 5) {
  const remaining = trophies.filter((t) => !earnedSet.has(t.name));
  const rank = (t) => [
    t.missable ? 0 : 1,
    t.unconfirmed ? 1 : 0,
    t.stage,
    t.kind === 'story' ? 0 : 1,
  ];
  remaining.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i += 1) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i];
    }
    return a.name.localeCompare(b.name);
  });
  return remaining.slice(0, count).map((t) => ({ trophy: t, why: whyNext(t) }));
}

export function whyNext(t) {
  if (t.missable) return 'Missable — its first spot vanishes after Chapter 1. Do it now.';
  if (t.unconfirmed) return 'Unconfirmed — no verified method yet; chase it last, after the known trophies.';
  if (t.kind === 'story') return 'Story — it pops by playing the next chapter; no grind attached.';
  if (t.stage === 2) return 'Side strand — finish the chain while its missions are fresh.';
  if (t.stage === 4) return 'Exploration — pairs with the WAiNK and card counters on one trip.';
  if (t.stage === 5) return 'Activity — repeatable, so a failed run costs nothing but time.';
  if (t.stage === 6) return 'Money — the last grind; robberies here also feed the 100% checklist.';
  return 'Next on the roadmap.';
}
