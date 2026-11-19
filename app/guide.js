// Leonida Trophy Codex — rendering: progress, filters, trophy groups, cards.
// Sources are shown as plain text (name + address), never as links: the guide
// runs fully offline and fetches nothing.
// Each trophy renders exactly once, in its primary group (its kind). A trophy
// that also belongs to another group — the one missable trophy, Positive Mental
// Attitude, whose kind is Collectibles — is cross-listed there by name with an
// anchor to its card, never as a second card.
// v1.2: every card also lists up to three related trophies (same chapter, same
// collectible chain, or same roadmap stage in the same kind), so a chain can
// be followed from the card itself instead of searched for.
import { state, KINDS, filteredTrophies, toggleEarned } from './app.js';

const GROUP_ORDER = [
  { key: 'platinum', title: 'The Platinum', sub: 'One trophy. Earn the other 54 and this is yours.' },
  { key: 'story', title: 'Story', sub: 'Chapters and missions — all hidden until earned, none missable.' },
  { key: 'missable', title: 'Missable', sub: 'The one trophy that can be lost: meditate at Jason\u2019s house in Chapter 1.' },
  { key: 'collectibles', title: 'Collectibles', sub: 'Cards, meditation spots, vehicles, and the whole of Leonida.' },
  { key: 'activities', title: 'Activities', sub: 'Races, robberies, challenges, strangers, and the world itself.' },
  { key: 'online', title: 'Online', sub: 'GTA VI launches with no online mode — no trophy needs it.' },
];

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function gradeLabel(grade) {
  return grade[0].toUpperCase() + grade.slice(1);
}

function countText(t) {
  if (t.count === null || t.count === undefined) return null;
  if (t.id === 52) return '$250,000 laundered';
  if (t.id === 53) return '$100,000 spent';
  if (t.id === 48) return '500 actions';
  return `${t.count} to go`;
}

// Related trophies for one card: same chapter first, then the same kind in
// the same roadmap stage, then the rest of the same kind. At most three.
function relatedTrophies(t) {
  const score = (o) => {
    if (t.chapter && o.chapter === t.chapter) return 0;
    if (o.kind === t.kind && o.roadmap === t.roadmap) return 1;
    if (o.kind === t.kind) return 2;
    return 3;
  };
  return state.trophies
    .filter((o) => o.id !== t.id && score(o) < 3)
    .sort((a, b) => score(a) - score(b) || a.id - b.id)
    .slice(0, 3);
}

export function renderAll() {
  renderProgress();
  renderGradeChips();
  renderKindChips();
  renderGroups();
  renderSources();
}

function renderProgress() {
  const total = state.trophies.length;
  const earned = state.earned.size;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressText').textContent =
    `${earned} of ${total} earned · ${pct}% to the platinum`;
}

function renderGradeChips() {
  const box = document.getElementById('gradeChips');
  box.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const have = state.trophies.filter((t) => t.grade === grade && state.earned.has(t.id)).length;
    const total = state.trophies.filter((t) => t.grade === grade).length;
    const chip = el('span', `grade-chip grade-${grade}`);
    const b = el('b', null, gradeLabel(grade));
    chip.append(b, ` ${have}/${total}`);
    box.append(chip);
  }
}

function renderKindChips() {
  const box = document.getElementById('kindChips');
  box.replaceChildren();
  for (const k of KINDS) {
    const chip = el('button', `chip${state.filter === k.key ? ' active' : ''}`, k.label);
    chip.type = 'button';
    chip.title = k.hint;
    chip.addEventListener('click', () => {
      state.filter = k.key;
      renderAll();
    });
    box.append(chip);
  }
}

function trophyCard(t) {
  const earned = state.earned.has(t.id);
  const masked = state.spoiler && t.hidden && !earned;
  const card = el('article', `trophy${earned ? ' earned' : ''}${state.highlight === t.id ? ' highlight' : ''}`);
  card.id = `trophy-${t.id}`;
  const head = el('div', 'trophy-head');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : t.name} as earned`);
  box.addEventListener('change', () => toggleEarned(t.id));
  const body = el('div');
  const name = el('h3', 'trophy-name', masked ? 'Hidden Trophy' : t.name);
  if (!masked && t.hidden) {
    const tag = el('span', 'hidden-tag', 'HIDDEN');
    name.append(tag);
  }
  body.append(name);
  const official = el('p', 'official', masked ? 'Hidden until earned — a story trophy. Tick it off to reveal it.' : `Official: “${t.description}”`);
  body.append(official);
  const badges = el('div', 'badges');
  badges.append(el('span', `badge ${t.grade}`, gradeLabel(t.grade)));
  if (t.missable) badges.append(el('span', 'badge missable', 'MISSABLE'));
  if (t.unconfirmed) badges.append(el('span', 'badge unconfirmed', 'UNCONFIRMED'));
  const count = countText(t);
  if (count) badges.append(el('span', 'badge count', count));
  if (t.chapter) badges.append(el('span', 'badge', t.chapter));
  body.append(badges);
  if (masked) {
    body.append(el('p', 'spoiler-mask', 'Guide and source hidden by spoiler mode. Earn this trophy to reveal them.'));
  } else {
    body.append(el('p', 'guide', t.guide));
    const src = el('p', 'source');
    src.append(el('b', null, 'Source: '), document.createTextNode(`${t.source} — ${t.source_url}`));
    body.append(src);
    const related = relatedTrophies(t);
    if (related.length) {
      const line = el('p', 'related');
      line.append(el('b', null, 'Related: '));
      related.forEach((o, i) => {
        if (i) line.append(document.createTextNode(' · '));
        const a = el('a', null, o.name);
        a.href = `#trophy-${o.id}`;
        line.append(a);
      });
      body.append(line);
    }
  }
  head.append(box, body);
  card.append(head);
  return card;
}

function renderGroups() {
  const main = document.getElementById('groups');
  main.replaceChildren();
  const list = filteredTrophies();
  const stats = document.getElementById('statsLine');
  if (state.filter === 'online') {
    stats.textContent = 'Online: 0 trophies. GTA VI launches as a single-player game with no online mode — every one of the 55 trophies is earned offline.';
    const empty = el('p', 'empty', 'No online trophies. Everything in this guide is earned offline, in the single-player game.');
    main.append(empty);
    return;
  }
  stats.textContent = `Showing ${list.length} of ${state.trophies.length} trophies · ${state.earned.size} earned`;
  if (list.length === 0) {
    main.append(el('p', 'empty', 'Nothing matches these filters. Clear the search or pick another kind.'));
    return;
  }
  for (const g of GROUP_ORDER) {
    if (g.key === 'online') continue;
    if (state.filter !== 'all' && state.filter !== 'missable' && g.key !== state.filter) continue;
    if (state.filter === 'missable' && g.key !== 'missable') continue;
    const h = el('h2', 'group-title', g.title);
    const sub = el('p', 'group-sub', g.sub);
    if (g.key === 'missable') {
      const missable = list.filter((t) => t.missable);
      if (missable.length === 0) continue;
      main.append(h, sub);
      // The Missable filter shows the full cards (each once — the other
      // groups are hidden in that view). In every other view the missable
      // trophies already have their card in their primary group, so this
      // group lists them by name with an anchor instead of a second card.
      if (state.filter === 'missable') {
        for (const t of missable) main.append(trophyCard(t));
      } else {
        for (const t of missable) {
          if (t.kind === 'missable') {
            main.append(trophyCard(t));
            continue;
          }
          const primary = GROUP_ORDER.find((x) => x.key === t.kind);
          const line = el('p', 'xref');
          const a = el('a', null, t.name);
          a.href = `#trophy-${t.id}`;
          line.append(a, document.createTextNode(` — also listed under ${primary ? primary.title : t.kind}`));
          main.append(line);
        }
      }
      continue;
    }
    const members = list.filter((t) => t.kind === g.key);
    if (members.length === 0) continue;
    main.append(h, sub);
    for (const t of members) main.append(trophyCard(t));
  }
}

function renderSources() {
  const box = document.getElementById('sourceList');
  if (box.children.length) return;
  const seen = new Map();
  for (const t of state.trophies) seen.set(t.source_url, t.source);
  for (const [url, name] of seen) {
    const li = el('li');
    li.append(el('b', null, `${name} `), document.createTextNode(`— ${url}`));
    box.append(li);
  }
}
