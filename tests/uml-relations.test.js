import { DEFAULT_STROKE } from '../src/stroke.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { UML_RELATION_KINDS, createUmlRelation, readUmlRelation, updateUmlRelation, resolveUmlRelations } from '../src/uml-relations.js';
import { createDocument, validateDocument, translateElement, removeElement } from '../src/model.js';
import { pageSvg, elementSvg } from '../src/render.js';

const node = (id, x, y, umlKind = 'class') => ({ id, type: 'group', label: 'Élément UML', umlKind, x, y, width: 220, height: umlKind === 'participant' ? 600 : 160, stroke: DEFAULT_STROKE, strokeWidth: 1, children: [
  { id: `${id}-frame`, type: 'rect', x, y, width: 220, height: 40, stroke: DEFAULT_STROKE, strokeWidth: 1, fill: '#ffffff', role: 'uml-frame' },
  { id: `${id}-name`, type: 'text', x: x + 12, y: y + 26, text: id, fontSize: 16, stroke: DEFAULT_STROKE, strokeWidth: 1, role: 'uml-name' },
] });

test('toutes les relations UML sont configurables et sérialisables', () => {
  for (const kind of UML_RELATION_KINDS) {
    const relation = createUmlRelation({kind,name:'relation',left:'1',right:'0..*'});
    const doc=createDocument(); doc.pages[0].elements=[relation];
    assert.deepEqual(validateDocument(JSON.parse(JSON.stringify(doc))),doc);
    assert.equal(readUmlRelation(relation).kind,kind);
    const changed=updateUmlRelation(relation,{name:'modifiée',x:300});
    assert.equal(changed.id,relation.id); assert.equal(changed.x,relation.x);
    assert.equal(changed.children[0].id,relation.children[0].id);
    assert.equal(readUmlRelation(changed).name,'modifiée');
  }
});

test('notations UML : diamants, triangles, pointillés et stéréotypes restent distincts', () => {
  const aggregation=createUmlRelation({kind:'aggregation'});
  const composition=createUmlRelation({kind:'composition'});
  assert.equal(aggregation.children.find(c=>c.role==='uml-marker').fill,'#ffffff');
  assert.equal(composition.children.find(c=>c.role==='uml-marker').fill,DEFAULT_STROKE);
  const generalization=createUmlRelation({kind:'generalization'});
  assert.equal(generalization.children.find(c=>c.role==='uml-marker').points.length,4);
  assert.equal(createUmlRelation({kind:'realization'}).children.find(c=>c.role==='uml-relation-line').dash,'6 5');
  assert.match(pageSvg({elements:[createUmlRelation({kind:'include',name:'authentifier'})]}),/«include»/);
});

test('les relations UML attachées suivent leurs éléments sans mutation', () => {
  const a=node('a',30,80),b=node('b',450,330),relation=createUmlRelation({sourceId:a.id,targetId:b.id,kind:'generalization'});
  const page={elements:[a,b,relation]}; const initial=JSON.stringify(page);
  const resolved=resolveUmlRelations(page).elements[2];
  const moved=resolveUmlRelations({...page,elements:[translateElement(a,0,80),b,relation]}).elements[2];
  assert.notDeepEqual(moved.children,resolved.children);
  assert.equal(JSON.stringify(page),initial);
  assert.deepEqual(resolveUmlRelations({elements:[a,relation]}).elements[1],relation);
});

test('séquence : messages horizontaux, retour pointillé et auto-message en U', () => {
  const a=node('a',40,70,'participant'),b=node('b',440,100,'participant');
  const sync=createUmlRelation({kind:'message-sync',sourceId:a.id,targetId:b.id,offset:160});
  const resolved=resolveUmlRelations({elements:[a,b,sync]}).elements[2];
  const line=resolved.children.find(c=>c.role==='uml-relation-line');
  assert.equal(line.y,line.y2); assert.equal(line.x,150); assert.equal(line.x2,550);
  assert.equal(resolved.children.find(c=>c.role==='uml-marker').fill,DEFAULT_STROKE);
  const self=createUmlRelation({kind:'message-self',sourceId:a.id,targetId:a.id});
  const selfResolved=resolveUmlRelations({elements:[a,self]}).elements[1];
  assert.equal(selfResolved.children.filter(c=>c.role==='uml-relation-line').length,3);
  assert.equal(createUmlRelation({kind:'message-return'}).children.find(c=>c.role==='uml-relation-line').dash,'6 5');
});

test('le rendu et la validation conservent seulement les styles UML autorisés', () => {
  const a=node('a',30,80);a.children[1].italic=true;a.children[1].underline=true;
  const relation=createUmlRelation({kind:'dependency',sourceId:'a',targetId:'b'});
  const doc=createDocument();doc.pages[0].elements=[a,node('b',430,330),relation];
  const clean=validateDocument(doc); const svg=pageSvg(clean.pages[0]);
  assert.match(svg,/stroke-dasharray="6 5"/); assert.match(svg,/font-style="italic"/);assert.match(svg,/text-decoration="underline"/);
  assert.doesNotMatch(elementSvg(relation),/class="group-hit"/);
  const bad=structuredClone(doc);bad.pages[0].elements[0].children[1].dash='url(evil)';assert.throws(()=>validateDocument(bad));
  const removed=removeElement(doc,doc.pages[0].id,'a');assert.equal(removed.pages[0].elements.length,1);
});
