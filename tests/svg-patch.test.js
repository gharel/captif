import test from 'node:test';
import assert from 'node:assert/strict';
import { patchSvg } from '../src/svg-patch.js';

test('un SVG identique ne sollicite pas le parseur ; un conteneur vidé est reconstruit',t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'document');let parsed=0;
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){parsed++;return {content:{firstElementChild:{tagName:'svg'}}};}}});
  t.after(()=>{if(original)Object.defineProperty(globalThis,'document',original);else delete globalThis.document;});
  const container={firstElementChild:null,replaceChildren(node){this.firstElementChild=node;}};
  assert.equal(patchSvg(container,'<svg/>'),true);const node=container.firstElementChild;
  assert.equal(patchSvg(container,'<svg/>'),false);assert.equal(parsed,1);assert.equal(container.firstElementChild,node);
  container.replaceChildren(null);assert.equal(patchSvg(container,'<svg/>'),true);assert.equal(parsed,2);
});
