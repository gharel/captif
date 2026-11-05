/**
 * Sujet PDF déposé par l'enseignant : un seul emplacement, sans historique.
 * Le PDF reste dans ce navigateur (IndexedDB) ; la copie ne garde qu'une référence.
 */
export const MAX_SUBJECT_BYTES = 20_000_000;
export const MAX_SUBJECT_PAGES = 500;
export const SUBJECT_CHANNEL = 'captif-subject';
const DB_NAME = 'captif-subject-v1';
const STORE = 'subject';
const KEY = 'current';
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

const invalid = () => { throw new Error('Sujet illisible : enregistrement incorrect.'); };

export function cleanSubjectName(name) {
  const base = String(name ?? '').split(/[\\/]/).pop()
    .replace(/[\p{Cc}\p{Cf}]/gu, '').trim();
  if (!base) return 'sujet.pdf';
  if (base.length <= 200) return base;
  const extension = /\.pdf$/i.exec(base)?.[0] ?? '';
  return base.slice(0, 200 - extension.length) + extension;
}

const hasPdfHeader = bytes => PDF_HEADER.every((value, index) => bytes[index] === value);

async function sha256Hex(buffer) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérifie le fichier et prépare l'enregistrement. `countPages` ouvre réellement le PDF
 * (pdf.js dans le navigateur) : un fichier qu'il ne lit pas est refusé.
 */
export async function prepareSubject({ name, bytes, size }, { countPages, now = Date.now } = {}) {
  if ((size ?? bytes.byteLength) > MAX_SUBJECT_BYTES || bytes.byteLength > MAX_SUBJECT_BYTES) throw new Error('Fichier trop volumineux (20 Mo maximum).');
  if (!bytes.byteLength) throw new Error('Le fichier est vide.');
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!hasPdfHeader(view)) throw new Error('Ce fichier n’est pas un PDF.');
  const buffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  let pages;
  try { pages = await countPages(buffer.slice(0)); } catch { pages = 0; }
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_SUBJECT_PAGES) throw new Error('PDF illisible ou trop long (500 pages maximum).');
  return validateSubjectRecord({ name: cleanSubjectName(name), size: buffer.byteLength, sha256: await sha256Hex(buffer), pages, addedAt: now(), bytes: buffer });
}

/** Reconstruit un enregistrement par liste blanche ; lève une erreur s'il est incohérent. */
export function validateSubjectRecord(value) {
  if (!value || typeof value !== 'object') invalid();
  const { name, size, sha256, pages, addedAt, bytes } = value;
  if (typeof name !== 'string' || !name || name.length > 200 || cleanSubjectName(name) !== name) invalid();
  if (!Number.isInteger(size) || size < 1 || size > MAX_SUBJECT_BYTES) invalid();
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) invalid();
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_SUBJECT_PAGES) invalid();
  if (!Number.isFinite(addedAt)) invalid();
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== size || !hasPdfHeader(new Uint8Array(bytes, 0, Math.min(5, size)))) invalid();
  return { name, size, sha256, pages, addedAt, bytes };
}

export const subjectReference = ({ name, sha256, pages }) => ({ name, sha256, pages });

/** Emplacement unique au-dessus d'un adaptateur clé/valeur asynchrone. */
export function createSubjectStore(backend = indexedDbBackend()) {
  return {
    async read() {
      let value;
      try { value = await backend.get(KEY); } catch { return { error: 'Sujet indisponible sur ce navigateur.' }; }
      if (value == null) return {};
      try { return { subject: validateSubjectRecord(value) }; } catch (error) { return { error: error.message }; }
    },
    async replace(record) { await backend.put(KEY, validateSubjectRecord(record)); },
    async remove() { await backend.delete(KEY); },
  };
}

export function indexedDbBackend(factory = globalThis.indexedDB) {
  let opening = null;
  const open = () => opening ??= new Promise((resolve, reject) => {
    if (!factory) { reject(new Error('IndexedDB indisponible')); return; }
    const request = factory.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, action) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  };
  return {
    get: key => run('readonly', store => store.get(key)),
    put: (key, value) => run('readwrite', store => store.put(value, key)),
    delete: key => run('readwrite', store => store.delete(key)),
  };
}

/** Prévient les autres onglets (la copie) qu'un sujet a été déposé ou retiré. */
export function announceSubjectChange() {
  try { const channel = new BroadcastChannel(SUBJECT_CHANNEL); channel.postMessage('changed'); channel.close(); } catch { /* Rechargement nécessaire. */ }
}
