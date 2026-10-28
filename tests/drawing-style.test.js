import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DRAWING_STYLE,applyDrawingStyle } from '../src/drawing-style.js';
import { createUmlNode } from '../src/uml-nodes.js';
import { createUmlRelation } from '../src/uml-relations.js';
import { emptyBdd } from '../src/diagram-inline.js';
import { UML_NODE_KINDS } from '../src/uml-nodes.js';
import { createCodeBlock } from '../src/code-blocks.js';
import { strokeMarkup } from '../src/stroke-ui.js';

test('le dessin commence avec un trait de 1 px',()=>{
  assert.equal(DEFAULT_DRAWING_STYLE.thickness,1);
  const node=applyDrawingStyle(createUmlNode('class'),DEFAULT_DRAWING_STYLE);
  assert.equal(node.strokeWidth,1);assert.ok(node.children.every(c=>c.strokeWidth===1));
});

test('les contours et connexions partagent un gris léger contrasté, les textes restent sombres',()=>{
  const gray=DEFAULT_DRAWING_STYLE.color;
  assert.equal(gray,'#888c94');
  const lum=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  for(const background of ['#ffffff','#f8faff'])assert.ok((lum(background)+.05)/(lum(gray)+.05)>=3);
  for(const node of [...UML_NODE_KINDS.map(kind=>createUmlNode(kind)),emptyBdd('entity'),emptyBdd('association'),createUmlRelation({kind:'association'})]){
    assert.equal(node.stroke,gray);
    for(const child of node.children){
      if(child.type!=='text')assert.equal(child.stroke,gray,`${node.umlKind||node.label}: ${child.role}`);
    }
    const styled=applyDrawingStyle(node,DEFAULT_DRAWING_STYLE);
    for(const text of styled.children.filter(c=>c.type==='text'))assert.notEqual(text.stroke,gray);
  }
  const code=createCodeBlock();
  for(const frame of code.children.filter(c=>['frame','code-header'].includes(c.role)))assert.equal(frame.stroke,gray);
  assert.ok(strokeMarkup().includes(`data-stroke-color="${gray}"`));
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
