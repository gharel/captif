import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument } from '../src/model.js';
import { createCodeBlock } from '../src/code-blocks.js';
import { makeDraft, recoverDraft, saveDraft, loadDraft, clearDraft } from '../src/drafts.js';

test('un brouillon de code reprend texte, format et langage sans modifier la copie',()=>{
  const doc=createDocument(),block=createCodeBlock();doc.pages[0].elements=[block];
  const field=block.children.find(e=>e.role==='code-content'),before=JSON.stringify(doc);
  const draft=makeDraft(doc,doc.pages[0].id,field,{text:'SELECT 1;\n',format:{bold:false},language:'sql'});
  assert.equal(JSON.stringify(doc),before);
  const recovered=recoverDraft(doc,JSON.parse(JSON.stringify(draft)));
  assert.equal(recovered.text,'SELECT 1;\n');assert.equal(recovered.language,'sql');
  assert.equal(recoverDraft({...doc,id:'autre'},draft),null);
  const changed=structuredClone(doc);changed.pages[0].elements[0].children.find(e=>e.id===field.id).text='modifié';
  assert.equal(recoverDraft(changed,draft),null);
});
test('un brouillon malformé ou un langage non autorisé est refusé',()=>{
  const doc=createDocument(),field={id:'t',type:'text',x:30,y:50,fontSize:18,text:''};doc.pages[0].elements=[field];
  const draft=makeDraft(doc,doc.pages[0].id,field,{text:'saisie',format:{italic:true},fontSize:24});
  assert.equal(recoverDraft(doc,draft).fontSize,24);
  for(const patch of [{text:'a'.repeat(10001)},{format:{bold:'oui'}},{language:'__proto__'},{fontSize:900},{fontSize:48},{fontSize:8}])assert.throws(()=>recoverDraft(doc,{...draft,...patch}));
});

test('une annulation retire le brouillon et une mise en forme du champ invalide la reprise',t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
  t.after(()=>{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;});
  const doc=createDocument(),field={id:'t',type:'text',x:20,y:40,text:'',fontSize:18};doc.pages[0].elements=[field];
  saveDraft(makeDraft(doc,doc.pages[0].id,field,{text:'brouillon',format:{bold:true}}));
  assert.equal(loadDraft(doc).text,'brouillon');
  const changed=structuredClone(doc);changed.pages[0].elements[0].italic=true;assert.equal(loadDraft(changed),null);
  clearDraft();assert.equal(loadDraft(doc),null);
});
