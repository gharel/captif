import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, addPage, updateElement, removeElement, createHistory, commit } from '../src/model.js';
import { connectorData } from '../src/connectors.js';
import { normalizeCopy } from '../src/document-data.js';
import { pageIndex } from '../src/page-index.js';

test('modifier un champ conserve les groupes et composants non concernés',()=>{
  const doc=addPage(createDocument());
  const a={id:'a',type:'group',children:[{id:'t',type:'text',text:'avant'},{id:'r',type:'rect',x:30}]};
  const b={id:'b',type:'group',children:[{id:'u',type:'text',text:'voisin'}]};
  doc.pages[0].elements=[a,b];
  const next=updateElement(doc,doc.pages[0].id,'t',{text:'après'});
  assert.equal(next.pages[0].elements[1],b);assert.equal(next.pages[0].elements[0].children[1],a.children[1]);
  assert.equal(next.pages[1],doc.pages[1]);assert.equal(a.children[0].text,'avant');
});
test('une opération sans effet conserve la copie et ne remplit pas l’historique',()=>{
  const doc=createDocument();doc.pages[0].elements=[{id:'r',type:'rect',x:30}];
  for(const next of [updateElement(doc,doc.pages[0].id,'absent',{x:50}),updateElement(doc,doc.pages[0].id,'r',{x:30}),removeElement(doc,doc.pages[0].id,'absent')]){
    assert.equal(next,doc);assert.equal(commit(createHistory(doc),next).past.length,0);
  }
});
test('supprimer un champ conserve ses voisins et nettoie seulement les routes calculées',()=>{
  const clean={id:'g',type:'group',children:[{id:'r',type:'rect',x:30}]};assert.equal(connectorData(clean),clean);
  const wire={id:'w',type:'line',routing:'orthogonal',route:[{x:1,y:2}],routeBlocked:false};
  const dirty={...clean,children:[...clean.children,wire]},next=connectorData(dirty);
  assert.equal(next.children[0],clean.children[0]);assert.ok(!('route' in next.children[1]));assert.ok('route' in wire);
  const doc=createDocument();doc.pages[0].elements=[dirty,clean];
  assert.equal(removeElement(doc,doc.pages[0].id,'w').pages[0].elements[1],clean);
});
test('normaliser une copie propre et indexer ses champs ne recrée pas ses pages',()=>{
  const doc=createDocument(),group={id:'g',type:'group',children:[{id:'t',type:'text',text:''}]};doc.pages[0].elements=[group];
  assert.equal(normalizeCopy(doc,doc.pages[0].id),doc);
  const index=pageIndex(doc.pages[0]);assert.equal(index.parents.get('t'),group);assert.equal(index.elements.get('t'),group.children[0]);assert.equal(pageIndex(doc.pages[0]),index);
  assert.ok(index.order.get('g')<index.order.get('t'));
  const next=updateElement(doc,doc.pages[0].id,'t',{text:'modifié'});assert.equal(pageIndex(next.pages[0]).elements.get('t').text,'modifié');
});
