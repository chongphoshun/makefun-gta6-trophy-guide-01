// Leonida Trophy Codex — rendering: progress, filters, trophy groups, cards.
// Sources are shown as plain text (name + address), never as links: the guide
// runs fully offline and fetches nothing.
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
    let members;
    if (g.key === 'missable') members = list.filter((t) => t.missable);
    else members = list.filter((t) => t.kind === g.key);
    if (members.length === 0) continue;
    if (state.filter !== 'all' && state.filter !== 'missable' && g.key !== state.filter) continue;
    if (state.filter === 'missable' && g.key !== 'missable') continue;
    const h = el('h2', 'group-title', g.title);
    const sub = el('p', 'group-sub', g.sub);
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
