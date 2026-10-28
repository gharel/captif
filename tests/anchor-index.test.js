import test from 'node:test';
import assert from 'node:assert/strict';
import { findAnchor, anchorsForElements } from '../src/connectors.js';
const box=(id,x,y)=>({id,type:'rect',x,y,width:64,height:64});
test('les recherches d’accroche traversent les cellules et respectent la tolérance exacte',()=>{
  const elements=[box('a',64,64)],before=JSON.stringify(elements);
  assert.equal(findAnchor(elements,{x:129,y:96},1).side,'e');
  assert.equal(findAnchor(elements,{x:129.1,y:96},1),null);
  assert.equal(findAnchor(elements,{x:63,y:96},1).side,'w');
  assert.equal(JSON.stringify(elements),before);
});
test('les égalités privilégient la dernière ancre et les exclusions restent précises',()=>{
  const elements=[box('a',64,64),box('b',64,64)];
  assert.equal(findAnchor(elements,{x:128,y:96}).shapeId,'b');
  assert.equal(findAnchor(elements,{x:128,y:96},16,{shapeId:'b',side:'e'}).shapeId,'a');
  assert.equal(findAnchor(elements,{x:1000,y:1000},Infinity).shapeId,'b');
  assert.equal(findAnchor(elements,{x:NaN,y:1}),null);
});
test('les collections immuables réutilisent leurs ancres et une forme déplacée invalide la recherche',()=>{
  const first=[box('a',64,64)];assert.equal(anchorsForElements(first),anchorsForElements(first));
  assert.throws(()=>anchorsForElements(first).push({}));
  const next=[{...first[0],x:300}];assert.equal(findAnchor(next,{x:128,y:96}),null);
  assert.equal(findAnchor(next,{x:364,y:96}).shapeId,'a');assert.equal(findAnchor(first,{x:128,y:96}).shapeId,'a');
});
