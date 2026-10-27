import { validateDocument } from './model.js';
import { validateSession } from './monitor.js';
export const KEY = 'captif-copy-v1';

export function loadCopy() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const value = JSON.parse(raw);
    const notes = Array.isArray(value.notes) ? value.notes.filter(n => typeof n === 'string').slice(-1000) : [];
    return { document: validateDocument(value.document), session: validateSession(value.session), savedAt: value.savedAt, notes };
  } catch {
    return { error: 'La sauvegarde locale est illisible ou indisponible. Elle a été conservée ; exportez votre travail avant de fermer.' };
  }
}

export function saveCopy(document, session, notes = []) {
  const savedAt = Date.now();
  localStorage.setItem(KEY, JSON.stringify({ document, session, savedAt, notes }));
  return savedAt;
}

export function downloadJson(document, session, notes = []) {
  const blob = new Blob([JSON.stringify({ document, session, notes }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = documentNode('a');
  a.href = url;
  const name = document.student.name.trim().replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 70);
  a.download = `captif-${name || 'copie'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function documentNode(tag) { return globalThis.document.createElement(tag); }
