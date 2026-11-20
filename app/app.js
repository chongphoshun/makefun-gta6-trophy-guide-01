// Leonida Trophy Codex — boot: load the trophy list, wire the toolbar and
// tabs, and keep every view in sync with the saved state. The app fetches
// only its own data/trophies.json; it makes no network request at run time.
import {
  loadState, saveState, applySeed, setSpoiler, downloadExport, importFile,
} from './store.js';
import {
  renderChips, renderProgress, renderList, renderDetail,
  renderRoadmap, renderMissables, renderPlanner,
} from './guide.js';

const params = new URLSearchParams(location.search);
const panel = document.getElementById('panel');
const detail = document.getElementById('detail');
const searchInput = document.getElementById('search');
const kindSelect = document.getElementById('kind');
const gradeSelect = document.getElementById('grade');
const spoilerBox = document.getElementById('spoiler');
const remainingBox = document.getElementById('remaining-only');
const exportButton = document.getElementById('export');
const importButton = document.getElementById('import-btn');
const importInput = document.getElementById('import');
const tabs = document.getElementById('tabs');

let state = loadState();
if (params.has('seed')) state = applySeed(state, params.get('seed'));
if (params.get('spoiler') === 'on') state = setSpoiler(state, true);
if (params.get('spoiler') === 'off') state = setSpoiler(state, false);

let view = params.get('view') ?? 'tracker';
if (!['tracker', 'roadmap', 'missables', 'planner'].includes(view)) view = 'tracker';

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
let selected = params.get('focus') ?? trophies[0].name;
if (!trophies.some((t) => t.name === selected)) selected = trophies[0].name;

function query() {
  return {
    q: searchInput.value,
    kind: kindSelect.value,
    grade: gradeSelect.value,
    remainingOnly: remainingBox.checked,
  };
}

function renderAll(keepSelection = true) {
  renderChips(document.getElementById('grade-chips'), trophies, state);
  renderProgress(trophies, state);
  spoilerBox.checked = state.spoiler;
  for (const tab of tabs.querySelectorAll('.tab')) {
    tab.setAttribute('aria-selected', String(tab.dataset.view === view));
  }
  const found = trophies.find((t) => t.name === selected);
  if (view === 'tracker') {
    renderList(panel, trophies, state, query(), selected, (name, fromToggle) => {
      selected = name;
      renderAll(fromToggle);
    });
  } else if (view === 'roadmap') {
    renderRoadmap(panel, trophies, state);
  } else if (view === 'missables') {
    renderMissables(panel, trophies, state);
  } else {
    renderPlanner(panel, trophies, state);
  }
  renderDetail(detail, found ?? null, state, () => renderChips(document.getElementById('grade-chips'), trophies, state));
  if (!keepSelection) selected = found?.name ?? selected;
}

tabs.addEventListener('click', (event) => {
  const button = event.target.closest('.tab');
  if (!button) return;
  view = button.dataset.view;
  renderAll();
});

for (const control of [searchInput, kindSelect, gradeSelect, remainingBox]) {
  control.addEventListener('input', () => {
    if (view !== 'tracker') view = 'tracker';
    renderAll();
  });
}

spoilerBox.addEventListener('change', () => {
  state = setSpoiler(state, spoilerBox.checked);
  renderAll();
});

exportButton.addEventListener('click', () => downloadExport(state));
importButton.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    state = await importFile(file);
    saveState(state);
    renderAll();
  } catch {
    alert('That file is not a Leonida Codex progress export.');
  }
  importInput.value = '';
});

// A focus passed in the URL opens that trophy's guide in the detail pane.
if (params.get('focus')) {
  const target = document.querySelector('.row.selected');
  if (target) target.scrollIntoView({ block: 'center' });
}

renderAll();
