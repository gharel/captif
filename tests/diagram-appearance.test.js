import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntity, readEntity, updateEntity } from '../src/bdd.js';
import { createUmlNode, readUmlNode, updateUmlNode } from '../src/uml-nodes.js';
import { createDocument, validateDocument } from '../src/model.js';
import { pageSvg } from '../src/render.js';
import { elementBounds } from '../src/geometry.js';

test('diagrammes : deux composants vides tiennent côte à côte sur une feuille A4', () => {
  const entity = createEntity({ name: '', attributes: [{ name: '', type: '', key: '', nullable: false }] });
  const cls = createUmlNode('class', { name: '', attributes: [], operations: [] });
  assert.ok(entity.width >= 260 && entity.width <= 280);
  assert.ok(cls.width >= 240 && cls.width <= 260);
  assert.ok(entity.width + cls.width + 48 + 48 <= 794);
  assert.ok(entity.height <= 110);
  assert.ok(cls.height <= 140);
});

test('BDD : les lignes restent éditables sans quadrillage ni intitulés de colonnes', () => {
  const attributes = [
    { name: 'id', type: 'BIGINT(20)', key: 'PK', nullable: false },
    { name: 'email', type: 'VARCHAR(120)', key: '', nullable: true },
    { name: 'createdAt', type: 'DATETIME', key: '', nullable: false },
  ];
  const entity = createEntity({ name: 'user', attributes });
  assert.equal(entity.children.filter(child => child.role === 'separator').length, 1);
  assert.equal(entity.children.filter(child => child.role === 'column-label').length, 0);
  assert.equal(entity.children.find(child => child.role === 'entity-name').bold, true);
  const edited = updateEntity(entity, { name: 'account' });
  const doc = createDocument();
  doc.pages[0].elements = [edited];
  const clean = validateDocument(JSON.parse(JSON.stringify(doc))).pages[0].elements[0];
  assert.deepEqual(readEntity(clean), { name: 'account', attributes });
  assert.equal(edited.children.find(child => child.role === 'attribute-name').id, entity.children.find(child => child.role === 'attribute-name').id);
});

test('UML : les compartiments et notations survivent à la sauvegarde avec une typographie de diagramme', () => {
  const cls = createUmlNode('class', { name: 'Account', attributes: ['- id : Integer'], operations: ['+ save() : void'] });
  const object = createUmlNode('object', { name: 'current', className: 'Account', attributes: ['id = 1'] });
  assert.equal(cls.children.find(child => child.role === 'uml-name').bold, true);
  assert.equal(cls.children.filter(child => child.type === 'line').length, 2);
  assert.equal(object.children.find(child => child.role === 'uml-name').underline, true);
  assert.deepEqual(readUmlNode(updateUmlNode(cls, { name: 'Customer' })).operations, ['+ save() : void']);
  const doc = createDocument();
  doc.pages[0].elements = [cls, object];
  const clean = validateDocument(JSON.parse(JSON.stringify(doc)));
  const print = pageSvg(clean.pages[0]);
  assert.doesNotMatch(print, /font-family="[^"]*monospace/);
  assert.match(print, /font-weight="700"/);
  assert.match(print, /text-decoration="underline"/);
  assert.doesNotMatch(print, /diagram-inline-actions|diagram-placeholder/);
});

test('les petites annotations de diagramme sont sauvegardables sans autoriser un texte libre trop petit', () => {
  const doc = createDocument();
  const entity = createEntity();
  const key = entity.children.find(c => c.role === 'attribute-key');
  key.fontSize = 8;
  doc.pages[0].elements = [entity];
  assert.equal(validateDocument(doc).pages[0].elements[0].children.find(c => c.id === key.id).fontSize, 8);
  key.fontSize = 7;
  assert.throws(() => validateDocument(doc), /Copie invalide/);
  doc.pages[0].elements = [{ ...key, fontSize: 8 }];
  assert.throws(() => validateDocument(doc), /Copie invalide/);
  key.fontSize = 8;
  key.role = 'role-inconnu';
  doc.pages[0].elements = [entity];
  assert.throws(() => validateDocument(doc), /Copie invalide/);
});

test('les noms BDD et UML importés restent du texte échappé dans le rendu imprimable', () => {
  const injected = '<script>alert(1)</script>';
  const table = createEntity({ name: injected, attributes: [{ name: '<img onerror=x>', type: 'A&B', key: '', nullable: false }] });
  const cls = createUmlNode('class', { name: injected, attributes: ['<svg onload=x>'], operations: ['a < b && c > d'] });
  const doc = createDocument();
  doc.pages[0].elements = [table, cls];
  const restored = validateDocument(JSON.parse(JSON.stringify(doc)));
  const svg = pageSvg(restored.pages[0]);
  assert.doesNotMatch(svg, /<script|<img|<svg onload/);
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(svg, /A&amp;B/);
  assert.equal(readEntity(restored.pages[0].elements[0]).name, injected);
});

test('une table de douze attributs longs conserve toutes ses cellules dans son cadre A4', () => {
  const entity = createEntity({ x: 700, y: 1050, name: 'N'.repeat(40), attributes: Array.from({ length: 12 }, (_, i) => ({
    name: `${i}`.padEnd(40, 'a'), type: 'T'.repeat(30), key: 'PK,FK', nullable: i % 2 === 0,
  })) });
  assert.equal(entity.children.filter(c => c.role === 'attribute-name').length, 12);
  for (const cell of entity.children.filter(c => c.type === 'text')) {
    const b = elementBounds(cell);
    assert.ok(b.x >= entity.x && b.x + b.width <= entity.x + entity.width, cell.role);
    assert.ok(b.y >= entity.y && b.y + b.height <= entity.y + entity.height, cell.role);
  }
  const doc = createDocument();
  doc.pages[0].elements = [entity];
  assert.equal(readEntity(validateDocument(doc).pages[0].elements[0]).attributes.length, 12);
});

test('le thème modernise un ancien en-tête uniquement au rendu sans réécrire sa géométrie', () => {
  const entity = createEntity({ name: 'Ancienne table' });
  entity.children.find(c => c.role === 'header').fill = '#eef0ff';
  const page = { elements: [entity] };
  const before = structuredClone(page);
  const svg = pageSvg(page);
  assert.match(svg, /<linearGradient/);
  assert.doesNotMatch(svg, /fill="#eef0ff"/);
  assert.deepEqual(page, before);
});
