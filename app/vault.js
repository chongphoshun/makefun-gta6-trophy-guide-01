// vault.js — the journal's save drawer: earned ticks and per-trophy notes, kept in
// localStorage under one key, with export to a file and import back. Nothing here
// touches the network; the file download is a blob the browser makes locally.
export const VAULT_KEY = 'leonida-field-journal-v1';

export function loadVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return { earned: [], notes: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { earned: [], notes: {} };
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((n) => typeof n === 'string') : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
    };
  } catch {
    return { earned: [], notes: {} };
  }
}

export function saveVault(vault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify({ earned: vault.earned, notes: vault.notes }));
}

export function isEarned(vault, name) {
  return vault.earned.includes(name);
}

export function toggleEarned(vault, name) {
  const at = vault.earned.indexOf(name);
  if (at === -1) vault.earned.push(name);
  else vault.earned.splice(at, 1);
  saveVault(vault);
  return vault;
}

export function setNote(vault, name, text) {
  const clean = String(text ?? '').trim();
  if (clean) vault.notes[name] = clean;
  else delete vault.notes[name];
  saveVault(vault);
  return vault;
}

export function getNote(vault, name) {
  return vault.notes[name] ?? '';
}

export function exportProgress(vault) {
  const blob = new Blob([JSON.stringify({ app: 'leonida-field-journal', earned: vault.earned, notes: vault.notes }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-field-journal-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function importProgress(vault, text, knownNames) {
  const parsed = JSON.parse(text);
  const known = new Set(knownNames);
  const earned = (Array.isArray(parsed.earned) ? parsed.earned : []).filter((n) => known.has(n));
  const notes = {};
  if (parsed.notes && typeof parsed.notes === 'object') {
    for (const [name, note] of Object.entries(parsed.notes)) {
      if (known.has(name) && typeof note === 'string' && note.trim()) notes[name] = note.trim();
    }
  }
  vault.earned = earned;
  vault.notes = notes;
  saveVault(vault);
  return vault;
}

export function resetVault(vault) {
  vault.earned = [];
  vault.notes = {};
  saveVault(vault);
  return vault;
}
