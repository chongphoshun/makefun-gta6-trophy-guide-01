// Leonida Trophy Codex — saved progress: localStorage, export, import, demo seed.
// Nothing here touches the network. The key is versioned so a future entry
// never mistakes another guide's ticks for its own.
export const STORE_KEY = 'leonida-codex-v18';
export const SEED_ORDER = [
  'Just Like Paradise', 'Paradise Lost', 'Trust', 'Master of None',
  'Stick Fiddler', 'Baited My Tackle', 'Top Fun', 'Earn Cash, Not Kudos',
  'Whip It Good', 'Hot Together', 'Retail Therapy', 'Gunslinger',
  'Treat Yo Self', 'On the Spot', 'Little Boxes', 'One Last Thing',
  'Cunning Stunts', 'The Shootist', 'Strangers & Freaks',
];

function blankState() {
  return { earned: [], notes: {}, spoiler: false };
}

function cleanState(raw) {
  const state = blankState();
  if (!raw || typeof raw !== 'object') return state;
  if (Array.isArray(raw.earned)) state.earned = raw.earned.filter((n) => typeof n === 'string');
  if (raw.notes && typeof raw.notes === 'object') {
    for (const [name, note] of Object.entries(raw.notes)) {
      if (typeof note === 'string' && note.length < 2000) state.notes[name] = note;
    }
  }
  state.spoiler = raw.spoiler === true;
  return state;
}

export function loadState() {
  try {
    return cleanState(JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null'));
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota: the tracker still works for the session.
  }
}

export function earnedSet(state) {
  return new Set(state.earned);
}

export function toggleEarned(state, name) {
  const set = earnedSet(state);
  if (set.has(name)) set.delete(name);
  else set.add(name);
  state.earned = [...set];
  saveState(state);
  return state;
}

export function setNote(state, name, text) {
  if (text.trim() === '') delete state.notes[name];
  else state.notes[name] = text.slice(0, 2000);
  saveState(state);
  return state;
}

export function setSpoiler(state, on) {
  state.spoiler = on;
  saveState(state);
  return state;
}

// Demo seed for screenshots: mark the first N trophies of a fixed, visible
// order as earned. Only used when the page is opened with ?seed=N, and only
// when the reader has no saved progress yet, so a real tracker is never
// overwritten by a screenshot run.
export function applySeed(state, n) {
  if (state.earned.length > 0) return state;
  const count = Math.max(0, Math.min(SEED_ORDER.length, Number(n) || 0));
  state.earned = SEED_ORDER.slice(0, count);
  saveState(state);
  return state;
}

export function exportBlob(state) {
  const payload = {
    app: 'Leonida Trophy Codex',
    version: 18,
    exported_at: new Date().toISOString(),
    earned: state.earned,
    notes: state.notes,
    spoiler: state.spoiler,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function importFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  // Accept both our own export shape and a bare { earned: [...] } file.
  const candidate = parsed && typeof parsed === 'object' ? parsed : {};
  return cleanState(candidate);
}

export function downloadExport(state) {
  const url = URL.createObjectURL(exportBlob(state));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'leonida-codex-progress.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
