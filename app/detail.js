// detail.js — the guide pane that opens inside a trophy card: the guide in our own
// words, its steps, its target, the two cited sources as links, and a notes field.
// It renders nothing from the network; the source links only open if the reader
// follows them.
import { getNote, setNote } from './vault.js';

export function buildGuidePane(trophy, vault, onNoteSaved) {
  const pane = document.createElement('div');
  pane.className = 'trophy-guide';

  const guide = document.createElement('p');
  guide.textContent = trophy.guide;
  pane.append(guide);

  if (trophy.target) {
    const target = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = 'Target: ';
    target.append(label, document.createTextNode(trophy.target));
    pane.append(target);
  }

  const stepsTitle = document.createElement('h3');
  stepsTitle.textContent = trophy.unconfirmed ? 'What we know (unconfirmed)' : 'Steps';
  pane.append(stepsTitle);
  const steps = document.createElement('ol');
  for (const step of trophy.steps ?? []) {
    const li = document.createElement('li');
    li.textContent = step;
    steps.append(li);
  }
  pane.append(steps);

  const sourcesTitle = document.createElement('h3');
  sourcesTitle.textContent = 'Sources';
  pane.append(sourcesTitle);
  const sources = document.createElement('p');
  sources.className = 'sources';
  sources.append(document.createTextNode('Guide facts checked against: '));
  (trophy.sources ?? []).forEach((source, i) => {
    if (i > 0) sources.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = source.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = source.name;
    sources.append(a);
  });
  sources.append(document.createTextNode('. Official name, description and grade: PlayStation list via Exophase / PSNProfiles.'));
  pane.append(sources);

  const noteRow = document.createElement('div');
  noteRow.className = 'note-row';
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.placeholder = 'Your note — e.g. “left off at 6 of 18 meditation spots”';
  noteInput.value = getNote(vault, trophy.name);
  noteInput.setAttribute('aria-label', `Note for ${trophy.name}`);
  const noteBtn = document.createElement('button');
  noteBtn.type = 'button';
  noteBtn.textContent = 'Save note';
  noteBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    setNote(vault, trophy.name, noteInput.value);
    noteBtn.textContent = 'Saved ✓';
    setTimeout(() => { noteBtn.textContent = 'Save note'; }, 1200);
    if (onNoteSaved) onNoteSaved();
  });
  noteRow.append(noteInput, noteBtn);
  pane.append(noteRow);

  return pane;
}
