import test from 'node:test';
import assert from 'node:assert/strict';
import { UML_NODE_KINDS, createUmlNode, readUmlNode, updateUmlNode, isUmlNode } from '../src/uml-nodes.js';
import { elementBounds, translateElement } from '../src/geometry.js';

test('UML : les douze composants sont groupés et restent dans les limites utiles A4', () => {
  assert.equal(UML_NODE_KINDS.length, 12);
  for (const kind of UML_NODE_KINDS) {
    const node = createUmlNode(kind, { x: 740, y: 1080 });
    assert.equal(node.type, 'group');
    assert.equal(node.label, 'Élément UML');
    assert.equal(node.umlKind, kind);
    assert.ok(isUmlNode(node));
    assert.ok(node.children.length > 0);
    assert.ok(node.children.every(child => child.type !== 'group'));
    const bounds = elementBounds(node);
    assert.ok(bounds.x >= 24, kind);
    assert.ok(bounds.y >= 24, kind);
    assert.ok(bounds.x + bounds.width <= 770.01, kind);
    assert.ok(bounds.y + bounds.height <= 1099.01, kind);
  }
});

test('UML : classes, interfaces et objets possèdent des notations distinctes', () => {
  const cls = createUmlNode('class', { name: 'Client', attributes: ['- id : int'], operations: ['+ enregistrer() : void'] });
  assert.equal(cls.children.filter(c => c.type === 'line').length, 2);
  assert.deepEqual(readUmlNode(cls).attributes, ['- id : int']);
  assert.deepEqual(readUmlNode(cls).operations, ['+ enregistrer() : void']);
  assert.equal(createUmlNode('abstract-class').children.find(c => c.role === 'uml-name').italic, true);
  assert.match(createUmlNode('interface').children.find(c => c.role === 'uml-stereotype').text, /interface/);
  const object = createUmlNode('object', { name: 'client1', className: 'Client', attributes: ['id = 1', 'nom = "Nom"'] });
  assert.equal(object.children.find(c => c.role === 'uml-name').underline, true);
  assert.equal(readUmlNode(object).className, 'Client');
  assert.equal(readUmlNode(object).name, 'client1');
});

test('UML : participant, acteur et fragment possèdent les primitives attendues', () => {
  const participant = createUmlNode('participant', { name: 'Service', height: 500 });
  assert.equal(participant.children.find(c => c.type === 'line').dash, '6 5');
  assert.equal(readUmlNode(participant).height, 500);
  assert.ok(createUmlNode('actor').children.some(c => c.type === 'ellipse'));
  const fragment = createUmlNode('fragment', { fragmentKind: 'loop', condition: 'pour chaque élément' });
  assert.equal(readUmlNode(fragment).fragmentKind, 'loop');
  assert.equal(readUmlNode(fragment).condition, 'pour chaque élément');
  assert.equal(fragment.children.find(c => c.role === 'uml-frame').fill, 'none');
  assert.equal(createUmlNode('system').children.find(c => c.role === 'uml-frame').fill, 'none');
});

test('UML : les données sont relues après édition et les identifiants restent stables après configuration', () => {
  const source = createUmlNode('class', { name: 'Client', attributes: ['- id : int'] });
  const clone = structuredClone(source);
  clone.children.find(c => c.role === 'uml-name').text = 'Compte';
  assert.equal(readUmlNode(clone).name, 'Compte');
  const next = updateUmlNode(clone, { name: 'Commande', attributes: ['- id : int', '- date : Date'] });
  assert.equal(next.id, source.id);
  assert.equal(next.x, source.x);
  assert.equal(next.y, source.y);
  for (const role of ['uml-name', 'uml-attributes', 'uml-operations']) assert.equal(next.children.find(c => c.role === role).id, source.children.find(c => c.role === role).id);
  assert.equal(source.children.find(c => c.role === 'uml-name').text, 'Client');
  const moved = translateElement(next, 10, 20);
  assert.equal(moved.children.find(c => c.role === 'uml-name').x, next.children.find(c => c.role === 'uml-name').x + 10);
});

test('UML : limites et types invalides sont refusés', () => {
  assert.throws(() => createUmlNode('unknown'));
  assert.throws(() => createUmlNode('class', { name: 'A'.repeat(51) }));
  assert.throws(() => createUmlNode('class', { attributes: Array(11).fill('a') }));
  assert.throws(() => createUmlNode('class', { attributes: ['a'.repeat(81)] }));
  assert.throws(() => createUmlNode('participant', { height: 2000 }));
  assert.throws(() => createUmlNode('fragment', { fragmentKind: 'unknown' }));
});

test('UML : le gabarit de classe historique reste configurable', () => {
  const legacy = { id: 'legacy', type: 'group', label: 'Classe UML', x: 60, y: 90, width: 300, height: 225, stroke: '#263833', strokeWidth: 2, children: [{ id: 'legacy-text', type: 'text', x: 76, y: 120, text: 'Client\n────────────────\n- id : int\n- nom : String\n────────────────\n+ enregistrer() : void', fontSize: 16 }] };
  assert.equal(readUmlNode(legacy).kind, 'class');
  assert.deepEqual(readUmlNode(legacy).attributes, ['- id : int', '- nom : String']);
  assert.deepEqual(readUmlNode(legacy).operations, ['+ enregistrer() : void']);
  const upgraded = updateUmlNode(legacy, { name: 'Compte' });
  assert.equal(upgraded.id, legacy.id);
  assert.equal(upgraded.umlKind, 'class');
});
