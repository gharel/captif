import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreferences, writePreferences, toolShortcut } from '../src/workspace-preferences.js';

test('les préférences visuelles sont locales et gardent les valeurs autorisées seulement',()=>{
  let saved;const storage={getItem:()=>saved,setItem:(_,v)=>saved=v};
  assert.deepEqual(readPreferences(storage),{});
  writePreferences({pages:false,library:true,grid:false,student:'interdit'},storage);
  assert.deepEqual(readPreferences(storage),{pages:false,library:true,grid:false});assert.ok(!saved.includes('student'));
  saved='{"pages":"non","library":false,"grid":0}';assert.deepEqual(readPreferences(storage),{library:false});
  saved='illisible';assert.deepEqual(readPreferences(storage),{});
  assert.doesNotThrow(()=>writePreferences({grid:true},{setItem(){throw new Error('quota');}}));
});
test('les raccourcis d’outils respectent la saisie et les modificateurs',()=>{
  assert.equal(toolShortcut({key:'r'}),'rect');assert.equal(toolShortcut({key:'V'}),'select');
  for(const event of [{key:'r',ctrlKey:true},{key:'t',altKey:true},{key:'p',metaKey:true},{key:'l',isComposing:true}])assert.equal(toolShortcut(event),null);
  assert.equal(toolShortcut({key:'r'},true),null);assert.equal(toolShortcut({key:'x'}),null);
  assert.equal(toolShortcut({key:'constructor'}),null);
});
test('un accès au stockage interdit ne bloque jamais l’atelier',t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('SecurityError');}});
  t.after(()=>{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;});
  assert.deepEqual(readPreferences(),{});assert.doesNotThrow(()=>writePreferences({grid:true}));
});
