import test from 'node:test';
import assert from 'node:assert/strict';
import { createUmlRelation, updateUmlRelation, readUmlRelation, resolveUmlRelations, UML_RELATION_KINDS } from '../src/uml-relations.js';
import { createUmlNode } from '../src/uml-nodes.js';
import { translateElement } from '../src/geometry.js';
import { elementSvg } from '../src/render.js';
import { createDocument, validateDocument } from '../src/model.js';

const added = ['exclude','transition','flow','message-simple','message-timed','message-found','message-lost','message-create','message-delete','message-balking','message-timeout'];

test('les nouvelles relations sont créables, éditables et imprimables sans données suggérées', () => {
  for (const kind of added) {
    assert.ok(UML_RELATION_KINDS.includes(kind), kind);
    const group = createUmlRelation({ kind });
    const before = structuredClone(group);
    const updated = updateUmlRelation(group, { name: 'libellé libre' });
    assert.equal(updated.id, group.id);
    assert.equal(readUmlRelation(group).name, '');
    assert.equal(readUmlRelation(updated).name, 'libellé libre');
    assert.deepEqual(group, before);
    assert.match(elementSvg(updated), /libellé libre/);
    assert.ok(updated.children.some(c => c.role === 'uml-relation-line'));
    assert.ok(updated.children.every(c => c.role));
  }
});

test('points trouvé/perdu, horloge, interruption, destruction et création ont des notations distinctes', () => {
  const shapes = kind => createUmlRelation({ kind }).children.filter(c => c.role === 'uml-marker');
  const found = shapes('message-found').find(c => c.type === 'ellipse');
  const lost = shapes('message-lost').find(c => c.type === 'ellipse');
  assert.ok(found && lost);
  assert.ok(found.x < lost.x);
  assert.notEqual(found.fill, 'none');
  assert.ok(shapes('message-timed').some(c => c.type === 'ellipse' && c.fill === '#ffffff'));
  assert.ok(shapes('message-delete').filter(c => c.type === 'pen').length >= 2);
  assert.ok(shapes('message-balking').length >= 2);
  assert.ok(shapes('message-timeout').length >= 2);
  assert.equal(createUmlRelation({kind:'message-create'}).children.find(c=>c.role==='uml-relation-line').dash, '6 5');
  assert.match(elementSvg(createUmlRelation({kind:'exclude'})), /«exclude»/);
});

test('toutes les variantes de message suivent les lignes de vie sans modifier le document', () => {
  const source = createUmlNode('participant', { x: 40, y: 80, name: '' });
  const target = createUmlNode('participant', { x: 460, y: 80, name: '' });
  for (const kind of added.filter(k => k.startsWith('message-'))) {
    const message = createUmlRelation({kind, sourceId:source.id, targetId:target.id, name:'', offset:120});
    const page={elements:[source,target,message]}, before=structuredClone(page);
    const resolved=resolveUmlRelations(page).elements[2];
    assert.deepEqual(page,before);
    const line=resolved.children.find(c=>c.role==='uml-relation-line');
    assert.equal(line.x,source.x+source.width/2);
    assert.equal(line.x2,target.x+target.width/2);
    assert.equal(line.y,line.y2);
    const moved=resolveUmlRelations({elements:[source,translateElement(target,30,20),message]}).elements[2];
    const nextLine=moved.children.find(c=>c.role==='uml-relation-line');
    assert.equal(nextLine.x2,line.x2+30);
    assert.equal(moved.children[0].id,resolved.children[0].id);
  }
});

test('un message trouvé ou perdu suit son seul participant sans inventer une seconde référence', () => {
  for(const kind of ['message-found','message-lost']) {
    const participant=createUmlNode('participant',{x:320,y:80,name:''});
    const references=kind==='message-found'?{targetId:participant.id}:{sourceId:participant.id};
    const message=createUmlRelation({kind,...references,offset:120});
    const doc=createDocument();doc.pages[0].elements=[participant,message];
    const restored=validateDocument(JSON.parse(JSON.stringify(doc)));
    const page=restored.pages[0],before=structuredClone(page);
    const resolved=resolveUmlRelations(page).elements[1];
    assert.deepEqual(page,before);
    const line=resolved.children.find(c=>c.role==='uml-relation-line');
    assert.equal(Math.abs(line.x2-line.x),100);
    assert.equal(line.y,line.y2);
    assert.equal(kind==='message-found'?line.x2:line.x,participant.x+participant.width/2);
    const moved=resolveUmlRelations({elements:[translateElement(participant,20,40),message]}).elements[1];
    const nextLine=moved.children.find(c=>c.role==='uml-relation-line');
    assert.equal(nextLine.x,line.x+20);assert.equal(nextLine.y,line.y+40);
    assert.equal(nextLine.x2,line.x2+20);
    assert.equal(readUmlRelation(moved)[kind==='message-found'?'sourceId':'targetId'],null);
    assert.equal(readUmlRelation(moved)[kind==='message-found'?'targetId':'sourceId'],participant.id);
  }
});
