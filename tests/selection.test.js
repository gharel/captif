import test from 'node:test';
import assert from 'node:assert/strict';
import { enclosedElements, duplicateSelection, moveSelection } from '../src/selection.js';
import { pageSvg } from '../src/render.js';
import { createUmlNode } from '../src/uml-nodes.js';
import { createUmlRelation } from '../src/uml-relations.js';
import { createDocument,validateDocument,addElement,createHistory,commit,undo } from '../src/model.js';
const a={id:'a',type:'rect',x:100,y:100,width:80,height:60,stroke:'#334155',strokeWidth:2};
const b={...a,id:'b',x:240};
test('le cadre sélectionne les objets entièrement contenus dans toutes les directions',()=>{
  assert.deepEqual(enclosedElements([a,b],{x:330,y:180},{x:90,y:90}),['a','b']);
  assert.deepEqual(enclosedElements([a,b],{x:90,y:90},{x:250,y:180}),['a']);
});
test('un déplacement commun garde les distances et borne tout le lot à la feuille',()=>{
  const moved=moveSelection([a,b],1000,1000);assert.equal(moved[1].x-moved[0].x,140);
  assert.equal(moved[1].x+moved[1].width,770);assert.equal(a.x,100);
});
test('dupliquer un ensemble renouvelle tous les identifiants et reconnecte ses liens internes',()=>{
  const group={...a,id:'group',type:'group',children:[{...a,id:'child'}]};
  const link={...a,id:'link',sourceId:'group',targetId:'b'};
  const copies=duplicateSelection([group,b],[group,b,link]);
  assert.equal(copies.length,3);assert.notEqual(copies[0].id,group.id);assert.notEqual(copies[0].children[0].id,'child');
  assert.equal(copies[2].sourceId,copies[0].id);assert.equal(copies[2].targetId,copies[1].id);assert.equal(link.sourceId,'group');
});
test('les liens attachés se déplacent via leurs extrémités, pas par translation indépendante',()=>{
  const link={...a,id:'link',sourceId:'a',targetId:'b'};
  const moved=moveSelection([a,b,link],30,40);assert.equal(moved[0].x,130);assert.equal(moved[2].x,100);
  assert.deepEqual(moveSelection([link],30,40),[link]);
});

test('l’aperçu multiple affiche tous les contours sans modifier la page ni imprimer la sélection',()=>{
  const page={elements:[a,b]},before=structuredClone(page);
  const svg=pageSvg(page,{selected:'b',selectedIds:['a','b'],drafts:moveSelection([a,b],20,30)});
  assert.equal((svg.match(/class="selection-outline"/g)||[]).length,2);assert.match(svg,/multi-selection-outline/);
  assert.doesNotMatch(svg,/data-resize/);assert.deepEqual(page,before);
  assert.doesNotMatch(pageSvg(page),/selection-outline/);
});

test('un lot UML dupliqué reste valide, reconnecté et s’annule en une action',()=>{
  const source=createUmlNode('class',{name:'Source',x:30,y:60}),target=createUmlNode('class',{name:'Cible',x:400,y:350});
  const link=createUmlRelation({kind:'association',sourceId:source.id,targetId:target.id});
  const doc=createDocument();doc.pages[0].elements=[source,target,link];
  const copies=moveSelection(duplicateSelection([source,target],doc.pages[0].elements),10,20);
  let next=doc;for(const copy of copies)next=addElement(next,doc.pages[0].id,copy);
  const restored=validateDocument(JSON.parse(JSON.stringify(next)));
  assert.equal(restored.pages[0].elements.length,6);
  assert.equal(copies[2].sourceId,copies[0].id);assert.equal(copies[2].targetId,copies[1].id);
  assert.equal(undo(commit(createHistory(doc),next)).present.pages[0].elements.length,3);
});
