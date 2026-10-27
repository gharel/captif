import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DRAWING_STYLE,applyDrawingStyle } from '../src/drawing-style.js';
import { createUmlNode } from '../src/uml-nodes.js';
import { createUmlRelation } from '../src/uml-relations.js';

test('le dessin commence avec un trait de 1 px',()=>{
  assert.equal(DEFAULT_DRAWING_STYLE.thickness,1);
  const node=applyDrawingStyle(createUmlNode('class'),DEFAULT_DRAWING_STYLE);
  assert.equal(node.strokeWidth,1);assert.ok(node.children.every(c=>c.strokeWidth===1));
});
test('les nouveaux composants reprennent les choix sans modifier les réglages ni leurs sources',()=>{
  const style={color:'#635bff',thickness:7,dash:'1 5'},source=createUmlNode('class'),before=structuredClone(source);
  for(const kind of ['class','actor','participant']){
    const node=applyDrawingStyle(createUmlNode(kind),style,true);
    assert.equal(node.stroke,'#635bff');assert.equal(node.strokeWidth,7);assert.equal(node.dash,'1 5');
    assert.ok(node.children.every(c=>c.strokeWidth===7&&c.dash==='1 5'));
  }
  applyDrawingStyle(source,style,true);assert.deepEqual(source,before);assert.deepEqual(style,{color:'#635bff',thickness:7,dash:'1 5'});
});
test('les tirets de notation restent présents tant qu’aucun motif n’a été choisi explicitement',()=>{
  const relation=createUmlRelation({kind:'dependency'});
  const semantic=applyDrawingStyle(relation,DEFAULT_DRAWING_STYLE);
  assert.equal(semantic.children.find(c=>c.role==='uml-relation-line').dash,'6 5');
  const solid=applyDrawingStyle(relation,DEFAULT_DRAWING_STYLE,true);
  assert.equal(solid.dash,'solid');assert.equal(solid.children.find(c=>c.role==='uml-relation-line').dash,'solid');
});
