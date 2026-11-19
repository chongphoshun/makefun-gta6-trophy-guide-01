// Leonida Trophy Codex — state, persistence, filters, export/import.
// The trophy data lives in data/trophies.json; this file owns the checker's
// progress (localStorage), the filters, and the URL parameters the screenshots use.
import { renderAll } from './guide.js';

const STORE_KEY = 'leonida-trophy-codex-v1';

export const KINDS = [
  { key: 'all', label: 'All 55', hint: 'Every trophy' },
  { key: 'story', label: 'Story', hint: 'Chapters and missions' },
  { key: 'missable', label: 'Missable', hint: 'Can be lost for good' },
  { key: 'collectibles', label: 'Collectibles', hint: 'Cards, spots, vehicles, places' },
  { key: 'activities', label: 'Activities', hint: 'Races, robberies, challenges, world' },
  { key: 'online', label: 'Online', hint: 'None at launch' },
];

export const STAGE_NAMES = { 1: 'Stage 1 · Story', 2: 'Stage 2 · 100% checklist', 3: 'Stage 3 · Strangers & cleanup' };

export const state = {
  trophies: [],
  earned: new Set(),
  filter: 'all',
  grade: 'all',
  spoiler: false,
  earnedOnly: false,
  query: '',
  highlight: null,
};

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    state.earned = new Set(ids.filter((n) => Number.isInteger(n)));
  } catch {
    state.earned = new Set();
  }
}

export function saveEarned() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...state.earned].sort((a, b) => a - b)));
}

export function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveEarned();
  renderAll();
}

// v1.3: the next trophies to chase — unearned, in roadmap order (stage, then
// list order), skipping the platinum itself until everything else is done.
export function nextTrophies(count = 3) {
  const rest = state.trophies
    .filter((t) => !state.earned.has(t.id) && t.kind !== 'platinum')
    .sort((a, b) => (a.roadmap - b.roadmap) || (a.id - b.id));
  const picked = rest.slice(0, count);
  if (state.earned.size === state.trophies.length - 1) {
    const plat = state.trophies.find((t) => t.kind === 'platinum');
    if (plat) picked.push(plat);
  }
  return picked.slice(0, count);
}

export function exportProgress() {
  const blob = new Blob([JSON.stringify({ app: 'leonida-trophy-codex', earned: [...state.earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-trophy-codex-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importProgress(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  const ids = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(ids)) throw new Error('not a progress file');
  const known = new Set(state.trophies.map((t) => t.id));
  state.earned = new Set(ids.filter((n) => Number.isInteger(n) && known.has(n)));
  saveEarned();
  renderAll();
}

export function applyParams() {
  const p = new URLSearchParams(location.search);
  const filter = p.get('filter');
  if (filter && KINDS.some((k) => k.key === filter)) state.filter = filter;
  const grade = p.get('grade');
  if (grade && ['platinum', 'gold', 'silver', 'bronze'].includes(grade)) state.grade = grade;
  if (p.get('spoiler') === 'on') state.spoiler = true;
  if (p.get('earned') === 'only') state.earnedOnly = true;
  const q = p.get('q');
  if (q) state.query = q;
  const trophy = Number(p.get('trophy'));
  if (Number.isInteger(trophy) && trophy >= 1 && trophy <= 55) state.highlight = trophy;
  if (p.get('view') === 'roadmap') {
    requestAnimationFrame(() => document.getElementById('roadmap')?.scrollIntoView());
  }
  if (p.get('view') === 'list') {
    requestAnimationFrame(() => document.getElementById('controls')?.scrollIntoView());
  }
}

export function filteredTrophies() {
  const q = state.query.trim().toLowerCase();
  return state.trophies.filter((t) => {
    if (state.filter === 'missable' && !t.missable) return false;
    if (state.filter === 'online') return false;
    if (state.filter !== 'all' && state.filter !== 'missable' && t.kind !== state.filter) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedOnly && !state.earned.has(t.id)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.chapter ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

async function boot() {
  const doc = await (await fetch('data/trophies.json')).json();
  state.trophies = doc.trophies;
  loadEarned();
  applyParams();
  bindControls();
  renderAll();
  if (state.highlight) {
    requestAnimationFrame(() => {
      document.getElementById(`trophy-${state.highlight}`)?.scrollIntoView({ block: 'center' });
    });
  }
  window.__shotReady = true;
}

function bindControls() {
  document.getElementById('search').addEventListener('input', (e) => {
    state.query = e.target.value;
    renderAll();
  });
  document.getElementById('gradeFilter').addEventListener('change', (e) => {
    state.grade = e.target.value;
    renderAll();
  });
  document.getElementById('spoilerToggle').addEventListener('change', (e) => {
    state.spoiler = e.target.checked;
    renderAll();
  });
  document.getElementById('earnedOnly').addEventListener('change', (e) => {
    state.earnedOnly = e.target.checked;
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch {
      alert('That file is not a Leonida Trophy Codex progress export.');
    }
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear every earned tick?')) {
      state.earned = new Set();
      saveEarned();
      renderAll();
    }
  });
  // Keep the controls in sync with URL parameters (the screenshots use them).
  document.getElementById('search').value = state.query;
  document.getElementById('gradeFilter').value = state.grade;
  document.getElementById('spoilerToggle').checked = state.spoiler;
  document.getElementById('earnedOnly').checked = state.earnedOnly;
}

boot();
