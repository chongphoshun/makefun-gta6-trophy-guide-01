// Guide pane, roadmap stages and the Up-next planner. Every fact a guide
// states names where it came from: the SOURCES table holds the full link for
// each short name the data file cites, and the pane prints them beside the
// guide so a reader can check any claim in one click.

export const SOURCES = {
  PowerPyx: 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/',
  GTABase: 'https://www.gtabase.com/articles/gta-6/gta-6-achievements-trophies-list-ps5-xbox-series',
  'Push Square': 'https://www.pushsquare.com/guides/gta-6-trophy-guide-and-roadmap',
  KeenGamer: 'https://www.keengamer.com/articles/guides/gta-6-trophy-guide-platinum-roadmap-all-55-trophies/',
  GTASpotter: 'https://gtaspotter.com/en/guides/gta-6-trophies-and-achievements/',
  Exophase: 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/',
  PSNProfiles: 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi',
};

export const ROADMAP_STAGES = [
  {
    id: 1,
    title: 'Stage 1 — Play the story, and mind the one missable',
    time: 'About 60–80 hours',
    blurb:
      'Five chapters, and the story trophies fall out as you finish them. Do the optional missions as they appear, scan vehicles and study animals with the WAiNK app and binoculars while you travel, and above all do the Chapter 1 balcony meditation the moment Lucia offers it — it is the only spot in the game that can close for good.',
    tips: [
      'After the Down to Earth mission, find Lucia at Jason’s house in the morning and accept the balcony meditation.',
      'Swap between Jason and Lucia often: Andy’s strand is Lucia-only, Tyrone’s and Bret’s are Jason-only.',
      'Leave cheats off for the whole run — GTABase and PowerPyx both report that a cheat disables trophies and saving.',
      'Save by hand at the start and end of every chapter; missions cannot be replayed.',
    ],
  },
  {
    id: 2,
    title: 'Stage 2 — The 100% checklist',
    time: 'About 100 hours',
    blurb:
      'After the credits, the checklist appears under Progress, then Stats, then 100% Completion, and everything you did during the story already counts toward it. PowerPyx puts it at roughly 60% true completion: most things are only partly required, but robberies, underwater discoveries, shooting ranges, drone races and Bret’s quests demand every last one.',
    tips: [
      'Work the checklist top to bottom: 39 gang operations, 22 bank jobs, 7 payday loan jobs and all 8 bank vaults.',
      'Finish 70 of the 80 challenges — the ten hardest can be skipped entirely.',
      'Collect 15 of the 18 card sets, 100 of the 125 Cocaine Flamingos and 33 underwater discoveries.',
      'Gold all 42 shooting range challenges and win all 14 drone races.',
    ],
  },
  {
    id: 3,
    title: 'Stage 3 — Strangers, cleanup and the platinum',
    time: 'About 10 hours',
    blurb:
      'The last stretch: the eight Strangers & Freaks strands, the side-character final missions, and whatever miscellaneous trophies are still open. Every quest giver tied to a trophy returns after the story, so nothing here can be missed. When the final trophy pops, Vice Got a Price! follows at once.',
    tips: [
      'Finish any stranger strands left open; PowerPyx is still confirming exactly which eight count, so do them all.',
      'Sweep the miscellaneous list: Combat Focus, the VCIA exit, the showroom smash, the money trophies.',
      'Check the three unconfirmed trophies last — Personal Best, Bad Luck, I Guess and The Truth Is Out There have no verified method yet.',
      'The platinum is one playthrough, no online trophies, no difficulty setting, no New Game+.',
    ],
  },
];

// Rank the next trophies to chase: unfinished stage-1 items first (they gate
// the rest), then the missable, then whatever is earliest in roadmap order.
// A trophy already earned never appears here.
export function pickUpNext(trophies, earned, limit) {
  const open = trophies.filter((t) => !earned.has(t.slug));
  const rank = (t) => (t.missable ? 0 : t.stage * 10 + (t.kind === 'story' ? 0 : 5));
  return open
    .slice()
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, limit || 5);
}

export function whyNext(trophy) {
  if (trophy.missable) return 'Do this one before anything else: it is the only trophy that can be missed, and its first spot closes at the end of Chapter 1.';
  if (trophy.stage === 1) return 'Story stage — earn it while the chapters are in front of you; it unlocks the later stages.';
  if (trophy.stage === 2) return '100% checklist stage — the long grind that decides the platinum.';
  return 'Cleanup stage — quick to finish once the story and the checklist are done.';
}

export function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

export function kindLabel(kind) {
  const labels = {
    meta: 'Platinum path',
    story: 'Story',
    side: 'Side quest',
    collectible: 'Collectible',
    activity: 'Activity',
    crime: 'Crime',
    exploration: 'Exploration',
  };
  return labels[kind] || kind;
}

// Build the guide pane for one trophy. Spoiler mode hides the name and the
// official description of story trophies until they are earned; the guide
// text itself stays readable, since it is written to be safe.
export function guidePaneHtml(trophy, earned, spoilersOn, note) {
  const isEarned = earned.has(trophy.slug);
  const hiddenName = spoilersOn && trophy.kind === 'story' && !isEarned;
  const shownName = hiddenName ? 'Hidden story trophy' : trophy.name;
  const shownDesc = hiddenName ? 'Hidden until earned — turn spoilers off to read it.' : trophy.desc;
  const sourceLinks = (trophy.src || [])
    .map((site) => {
      const url = SOURCES[site];
      if (!url) return `<li>${site}</li>`;
      return `<li><a href="${url}" target="_blank" rel="noopener">${site}</a></li>`;
    })
    .join('');
  const warn = trophy.missable
    ? `<div class="warn-box"><strong>Missable.</strong> This is the only trophy on the list that can be missed. Do the Chapter 1 meditation the moment it is offered — see the guide below.</div>`
    : '';
  const unconfirmed = trophy.unconfirmed
    ? `<div class="note-box"><strong>Unconfirmed.</strong> No guide has verified how this trophy unlocks yet. This codex will not guess; check PowerPyx for updates.</div>`
    : '';
  const target = trophy.target
    ? `<p class="trophy-target">Target: ${trophy.target.toLocaleString('en-US')}</p>`
    : '';
  return `
    <h2>${shownName}</h2>
    <p class="official-desc">${shownDesc}</p>
    <div class="trophy-meta">
      <span class="badge grade-${trophy.grade}">${gradeLabel(trophy.grade)}</span>
      <span class="badge kind">${kindLabel(trophy.kind)}</span>
      ${trophy.missable ? '<span class="badge missable">Missable</span>' : ''}
      ${trophy.unconfirmed ? '<span class="badge unconfirmed">Unconfirmed</span>' : ''}
      ${trophy.hidden ? '<span class="badge">Hidden on PSN</span>' : ''}
    </div>
    ${target}
    ${warn}
    ${unconfirmed}
    <h3>How to earn it</h3>
    <p class="guide-text">${trophy.guide}</p>
    <h3>Sources</h3>
    <ul class="source-list">${sourceLinks || '<li>Official trophy list (Exophase / PSNProfiles)</li>'}</ul>
    <h3>Your note</h3>
    <textarea class="note-input" id="trophyNote" rows="2" placeholder="Your own reminder for this trophy…">${note || ''}</textarea>
    <div class="guide-actions">
      <button type="button" class="primary" id="toggleEarned">${isEarned ? 'Mark as not earned' : 'Mark as earned'}</button>
    </div>`;
}
