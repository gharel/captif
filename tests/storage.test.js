import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY, loadCopy, saveCopy } from '../src/storage.js';
import { createDocument } from '../src/model.js';
import { createEntity, readEntity } from '../src/bdd.js';
import { emptyUml, editDiagramRows } from '../src/diagram-inline.js';
import { readUmlNode } from '../src/uml-nodes.js';
import { pageSvg } from '../src/render.js';

function storageFor(t, entries = []) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map(entries);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
  return { storage, values };
}

test('la première ouverture sans sauvegarde ne fabrique pas de copie restaurée', t => {
  storageFor(t);
  assert.deepEqual(loadCopy(), {});
});

test('un diagramme édité et ses coudes survivent à une sauvegarde et une reprise complètes', t => {
  storageFor(t);
  const table = createEntity({ name: 'account', attributes: [{ name: 'id', type: 'INT', key: 'PK', nullable: false }] });
  const cls = editDiagramRows(emptyUml('class'), 'add-operation');
  cls.children.find(c => c.role === 'uml-name').text = 'Account';
  cls.children.find(c => c.role === 'uml-operations').text = '+ save() : void';
  const connector = { id: 'wire', type: 'arrow', x: 330, y: 120, x2: 500, y2: 240,
    stroke: '#334155', strokeWidth: 1, routing: 'orthogonal', sourceId: table.id,
    targetId: cls.id, sourceAnchor: 'e', targetAnchor: 'w', waypoints: [{ x: 430, y: 200 }] };
  const doc = createDocument();
  doc.pages[0].elements = [table, cls, connector];
  const snapshot = structuredClone(doc);
  const savedAt = saveCopy(doc, null, ['Une note de recette']);
  const restored = loadCopy();
  assert.deepEqual(doc, snapshot);
  assert.equal(restored.savedAt, savedAt);
  assert.deepEqual(restored.notes, ['Une note de recette']);
  assert.deepEqual(readEntity(restored.document.pages[0].elements[0]), readEntity(table));
  assert.deepEqual(readUmlNode(restored.document.pages[0].elements[1]).operations, ['+ save() : void']);
  assert.deepEqual(restored.document.pages[0].elements[2].waypoints, connector.waypoints);
  assert.equal(restored.document.pages[0].elements[2].sourceId, table.id);
  const print = pageSvg(restored.document.pages[0]);
  assert.match(print, /save\(\) : void/);
  assert.doesNotMatch(print, /diagram-placeholder|data-resize|data-bend-index|connection-anchor/);
});

test('une sauvegarde JSON illisible ou invalide reste intacte et produit une erreur explicite', t => {
  const { values } = storageFor(t);
  for (const raw of ['{invalide', JSON.stringify({ document: { version: 999 }, session: null })]) {
    values.set(KEY, raw);
    const result = loadCopy();
    assert.equal(result.document, undefined);
    assert.match(result.error, /conservée/);
    assert.equal(values.get(KEY), raw);
  }
});

test('un stockage refusé signale une erreur et conserve la dernière sauvegarde', t => {
  const { storage, values } = storageFor(t, [[KEY, 'copie précédente']]);
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => saveCopy(createDocument(), null), /QuotaExceededError/);
  assert.equal(values.get(KEY), 'copie précédente');
  storage.getItem = () => { throw new Error('SecurityError'); };
  assert.match(loadCopy().error, /indisponible/);
});

test('la reprise borne les notes et rejette les valeurs non textuelles', t => {
  const notes = [null, { invalid: true }, ...Array.from({ length: 1005 }, (_, i) => `note-${i}`)];
  storageFor(t, [[KEY, JSON.stringify({ document: createDocument(), session: null, notes })]]);
  const restored = loadCopy();
  assert.equal(restored.notes.length, 1000);
  assert.equal(restored.notes[0], 'note-5');
  assert.equal(restored.notes.at(-1), 'note-1004');
});
