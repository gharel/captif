import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, validateDocument } from '../src/model.js';
import { createUmlRelation, resolveUmlRelations } from '../src/uml-relations.js';
import { elementSvg } from '../src/render.js';
import { createUmlNode, updateUmlNode } from '../src/uml-nodes.js';
import { translateElement } from '../src/geometry.js';

test('les styles plein, tirets, pointillés et mixtes traversent la sauvegarde et le rendu',()=>{
  for(const dash of ['solid','8 5','1 5','8 4 1 4']){
    const doc=createDocument();doc.pages[0].elements=[{id:'line',type:'line',x:40,y:50,x2:300,y2:50,stroke:'#635bff',strokeWidth:4,dash}];
    const clean=validateDocument(doc).pages[0].elements[0];assert.equal(clean.dash,dash);
    const svg=elementSvg(clean);if(dash==='solid')assert.doesNotMatch(svg,/stroke-dasharray/);else assert.ok(svg.includes(`stroke-dasharray="${{'8 5':'16 10','1 5':'2 10','8 4 1 4':'16 8 2 8'}[dash]}"`));
  }
});
test('le style choisi sur une relation UML reste présent après résolution des ancrages',()=>{
  const a=createUmlNode('class',{x:30,y:60}),b=createUmlNode('class',{x:400,y:350});
  const relation={...createUmlRelation({kind:'dependency',sourceId:a.id,targetId:b.id}),dash:'1 5'};
  assert.equal(resolveUmlRelations({elements:[a,b,relation]}).elements[2].children.find(c=>c.role==='uml-relation-line').dash,'1 5');
});
test('les activations attachées suivent leur participant',()=>{
  const participant=createUmlNode('participant',{x:60,y:80});
  const mark={...createUmlNode('activation'),sourceId:participant.id,offset:160};
  const first=resolveUmlRelations({elements:[participant,mark]}).elements[1];
  const second=resolveUmlRelations({elements:[translateElement(participant,80,20),mark]}).elements[1];
  assert.equal(second.x-first.x,80);assert.equal(second.y-first.y,20);
});

test('la configuration UML conserve le style du groupe',()=>{
  const node={...createUmlNode('class'),stroke:'#635bff',strokeWidth:4,dash:'1 5'};
  const next=updateUmlNode(node,{name:'Commande'});
  assert.equal(next.stroke,node.stroke);assert.equal(next.strokeWidth,4);assert.equal(next.dash,'1 5');
});

test('la destruction termine la ligne de vie au centre de sa croix',()=>{
  const participant=createUmlNode('participant',{x:60,y:80});
  const mark={...createUmlNode('destruction'),sourceId:participant.id,offset:260};
  const resolved=resolveUmlRelations({elements:[participant,mark]});
  assert.equal(resolved.elements[0].children.find(c=>c.type==='line').y2,resolved.elements[1].y+24);
});
