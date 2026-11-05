import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  MAX_SUBJECT_BYTES, cleanSubjectName, prepareSubject, validateSubjectRecord,
  subjectReference, createSubjectStore,
} from '../src/subject.js';
import { createDocument, validateDocument } from '../src/model.js';
import { printDocument } from '../src/print.js';

const pdfBytes = (text = 'contenu') => new TextEncoder().encode(`%PDF-1.7\n${text}\n%%EOF`);
const countPages = async () => 3;

function memoryBackend() {
  const values = new Map();
  return {
    values,
    get: async key => values.get(key),
    put: async (key, value) => { values.set(key, value); },
    delete: async key => { values.delete(key); },
  };
}

test('le nom du sujet est nettoyé : chemin, caractères de contrôle, longueur et extension', () => {
  assert.equal(cleanSubjectName('C:\\fakepath\\Sujet BDD.pdf'), 'Sujet BDD.pdf');
  assert.equal(cleanSubjectName('dossier/sous/examen.PDF'), 'examen.PDF');
  assert.equal(cleanSubjectName('a\u0000b\u202ec.pdf'), 'abc.pdf');
  assert.equal(cleanSubjectName('   '), 'sujet.pdf');
  assert.equal(cleanSubjectName('x'.repeat(400) + '.pdf').length, 200);
  assert.ok(cleanSubjectName('x'.repeat(400) + '.pdf').endsWith('.pdf'));
});

test('un PDF valide devient un enregistrement avec empreinte SHA-256, pages et date injectée', async () => {
  const bytes = pdfBytes();
  const record = await prepareSubject({ name: 'sujet.pdf', bytes }, { countPages, now: () => 1234 });
  assert.equal(record.name, 'sujet.pdf');
  assert.equal(record.size, bytes.byteLength);
  assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(record.pages, 3);
  assert.equal(record.addedAt, 1234);
  assert.ok(record.bytes instanceof ArrayBuffer);
  assert.deepEqual(new Uint8Array(record.bytes), bytes);
  assert.deepEqual(subjectReference(record), { name: 'sujet.pdf', sha256: record.sha256, pages: 3 });
});

test('fichier vide, non PDF, trop lourd ou illisible : refus explicite', async () => {
  await assert.rejects(prepareSubject({ name: 'vide.pdf', bytes: new Uint8Array() }, { countPages }), /vide/);
  await assert.rejects(prepareSubject({ name: 'image.pdf', bytes: new TextEncoder().encode('GIF89a') }, { countPages }), /PDF/);
  await assert.rejects(prepareSubject({ name: 'gros.pdf', bytes: pdfBytes(), size: MAX_SUBJECT_BYTES + 1 }, { countPages }), /20 Mo/);
  await assert.rejects(prepareSubject({ name: 'casse.pdf', bytes: pdfBytes() }, { countPages: async () => { throw new Error('bad'); } }), /illisible/);
  await assert.rejects(prepareSubject({ name: 'zero.pdf', bytes: pdfBytes() }, { countPages: async () => 0 }), /illisible/);
});

test('le magasin ne garde qu’un seul sujet : remplacer efface l’ancien, retirer vide l’emplacement', async () => {
  const backend = memoryBackend();
  const store = createSubjectStore(backend);
  assert.deepEqual(await store.read(), {});
  const first = await prepareSubject({ name: 'v1.pdf', bytes: pdfBytes('un') }, { countPages, now: () => 1 });
  const second = await prepareSubject({ name: 'v2.pdf', bytes: pdfBytes('deux') }, { countPages, now: () => 2 });
  await store.replace(first);
  await store.replace(second);
  assert.equal(backend.values.size, 1);
  assert.equal((await store.read()).subject.name, 'v2.pdf');
  await store.remove();
  assert.deepEqual(await store.read(), {});
});

test('un dépôt refusé ne touche pas le sujet existant', async () => {
  const backend = memoryBackend();
  const store = createSubjectStore(backend);
  const kept = await prepareSubject({ name: 'garde.pdf', bytes: pdfBytes() }, { countPages, now: () => 1 });
  await store.replace(kept);
  await assert.rejects(store.replace({ ...kept, sha256: 'pas-une-empreinte' }));
  await assert.rejects(store.replace({ ...kept, bytes: new TextEncoder().encode('GIF89a').buffer, size: 6 }));
  assert.equal((await store.read()).subject.name, 'garde.pdf');
});

test('un enregistrement relu invalide est signalé sans être effacé', async () => {
  const backend = memoryBackend();
  backend.values.set('current', { name: 'x.pdf', size: 3, bytes: 'abc' });
  const store = createSubjectStore(backend);
  const result = await store.read();
  assert.match(result.error, /illisible/);
  assert.equal(result.subject, undefined);
  assert.equal(backend.values.size, 1);
  const failing = createSubjectStore({ get: async () => { throw new Error('quota'); } });
  assert.match((await failing.read()).error, /indisponible/);
});

test('validateSubjectRecord reconstruit par liste blanche', async () => {
  const record = await prepareSubject({ name: 'a.pdf', bytes: pdfBytes() }, { countPages, now: () => 9 });
  const clean = validateSubjectRecord({ ...record, extra: '<script>' });
  assert.equal(clean.extra, undefined);
  assert.throws(() => validateSubjectRecord({ ...record, pages: 0 }));
  assert.throws(() => validateSubjectRecord({ ...record, size: record.size + 1 }));
  assert.throws(() => validateSubjectRecord({ ...record, addedAt: Number.NaN }));
});

test('la copie conserve une référence de sujet validée, compatible avec les anciennes copies', () => {
  const base = createDocument();
  const subject = { name: 'Sujet <BDD>.pdf', sha256: 'a'.repeat(64), pages: 4 };
  const withSubject = Object.freeze({ ...base, subject: Object.freeze({ ...subject, bytes: 'ignoré' }) });
  const clean = validateDocument(JSON.parse(JSON.stringify(withSubject)));
  assert.deepEqual(clean.subject, subject);
  assert.equal(withSubject.subject.bytes, 'ignoré');
  assert.equal(validateDocument(JSON.parse(JSON.stringify(base))).subject, undefined);
  for (const bad of [{ ...subject, sha256: 'z'.repeat(64) }, { ...subject, pages: 0 }, { ...subject, pages: 501 }, { ...subject, name: 'x'.repeat(201) }, 'texte']) {
    assert.throws(() => validateDocument({ ...base, subject: bad }), /Copie invalide/);
  }
});

test('le bilan imprimé mentionne le sujet échappé, jamais son contenu', () => {
  const doc = { ...createDocument(), student: { name: 'Camille' }, exam: 'BDD', subject: { name: 'Sujet <BDD>.pdf', sha256: 'abcdef0123'.padEnd(64, '0'), pages: 4 } };
  const html = printDocument(doc, { absenceCount: 0, totalAwayMs: 0, startedAt: 0, endedAt: 1000 }, '');
  assert.match(html, /Sujet : Sujet &lt;BDD&gt;\.pdf · 4 pages · empreinte abcdef0123/);
  const without = printDocument(createDocument(), { absenceCount: 0, totalAwayMs: 0, startedAt: null, endedAt: null }, '');
  assert.doesNotMatch(without, /Sujet :/);
});
