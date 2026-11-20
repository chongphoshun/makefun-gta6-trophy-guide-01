// filters.js — the journal's index tabs: one search box, one kind, one grade, a
// spoiler veil and a remaining-only switch, all combined into a single predicate.
export const KIND_LABELS = {
  all: 'All kinds',
  story: 'Story',
  side: 'Side & strangers',
  collectible: 'Collectibles',
  activity: 'Activities',
  exploration: 'Exploration',
  combat: 'Combat',
  money: 'Money',
  misc: 'Moments',
  completion: 'Platinum path',
};

export const KIND_ORDER = ['story', 'side', 'collectible', 'activity', 'exploration', 'combat', 'money', 'misc', 'completion'];

export function emptyFilterState() {
  return { q: '', kind: 'all', grade: 'all', spoiler: true, remaining: false };
}

export function matchesFilters(trophy, state, earned) {
  if (state.kind !== 'all' && trophy.kind !== state.kind) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.remaining && earned) return false;
  if (state.q) {
    const needle = state.q.trim().toLowerCase();
    const hay = [trophy.name, trophy.desc, trophy.guide, trophy.target ?? '', trophy.kind].join(' ').toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

// A trophy's name and description stay veiled while the spoiler switch is on, the
// trophy is hidden on PSN, and the reader has not earned it yet.
export function isVeiled(trophy, state, earned) {
  return state.spoiler && trophy.hidden && !earned;
}
