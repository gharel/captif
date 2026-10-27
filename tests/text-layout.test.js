import test from 'node:test';
import assert from 'node:assert/strict';
import { textLines,elementBounds } from '../src/geometry.js';
import { resizeElement } from '../src/transforms.js';
import { createDocument,validateDocument } from '../src/model.js';
import { elementSvg } from '../src/render.js';
import { scaledDash } from '../src/stroke.js';
import { printDocument } from '../src/print.js';
import { createUmlNode,updateUmlNode } from '../src/uml-nodes.js';
import { createEntity,updateEntity } from '../src/bdd.js';
const text={id:'text',type:'text',x:100,y:130,text:'Une zone de texte avec plusieurs mots',fontSize:18,stroke:'#334155',strokeWidth:2,width:320,height:50};

test('réduire la zone recompose les lignes sans changer la taille des caractères',()=>{
  const next=resizeElement(text,'e',{x:230,y:140});
  assert.equal(next.fontSize,18);assert.equal(next.width,130);assert.equal(next.text,text.text);
  assert.ok(textLines(next).length>textLines(text).length);
  assert.ok(elementBounds(next).height>=textLines(next).length*18);
});
test('le retour à la ligne respecte les mots, les paragraphes et les mots très longs',()=>{
  assert.deepEqual(textLines({...text,text:'Bonjour tout le monde\nSuite',width:140}),['Bonjour tout','le monde','Suite']);
  assert.equal(textLines({...text,text:'X'.repeat(60),width:50}).join(''),'X'.repeat(60));
});
test('la sauvegarde et le SVG préservent zone, gras et italique',()=>{
  const doc=createDocument();doc.pages[0].elements=[{...text,bold:true,italic:true}];
  const saved=validateDocument(JSON.parse(JSON.stringify(doc))).pages[0].elements[0];
  assert.equal(saved.width,320);assert.equal(saved.height,50);assert.equal(saved.bold,true);
  assert.match(elementSvg(saved),/font-weight="700"/);assert.match(elementSvg(saved),/font-style="italic"/);
  assert.throws(()=>validateDocument({...doc,pages:[{...doc.pages[0],elements:[{...text,bold:'true'}]}]}));
});
test('configurer à nouveau un composant conserve le gras et l’italique de ses textes',()=>{
  for(const [create,update] of [[()=>createUmlNode('class'),updateUmlNode],[()=>createEntity(),updateEntity]]){
    const group=create(),title=group.children.find(c=>c.type==='text');title.bold=true;title.italic=true;
    const changed=update(group,{name:'Nouveau nom'}),restored=changed.children.find(c=>c.id===title.id);
    assert.equal(restored.bold,true);assert.equal(restored.italic,true);
  }
});
test('les espaces des motifs restent supérieurs à l’épaisseur à 10 px',()=>{
  for(const pattern of ['8 5','1 5','8 4 1 4']){
    const dash=scaledDash(pattern,10).split(' ').map(Number);
    assert.ok(dash.filter((_,i)=>i%2===1).every(gap=>gap>10));
  }
});
test('chaque feuille imprimée et le bilan indiquent les absences et leur durée',()=>{
  const doc=createDocument();doc.pages.push({...doc.pages[0],id:'second'});
  const html=printDocument(doc,{absenceCount:3,totalAwayMs:83000,startedAt:1000,endedAt:100000},'');
  assert.equal((html.match(/Absences : 3/g)||[]).length,3);
  assert.equal((html.match(/Durée d’absence : 00:01:23/g)||[]).length,3);
});
