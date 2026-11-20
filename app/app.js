// Leonida Trophy Codex — boot, state and rendering. One module wires the
// whole app: it loads the trophy data, keeps the checklist in the store,
// filters and searches it, and draws the four tabs (checklist, roadmap,
// missables, up next) plus the guide pane beside them.

import {
  loadEarned,
  loadNotes,
  persistEarned,
  persistNotes,
  earnedAsFile,
  earnedFromFile,
  downloadText,
} from './store.js';
import { guidePaneHtml, pickUpNext, whyNext, gradeLabel, kindLabel, ROADMAP_STAGES } from './guide.js';

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
const SPOILER_KEY = 'leonida-trophy-codex-spoilers-v1';

const panel = document.getElementById('panel');
const guidePane = document.getElementById('guidePane');
const earnedCount = document.getElementById('earnedCount');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const searchInput = document.getElementById('q');
const gradeSel = document.getElementById('gradeSel');
const spoilerToggle = document.getElementById('spoilerToggle');

const response = await fetch('data/trophies.json');
const catalog = await response.json();
const trophies = catalog.trophies;

let earned = loadEarned(DEMO);
let notes = DEMO ? {} : loadNotes();
let tab = params.get('tab') || 'checklist';
let kind = 'all';
let grade = 'all';
let query = '';
let selected = params.get('focus') || null;
let spoilersOn = params.get('spoilers') === 'on' || (!DEMO && localStorage.getItem(SPOILER_KEY) === '1');
spoilerToggle.checked = spoilersOn;

function saveProgress() {
  persistEarned(earned, DEMO);
}

function saveNotes() {
  persistNotes(notes, DEMO);
}

function spoilerName(trophy) {
  if (spoilersOn && trophy.kind === 'story' && !earned.has(trophy.slug)) return 'Hidden story trophy';
  return trophy.name;
}

function spoilerDesc(trophy) {
  if (spoilersOn && trophy.kind === 'story' && !earned.has(trophy.slug)) return 'Hidden until earned.';
  return trophy.desc;
}

function renderProgress() {
  const done = earned.size;
  const total = trophies.length;
  earnedCount.textContent = done;
  progressFill.style.width = `${Math.round((done / total) * 100)}%`;
  progressText.textContent = `${done} earned · ${total - done} to go`;
}

function matchesFilters(trophy) {
  if (kind === 'missable' && !trophy.missable) return false;
  if (kind === 'online') return false;
  if (kind !== 'all' && kind !== 'missable' && trophy.kind !== kind) return false;
  if (grade !== 'all' && trophy.grade !== grade) return false;
  if (query) {
    const hay = `${trophy.name} ${trophy.desc} ${trophy.guide} ${trophy.kind}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function trophyRow(trophy) {
  const isEarned = earned.has(trophy.slug);
  const row = document.createElement('button');
  row.type = 'button';
  row.className = `trophy-row${isEarned ? ' earned' : ''}${selected === trophy.slug ? ' selected' : ''}`;
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('click', (event) => {
    event.stopPropagation();
    if (box.checked) earned.add(trophy.slug);
    else earned.delete(trophy.slug);
    saveProgress();
    renderAll();
  });
  const body = document.createElement('span');
  const name = document.createElement('span');
  name.className = 'trophy-name';
  name.textContent = spoilerName(trophy);
  if (trophy.hidden) {
    const tag = document.createElement('span');
    tag.className = 'hidden-tag';
    tag.textContent = 'hidden on PSN';
    name.append(tag);
  }
  const desc = document.createElement('span');
  desc.className = 'trophy-desc';
  desc.textContent = spoilerDesc(trophy);
  const meta = document.createElement('span');
  meta.className = 'trophy-meta';
  meta.innerHTML = [
    `<span class="badge grade-${trophy.grade}">${gradeLabel(trophy.grade)}</span>`,
    `<span class="badge kind">${kindLabel(trophy.kind)}</span>`,
    trophy.missable ? '<span class="badge missable">Missable</span>' : '',
    trophy.unconfirmed ? '<span class="badge unconfirmed">Unconfirmed</span>' : '',
  ].join('');
  body.append(name, desc, meta);
  if (trophy.target) {
    const target = document.createElement('span');
    target.className = 'trophy-target';
    target.textContent = `Target: ${trophy.target.toLocaleString('en-US')}`;
    body.append(target);
  }
  const right = document.createElement('span');
  right.className = 'trophy-target';
  right.textContent = `Stage ${trophy.stage}`;
  row.append(box, body, right);
  row.addEventListener('click', () => {
    selected = trophy.slug;
    renderAll();
    guidePane.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  return row;
}

function renderChecklist() {
  const head = document.createElement('div');
  if (kind === 'online') {
    head.innerHTML = `<h2>Online trophies</h2>
      <p class="panel-note">There are none. All 55 trophies are single-player and offline — PowerPyx lists 55 offline trophies and 0 online, and no DLC or multiplayer is needed for the platinum.</p>
      <div class="empty-state">No online trophies exist for this game. Every trophy on this list can be earned alone, offline.</div>`;
    panel.replaceChildren(head);
    return;
  }
  const shown = trophies.filter(matchesFilters);
  const earnedShown = shown.filter((t) => earned.has(t.slug)).length;
  head.innerHTML = `<h2>Checklist</h2>
    <p class="panel-note">Tick a trophy off when you earn it — your progress is saved in this browser. Click any row to read its guide and sources.</p>
    <p class="count-line">Showing ${shown.length} of ${trophies.length} trophies · ${earnedShown} earned in this view</p>`;
  const list = document.createElement('div');
  list.className = 'trophy-list';
  if (shown.length === 0) {
    list.innerHTML = '<div class="empty-state">Nothing matches those filters. Clear the search or pick another kind.</div>';
  } else {
    for (const trophy of shown) list.append(trophyRow(trophy));
  }
  panel.replaceChildren(head, list);
}

function renderRoadmap() {
  const head = document.createElement('div');
  head.innerHTML = `<h2>Roadmap to the platinum</h2>
    <p class="panel-note">PowerPyx rates the set 4 out of 10 and about 200 hours in one playthrough. Three stages, in order — and only one trophy that can be missed.</p>`;
  const wrap = document.createElement('div');
  for (const stage of ROADMAP_STAGES) {
    const members = trophies.filter((t) => t.stage === stage.id);
    const done = members.filter((t) => earned.has(t.slug)).length;
    const block = document.createElement('section');
    block.className = 'stage';
    block.innerHTML = `<h3>${stage.title}</h3>
      <p class="stage-time">${stage.time} · ${done} of ${members.length} trophies earned</p>
      <p>${stage.blurb}</p>
      <ul>${stage.tips.map((tip) => `<li>${tip}</li>`).join('')}</ul>`;
    const chips = document.createElement('div');
    chips.className = 'trophy-meta';
    for (const member of members) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = `${earned.has(member.slug) ? '✓ ' : ''}${spoilerName(member)}`;
      chip.addEventListener('click', () => {
        selected = member.slug;
        renderAll();
      });
      chips.append(chip);
    }
    block.append(chips);
    wrap.append(block);
  }
  panel.replaceChildren(head, wrap);
}

function renderMissables() {
  const head = document.createElement('div');
  const flagged = trophies.filter((t) => t.missable);
  const unconfirmed = trophies.filter((t) => t.unconfirmed);
  head.innerHTML = `<h2>Missables</h2>
    <p class="panel-note">Built from the official descriptions and the guides that cite them. Only one trophy on the whole list is flagged as possibly missable — and three more have no verified method yet, so this codex flags them honestly instead of guessing.</p>`;
  const warn = document.createElement('div');
  warn.className = 'warn-box';
  warn.innerHTML = `<strong>Positive Mental Attitude is the only possibly missable trophy.</strong> GTABase and PowerPyx agree on that. Everything else — story trophies included — can be finished after the story in free-roam.`;
  const list = document.createElement('div');
  list.className = 'trophy-list';
  for (const trophy of flagged) list.append(trophyRow(trophy));
  const unhead = document.createElement('h2');
  unhead.textContent = 'Unconfirmed — no verified method yet';
  const unnote = document.createElement('p');
  unnote.className = 'panel-note';
  unnote.textContent = 'These three trophies have descriptions too vague to build a guide from, and no guide has confirmed how they unlock. This codex says so plainly rather than inventing steps.';
  const unlist = document.createElement('div');
  unlist.className = 'trophy-list';
  for (const trophy of unconfirmed) unlist.append(trophyRow(trophy));
  panel.replaceChildren(head, warn, list, unhead, unnote, unlist);
}

function renderUpNext() {
  const head = document.createElement('div');
  const next = pickUpNext(trophies, earned, 5);
  head.innerHTML = `<h2>Up next</h2>
    <p class="panel-note">Your next five trophies, in the order this codex would chase them: the missable first, then the story stage, then the checklist grind.</p>`;
  const wrap = document.createElement('div');
  if (next.length === 0) {
    wrap.innerHTML = '<div class="empty-state">All 55 earned — Vice Got a Price! is yours. Leonida Legend.</div>';
  }
  next.forEach((trophy, index) => {
    const card = document.createElement('article');
    card.className = 'next-card';
    card.innerHTML = `<p class="next-rank">Next ${index + 1} · Stage ${trophy.stage}</p>
      <p class="next-name">${spoilerName(trophy)}</p>
      <p>${whyNext(trophy)}</p>`;
    card.addEventListener('click', () => {
      selected = trophy.slug;
      renderAll();
    });
    wrap.append(card);
  });
  panel.replaceChildren(head, wrap);
}

function renderGuidePane() {
  const trophy = trophies.find((t) => t.slug === selected);
  if (!trophy) {
    guidePane.innerHTML = '<p class="guide-empty">Pick a trophy from the list to read its guide, its sources and its missable warning.</p>';
    return;
  }
  guidePane.innerHTML = guidePaneHtml(trophy, earned, spoilersOn, notes[trophy.slug] || '');
  const toggle = document.getElementById('toggleEarned');
  toggle.addEventListener('click', () => {
    if (earned.has(trophy.slug)) earned.delete(trophy.slug);
    else earned.add(trophy.slug);
    saveProgress();
    renderAll();
  });
  const noteInput = document.getElementById('trophyNote');
  noteInput.addEventListener('input', () => {
    notes[trophy.slug] = noteInput.value;
    saveNotes();
  });
}

function renderAll() {
  renderProgress();
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  document.querySelectorAll('#kindChips .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.kind === kind);
  });
  if (tab === 'checklist') renderChecklist();
  else if (tab === 'roadmap') renderRoadmap();
  else if (tab === 'missables') renderMissables();
  else renderUpNext();
  renderGuidePane();
}

document.querySelectorAll('.tab').forEach((button) => {
  button.addEventListener('click', () => {
    tab = button.dataset.tab;
    renderAll();
  });
});

document.querySelectorAll('#kindChips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    kind = chip.dataset.kind;
    tab = 'checklist';
    renderAll();
  });
});

gradeSel.addEventListener('change', () => {
  grade = gradeSel.value;
  tab = 'checklist';
  renderAll();
});

searchInput.addEventListener('input', () => {
  query = searchInput.value.trim().toLowerCase();
  tab = 'checklist';
  renderAll();
});

spoilerToggle.addEventListener('change', () => {
  spoilersOn = spoilerToggle.checked;
  if (!DEMO) localStorage.setItem(SPOILER_KEY, spoilersOn ? '1' : '0');
  renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  downloadText('leonida-trophy-progress.json', earnedAsFile(earned));
});

document.getElementById('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const next = earnedFromFile(await file.text());
    const known = new Set(trophies.map((t) => t.slug));
    earned = new Set([...next].filter((slug) => known.has(slug)));
    saveProgress();
    renderAll();
  } catch {
    alert('That file does not look like a Leonida Trophy Codex export.');
  }
  event.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and notes in this browser?')) return;
  earned = new Set();
  notes = {};
  saveProgress();
  saveNotes();
  renderAll();
});

renderAll();
