import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, validateDocument } from '../src/model.js';

test('les anciens gabarits connus sont repris comme groupes sans perdre leurs composants', () => {
  const doc = createDocument();
  const frame = { id: 'old-frame', type: 'rect', x: 70, y: 100, width: 300, height: 225, stroke: '#263833', strokeWidth: 2 };
  const text = { id: 'old-text', type: 'text', x: 86, y: 130, fontSize: 16, stroke: '#263833', strokeWidth: 2, text: 'Client\n────────────────\n- id : int\n+ enregistrer() : void' };
  doc.pages[0].elements = [frame, text];
  const migrated = validateDocument(doc);
  assert.equal(migrated.pages[0].elements.length, 1);
  assert.equal(migrated.pages[0].elements[0].type, 'group');
  assert.equal(migrated.pages[0].elements[0].label, 'Classe UML');
  assert.deepEqual(migrated.pages[0].elements[0].children, [frame, text]);
  assert.deepEqual(validateDocument(migrated), migrated);
  assert.equal(doc.pages[0].elements.length, 2);
});

test('une forme et un texte ordinaires ne sont pas associés arbitrairement', () => {
  const doc = createDocument();
  doc.pages[0].elements = [
    { id: 'frame', type: 'rect', x: 70, y: 100, width: 300, height: 225, stroke: '#263833', strokeWidth: 2 },
    { id: 'note', type: 'text', x: 86, y: 130, fontSize: 16, stroke: '#263833', strokeWidth: 2, text: 'Un texte libre' },
  ];
  assert.equal(validateDocument(doc).pages[0].elements.length, 2);
});
