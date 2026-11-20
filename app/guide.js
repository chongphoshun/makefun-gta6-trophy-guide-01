// Leonida Trophy Codex — views: tracker list, detail pane, roadmap, missables, planner.
// The spoiler rule lives here: a hidden trophy stays masked (name and
// description both) until it is earned, or until spoiler mode is off.
import { earnedSet, saveState, setNote, toggleEarned } from './store.js';

export const KIND_LABELS = {
  story: 'Story', side: 'Side characters', collectible: 'Collectibles',
  activity: 'Activities', robbery: 'Robberies', exploration: 'Exploration',
  misc: 'One-offs', completion: '100% completion', platinum: 'Platinum',
};

export const STAGES = [
  {
    n: 1, title: 'Stage 1 — Play the story',
    blurb: 'Chapters 1–5 and the named missions. Nothing here can be missed: finish the campaign and 17 trophies land, including the final-mission gold.',
    tip: 'Meditate at every spot you pass (see Missables) and try one round of each activity as it unlocks.',
  },
  {
    n: 2, title: 'Stage 2 — Open Leonida',
    blurb: 'Side-character strands, stranger encounters, exploration and the one-off stunts. Clear the map region by region while the story is still fresh.',
    tip: 'Finish Andy, Kenton, Billy, Randy, Tyrone and Bret, then sweep races, the shooting range, robberies and the 52 areas.',
  },
  {
    n: 3, title: 'Stage 3 — Cleanup to 100%',
    blurb: 'Counts and collectibles: cards, WAiNK It, challenges, bank vaults, garages and the long grinds. A Long Road pops here, then the Platinum.',
    tip: 'Check the in-game stats page for what is left — it lists every category. Save the 250 stunts and 100 WAiNK It spots for last.',
  },
];

export function isMasked(trophy, state) {
  return state.spoiler && trophy.hidden && !earnedSet(state).has(trophy.name);
}

export function displayName(trophy, state) {
  return isMasked(trophy, state) ? 'Hidden trophy' : trophy.name;
}

export function displayDescription(trophy, state) {
  return isMasked(trophy, state)
    ? 'Hidden on PlayStation until earned. Turn spoiler mode off, or earn it, to reveal the name and description.'
    : trophy.description;
}

export function filterTrophies(trophies, state, query) {
  const q = query.q.trim().toLowerCase();
  return trophies.filter((t) => {
    if (query.kind !== 'all' && t.kind !== query.kind) return false;
    if (query.grade !== 'all' && t.grade !== query.grade) return false;
    if (query.remainingOnly && earnedSet(state).has(t.name)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function gradeCounts(trophies, state) {
  const earned = earnedSet(state);
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    counts[t.grade][1] += 1;
    if (earned.has(t.name)) counts[t.grade][0] += 1;
  }
  return counts;
}

export function stageCounts(trophies, state) {
  const earned = earnedSet(state);
  return STAGES.map((stage) => {
    const members = trophies.filter((t) => t.stage === stage.n);
    const done = members.filter((t) => earned.has(t.name)).length;
    return { ...stage, members, done, total: members.length };
  });
}

// Up Next: the missable first, then the earliest story trophy still
// unearned, then the shortest remaining grinds. Never an earned trophy.
export function planNext(trophies, state, limit = 5) {
  const earned = earnedSet(state);
  const left = trophies.filter((t) => !earned.has(t.name));
  const missable = left.filter((t) => t.missable);
  const story = left.filter((t) => t.kind === 'story' && !t.missable);
  const quick = left.filter((t) => t.kind !== 'story' && !t.missable && (t.target === null || t.target <= 20));
  const rest = left.filter((t) => !t.missable && t.kind !== 'story' && !(t.target === null || t.target <= 20));
  const ordered = [...missable, ...story, ...quick, ...rest];
  const reasons = new Map();
  for (const t of missable) reasons.set(t.name, 'Missable — do this before the story moves on.');
  for (const t of story) reasons.set(t.name, 'Next story beat — it comes to you by playing on.');
  for (const t of quick) reasons.set(t.name, 'Short job — one session and it is done.');
  for (const t of rest) reasons.set(t.name, 'Long grind — start it early and let it accumulate.');
  return ordered.slice(0, limit).map((t) => ({ trophy: t, reason: reasons.get(t.name) ?? '' }));
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function medalDot(grade) {
  const dot = el('span', `medal ${grade}`);
  dot.setAttribute('aria-label', `${grade} trophy`);
  return dot;
}

export function renderChips(host, trophies, state) {
  const counts = gradeCounts(trophies, state);
  host.replaceChildren();
  for (const [grade, [done, total]] of Object.entries(counts)) {
    const chip = el('span', `chip ${grade}`);
    chip.append(el('b', null, `${done}/${total} `), document.createTextNode(grade));
    host.append(chip);
  }
}

export function renderProgress(trophies, state) {
  const earned = earnedSet(state).size;
  document.getElementById('earned-count').textContent = String(earned);
  document.getElementById('progress-fill').style.width = `${Math.round((earned / trophies.length) * 100)}%`;
}

export function renderList(host, trophies, state, query, selected, onSelect) {
  const rows = filterTrophies(trophies, state, query);
  host.replaceChildren();
  const head = el('p', 'count', `${rows.length} of ${trophies.length} trophies shown · ${earnedSet(state).size} earned`);
  host.append(head);
  const list = el('div', 'list');
  if (rows.length === 0) {
    list.append(el('p', 'empty', 'No trophies match those filters. Clear the search or widen the kind and grade.'));
  }
  for (const t of rows) {
    const row = el('div', 'row');
    if (earnedSet(state).has(t.name)) row.classList.add('earned');
    if (selected === t.name) row.classList.add('selected');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earnedSet(state).has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', (event) => {
      event.stopPropagation();
      toggleEarned(state, t.name);
      onSelect(t.name, true);
    });
    row.append(box, medalDot(t.grade));
    const body = el('div');
    const title = el('h3', null, displayName(t, state) + ' ');
    const gradeTag = el('span', 'tag', t.grade);
    title.append(gradeTag);
    body.append(title, el('p', null, displayDescription(t, state)));
    const meta = el('div', 'meta');
    meta.append(el('span', 'pill', KIND_LABELS[t.kind] ?? t.kind));
    if (t.hidden) meta.append(el('span', 'pill hid', 'hidden'));
    if (t.missable) meta.append(el('span', 'pill miss', 'missable'));
    if (t.unconfirmed) meta.append(el('span', 'pill unc', 'unconfirmed'));
    if (t.target !== null && t.target !== undefined) {
      meta.append(el('span', 'pill', `target ${t.target.toLocaleString('en-US')}`));
    }
    body.append(meta);
    row.append(body);
    const side = el('span', 'count', earnedSet(state).has(t.name) ? 'earned ✓' : 'not yet');
    row.append(side);
    row.addEventListener('click', () => onSelect(t.name, false));
    list.append(row);
  }
  host.append(list);
}

export function renderDetail(host, trophy, state, onNote) {
  host.replaceChildren();
  if (!trophy) {
    host.append(
      el('h2', null, 'Pick a trophy'),
      el('p', 'official', 'Click any row to read its guide, sources and notes.'),
    );
    return;
  }
  const earned = earnedSet(state).has(trophy.name);
  const masked = isMasked(trophy, state);
  host.append(el('h2', null, masked ? 'Hidden trophy' : trophy.name));
  host.append(el('p', 'official', masked ? 'Hidden on PlayStation until earned.' : `“${trophy.description}” — ${trophy.grade}`));
  const meta = el('div', 'meta');
  meta.append(el('span', 'pill', KIND_LABELS[trophy.kind] ?? trophy.kind));
  meta.append(el('span', 'pill', `roadmap stage ${trophy.stage}`));
  if (trophy.missable) meta.append(el('span', 'pill miss', 'missable — do it early'));
  if (trophy.unconfirmed) meta.append(el('span', 'pill unc', 'unconfirmed method'));
  if (earned) meta.append(el('span', 'pill', 'earned ✓'));
  host.append(meta);
  host.append(el('h4', null, 'Guide'));
  const guide = el('p', 'guide-text', masked ? 'This trophy is hidden while spoiler mode is on. Earn it, or switch spoiler mode off, to read the guide.' : trophy.guide);
  host.append(guide);
  if (trophy.target !== null && trophy.target !== undefined) {
    host.append(el('h4', null, 'PSN target'));
    host.append(el('p', null, `PlayStation tracks a count toward ${trophy.target.toLocaleString('en-US')} for this trophy.`));
  }
  host.append(el('h4', null, 'Sources'));
  const list = el('ul');
  for (const source of trophy.sources ?? []) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.textContent = source.name;
    link.target = '_blank';
    link.rel = 'noopener';
    item.append(link);
    list.append(item);
  }
  host.append(list);
  host.append(el('h4', null, 'Your note'));
  const note = document.createElement('textarea');
  note.value = state.notes[trophy.name] ?? '';
  note.placeholder = 'Where you found it, what worked, what to retry…';
  note.setAttribute('aria-label', `Note for ${trophy.name}`);
  note.addEventListener('input', () => {
    setNote(state, trophy.name, note.value);
    onNote();
  });
  host.append(note);
}

export function renderRoadmap(host, trophies, state) {
  host.replaceChildren();
  const intro = el('p', 'count', 'Three stages, in order. Finish the story first, open the map second, grind the counts last — the Platinum pops at the end of Stage 3.');
  host.append(intro);
  const grid = el('div', 'stage-grid');
  for (const stage of stageCounts(trophies, state)) {
    const card = el('div', 'stage-card');
    card.append(el('h3', null, stage.title));
    card.append(el('p', 'stage-count', `${stage.done} / ${stage.total} earned in this stage`));
    card.append(el('p', null, stage.blurb));
    card.append(el('p', null, stage.tip));
    const list = el('ul');
    for (const t of stage.members.slice(0, 8)) {
      const item = el('li', null, displayName(t, state));
      if (t.missable) item.append(document.createTextNode(' — missable'));
      list.append(item);
    }
    if (stage.members.length > 8) {
      list.append(el('li', null, `…and ${stage.members.length - 8} more in the tracker`));
    }
    card.append(list);
    grid.append(card);
  }
  host.append(grid);
}

export function renderMissables(host, trophies, state) {
  host.replaceChildren();
  const alert = el('div', 'alert');
  alert.append(el('h3', null, 'Exactly 1 missable trophy'));
  alert.append(el('p', null, 'Positive Mental Attitude — meditate at all 18 spots — is the only trophy the guides flag as possibly missable. A spot can stop being available after its area’s story beats pass, so meditate the moment you find a spot and keep a manual save from before story missions in a new area.'));
  host.append(alert);
  const watch = trophies.filter((t) => t.unconfirmed || (t.hidden && t.kind === 'side'));
  const head = el('p', 'count', 'Watch list — trophies worth a manual save, even though they are not flagged missable:');
  host.append(head);
  const list = el('div', 'list');
  for (const t of watch) {
    const row = el('div', 'row');
    row.append(el('span'), medalDot(t.grade));
    const body = el('div');
    body.append(el('h3', null, displayName(t, state)));
    body.append(el('p', null, t.unconfirmed
      ? 'Unconfirmed method — play the story and check back; this guide guesses nothing.'
      : 'Final mission of a side strand — finish the strand before the story ends, just in case.'));
    row.append(body);
    row.append(el('span', 'count', earnedSet(state).has(t.name) ? 'earned ✓' : 'not yet'));
    list.append(row);
  }
  host.append(list);
}

export function renderPlanner(host, trophies, state) {
  host.replaceChildren();
  const next = planNext(trophies, state, 5);
  if (next.length === 0) {
    host.append(el('p', 'empty', 'Every trophy is earned. Vice Got a Price! should be yours — Leonida Legend.'));
    return;
  }
  host.append(el('p', 'count', 'Your next five, in order. The missable comes first, then the story, then the short jobs.'));
  const list = el('div', 'next-list');
  next.forEach(({ trophy, reason }, index) => {
    const item = el('div', 'next-item');
    item.append(el('span', 'next-rank', String(index + 1)));
    const body = el('div');
    const title = el('h3', null, displayName(trophy, state) + ' ');
    title.append(el('span', 'tag', trophy.grade));
    body.append(title, el('p', null, reason));
    if (trophy.missable) body.append(el('span', 'pill miss', 'missable'));
    item.append(body);
    list.append(item);
  });
  host.append(list);
}
