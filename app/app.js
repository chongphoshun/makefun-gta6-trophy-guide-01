// app.js — boot and render for the Leonida Field Journal. Loads the trophy data,
// wires the toolbar, the four views and the sidebar, and re-renders on every tick.
// Views are chosen by the nav buttons or by ?view=roadmap|missables|planner in the
// URL; ?open=<trophy name> opens one trophy's guide; ?spoiler=off lifts the veil.
import { loadVault, saveVault, isEarned, toggleEarned, exportProgress, importProgress, resetVault } from './vault.js';
import { KIND_LABELS, KIND_ORDER, emptyFilterState, matchesFilters, isVeiled } from './filters.js';
import { STAGES, trophiesInStage, stageProgress, upNext } from './planner.js';
import { buildGuidePane } from './detail.js';

const RING_CIRCUMFERENCE = 326.7;
const VIEWS = ['checklist', 'roadmap', 'missables', 'planner'];

const state = emptyFilterState();
const vault = loadVault();
const openCards = new Set();
let trophies = [];

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.get('view') && VIEWS.includes(params.get('view'))) state.view = params.get('view');
if (params.get('spoiler') === 'off') state.spoiler = false;
const openRequested = params.get('open');

function earnedSet() {
  return new Set(vault.earned);
}

function gradeCounts() {
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    counts[t.grade][1] += 1;
    if (isEarned(vault, t.name)) counts[t.grade][0] += 1;
  }
  return counts;
}

function renderProgress() {
  const earned = vault.earned.length;
  const total = trophies.length || 55;
  $('earnedCount').textContent = `${earned} / ${total}`;
  $('ringFill').style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - earned / total));
  $('progressLine').textContent = earned === 0
    ? 'The journal opens at 0. Tick a trophy and the ring fills.'
    : earned === total
      ? 'Platinum complete — every trophy in the journal is earned.'
      : `${earned} of ${total} earned — ${total - earned} to go. The ring fills as you tick.`;
  const counts = gradeCounts();
  $('gradeChips').replaceChildren();
  for (const [grade, [got, all]] of Object.entries(counts)) {
    const chip = document.createElement('span');
    chip.textContent = `${grade} ${got}/${all}`;
    $('gradeChips').append(chip);
  }
}

function renderKindChips() {
  const host = $('kindChips');
  host.replaceChildren();
  for (const kind of ['all', ...KIND_ORDER]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = KIND_LABELS[kind];
    btn.classList.toggle('active', state.kind === kind);
    btn.addEventListener('click', () => {
      state.kind = kind;
      renderKindChips();
      renderList();
    });
    host.append(btn);
  }
}

function medalLabel(grade) {
  return grade === 'platinum' ? '◆ Platinum' : grade === 'gold' ? '◆ Gold' : grade === 'silver' ? '◆ Silver' : '◆ Bronze';
}

function buildCard(t) {
  const earned = isEarned(vault, t.name);
  const veiled = isVeiled(t, state, earned);
  const card = document.createElement('article');
  card.className = 'trophy' + (earned ? ' earned' : '') + (t.missable ? ' missable-card' : '');
  card.dataset.name = t.name;

  const head = document.createElement('div');
  head.className = 'trophy-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', `Earned: ${t.name}`);
  box.addEventListener('change', () => {
    toggleEarned(vault, t.name);
    renderAll();
  });
  const text = document.createElement('div');
  const name = document.createElement('h3');
  name.className = 'trophy-name';
  name.textContent = veiled ? 'Hidden trophy — earn it to reveal' : t.name;
  const medal = document.createElement('span');
  medal.className = `medal ${t.grade}`;
  medal.textContent = ` ${medalLabel(t.grade)}`;
  name.append(medal);
  const desc = document.createElement('p');
  desc.className = 'trophy-desc' + (veiled ? ' spoiler-veil' : '');
  desc.textContent = veiled ? 'Hidden on PlayStation until earned. Turn spoiler mode off to peek, or earn it in the game.' : t.desc;
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  const kindChip = document.createElement('span');
  kindChip.className = 'chip';
  kindChip.textContent = KIND_LABELS[t.kind] ?? t.kind;
  meta.append(kindChip);
  if (t.target) {
    const target = document.createElement('span');
    target.className = 'chip';
    target.textContent = t.target;
    meta.append(target);
  }
  if (t.hidden) {
    const hidden = document.createElement('span');
    hidden.className = 'chip hidden-chip';
    hidden.textContent = 'Hidden';
    meta.append(hidden);
  }
  if (t.missable) {
    const miss = document.createElement('span');
    miss.className = 'chip missable';
    miss.textContent = '⚠ Missable';
    meta.append(miss);
  }
  if (t.unconfirmed) {
    const unc = document.createElement('span');
    unc.className = 'chip unconfirmed';
    unc.textContent = 'Unconfirmed';
    meta.append(unc);
  }
  if (earned) {
    const done = document.createElement('span');
    done.className = 'chip';
    done.textContent = '✓ Earned';
    meta.append(done);
  }
  text.append(name, desc, meta);
  head.append(box, text);
  head.addEventListener('click', (event) => {
    if (event.target === box) return;
    if (openCards.has(t.name)) {
      openCards.delete(t.name);
      card.querySelector('.trophy-guide')?.remove();
    } else {
      openCards.add(t.name);
      card.append(buildGuidePane(t, vault, renderSidebar));
    }
  });
  card.append(head);
  if (openCards.has(t.name)) card.append(buildGuidePane(t, vault, renderSidebar));
  return card;
}

function renderList() {
  const host = $('trophyList');
  host.replaceChildren();
  const shown = trophies.filter((t) => matchesFilters(t, state, isEarned(vault, t.name)));
  $('listCount').textContent = `Showing ${shown.length} of ${trophies.length} trophies`;
  if (shown.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No trophy matches those filters. Clear the search or pick another kind.';
    host.append(empty);
    return;
  }
  for (const t of shown) host.append(buildCard(t));
}

function renderRoadmap() {
  const mini = $('miniRoadmap');
  mini.replaceChildren();
  const full = $('roadmapFull');
  full.replaceChildren();
  const earned = earnedSet();
  for (const stage of STAGES) {
    const inStage = trophiesInStage(trophies, stage.n);
    const { done, total } = stageProgress(trophies, stage.n, earned);
    const miniItem = document.createElement('li');
    miniItem.innerHTML = '';
    const miniTitle = document.createElement('strong');
    miniTitle.textContent = `Stage ${stage.n} — ${stage.title}`;
    const miniSub = document.createElement('small');
    miniSub.textContent = `${done}/${total} done · ${stage.time}`;
    miniItem.append(miniTitle, miniSub);
    mini.append(miniItem);

    const block = document.createElement('div');
    block.className = 'roadmap-stage';
    const title = document.createElement('h3');
    title.textContent = `Stage ${stage.n} — ${stage.title} `;
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = `· ${stage.time}`;
    title.append(time);
    const text = document.createElement('p');
    text.textContent = stage.text;
    const progress = document.createElement('p');
    progress.className = 'stage-progress';
    progress.textContent = `${done} of ${total} trophies in this stage earned`;
    const list = document.createElement('ul');
    list.className = 'stage-trophies';
    for (const t of inStage) {
      const li = document.createElement('li');
      if (earned.has(t.name)) li.className = 'done';
      li.textContent = (earned.has(t.name) ? '✓ ' : '') + t.name + (t.missable ? ' ⚠' : '');
      list.append(li);
    }
    block.append(title, text, progress, list);
    full.append(block);
  }
}

function renderMissables() {
  const host = $('missableList');
  host.replaceChildren();
  const missable = trophies.filter((t) => t.missable);
  for (const t of missable) host.append(buildCard(t));
  if (missable.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No missable trophies in the data.';
    host.append(p);
  }
}

function renderPlanner() {
  const next = upNext(trophies, earnedSet(), 5);
  const side = $('upNextSide');
  side.replaceChildren();
  const full = $('plannerList');
  full.replaceChildren();
  for (const { trophy, why } of next) {
    const sideItem = document.createElement('li');
    const sideName = document.createElement('strong');
    sideName.textContent = trophy.name;
    const sideWhy = document.createElement('small');
    sideWhy.textContent = why;
    sideItem.append(sideName, sideWhy);
    side.append(sideItem);

    const item = document.createElement('li');
    const name = document.createElement('b');
    name.textContent = trophy.name;
    const grade = document.createElement('span');
    grade.textContent = ` — ${medalLabel(trophy.grade)} · Stage ${trophy.stage}`;
    const reason = document.createElement('small');
    reason.textContent = why;
    item.append(name, grade, reason);
    full.append(item);
  }
}

function renderSidebar() {
  renderPlanner();
}

function renderAll() {
  renderProgress();
  renderList();
  renderRoadmap();
  renderMissables();
  renderPlanner();
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.viewbtn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.querySelectorAll('[data-section]').forEach((section) => {
    section.hidden = section.dataset.section !== view;
  });
}

function wireControls() {
  document.querySelectorAll('.viewbtn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  $('search').addEventListener('input', (event) => {
    state.q = event.target.value;
    renderList();
  });
  $('gradeFilter').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderList();
  });
  $('spoilerToggle').checked = state.spoiler;
  $('spoilerToggle').addEventListener('change', (event) => {
    state.spoiler = event.target.checked;
    renderList();
    renderMissables();
  });
  $('remainingOnly').addEventListener('change', (event) => {
    state.remaining = event.target.checked;
    renderList();
  });
  $('exportBtn').addEventListener('click', () => exportProgress(vault));
  $('importFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      importProgress(vault, await file.text(), trophies.map((t) => t.name));
      renderAll();
      $('listCount').textContent = 'Progress imported.';
    } catch {
      $('listCount').textContent = 'Import failed — that file is not a journal export.';
    }
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (window.confirm('Reset all earned ticks and notes in this journal?')) {
      resetVault(vault);
      openCards.clear();
      renderAll();
    }
  });
}

async function boot() {
  const response = await fetch('data/trophies.json');
  const doc = await response.json();
  trophies = doc.trophies;
  wireControls();
  renderKindChips();
  renderAll();
  saveVault(vault);
  switchView(state.view ?? 'checklist');
  if (openRequested) {
    const target = trophies.find((t) => t.name.toLowerCase() === openRequested.toLowerCase());
    if (target) {
      openCards.add(target.name);
      switchView('checklist');
      renderList();
      document.querySelector(`[data-name="${CSS.escape(target.name)}"]`)?.scrollIntoView({ block: 'start' });
    }
  }
}

boot();
