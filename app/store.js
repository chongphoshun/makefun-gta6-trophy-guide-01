// Progress store: earned ticks and personal notes, kept in localStorage only.
// Nothing here touches the network. Demo mode (?demo=1) seeds a fixed set of
// earned trophies in memory so screenshots show a half-finished run; it never
// writes to localStorage, so a reader's own progress is never polluted.

export const STORE_KEY = 'leonida-trophy-codex-v1';
export const NOTES_KEY = 'leonida-trophy-codex-notes-v1';

// The thirteen trophies a demo run shows as earned: the opening story beats
// plus a few early side and activity ones, matching the house guides' seeded
// progress (13 of 55) so screenshots read as a run in progress.
export const DEMO_EARNED = [
  'just-like-paradise',
  'paradise-lost',
  'trust',
  'baited-my-tackle',
  'stick-fiddler',
  'in-the-beginning',
  'lets-go-bowling',
  'ten-pin',
  'hot-together',
  'whip-it-good',
  'on-the-spot',
  'treat-yo-self',
  'dime-on-the-dollar',
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full store: the app keeps working in memory.
  }
}

export function loadEarned(demo) {
  if (demo) return new Set(DEMO_EARNED);
  const list = readJson(STORE_KEY, []);
  return new Set(Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []);
}

export function loadNotes() {
  const obj = readJson(NOTES_KEY, {});
  return obj && typeof obj === 'object' ? obj : {};
}

export function persistEarned(earned, demo) {
  if (demo) return;
  writeJson(STORE_KEY, [...earned]);
}

export function persistNotes(notes, demo) {
  if (demo) return;
  writeJson(NOTES_KEY, notes);
}

export function earnedAsFile(earned) {
  return JSON.stringify({ app: 'leonida-trophy-codex', version: 1, earned: [...earned].sort() }, null, 2);
}

export function earnedFromFile(text) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(list)) throw new Error('no earned list in file');
  return new Set(list.filter((x) => typeof x === 'string'));
}

export function downloadText(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime || 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
