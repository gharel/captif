import test from 'node:test';
import assert from 'node:assert/strict';
import { createShape, resizeElement, duplicateElement } from '../src/transforms.js';
import { elementBounds } from '../src/geometry.js';
import { pageSvg } from '../src/render.js';
import { createDocument, validateDocument, addElement, createHistory, commit, undo } from '../src/model.js';

const rect={id:'r',type:'rect',x:100,y:100,width:120,height:60,stroke:'#334155',strokeWidth:2};
test('Maj crée un carré dans les quatre directions, Alt conserve le centre',()=>{
  for(const dx of [-80,80])for(const dy of [-30,30]){
    const shape=createShape(rect,{x:200,y:200},{x:200+dx,y:200+dy},{shift:true,alt:true});
    assert.equal(shape.width,shape.height);assert.equal(shape.x+shape.width/2,200);assert.equal(shape.y+shape.height/2,200);
  }
});
test('Maj contraint les lignes à 45 degrés et Alt les centre',()=>{
  const shape=createShape({...rect,type:'line'},{x:300,y:300},{x:380,y:350},{shift:true,alt:true});
  assert.ok(Math.abs(Math.abs(shape.x2-shape.x)-Math.abs(shape.y2-shape.y))<1e-8);
  assert.equal((shape.x+shape.x2)/2,300);
});
test('redimensionner conserve le point opposé ou le centre avec Alt et les proportions avec Maj',()=>{
  const resized=resizeElement(rect,'se',{x:300,y:250},{shift:true});
  assert.equal(resized.x,100);assert.equal(resized.y,100);assert.equal(resized.width/resized.height,2);
  const centered=resizeElement(rect,'se',{x:300,y:250},{alt:true});
  assert.equal(centered.x+centered.width/2,160);assert.equal(centered.y+centered.height/2,130);
  assert.equal(rect.width,120);
});
test('les contraintes restent respectées au bord de la feuille et en franchissant le point opposé',()=>{
  for(const point of [{x:2000,y:2000},{x:0,y:0}]){
    const resized=resizeElement(rect,'se',point,{shift:true,alt:true});const b=elementBounds(resized);
    assert.ok(b.x>=24&&b.y>=24);assert.ok(b.x+b.width<=770&&b.y+b.height<=1099);assert.equal(b.width/b.height,2);
  }
});
test('une poignée de ligne modifie uniquement son extrémité',()=>{
  const line={...rect,type:'arrow',x2:220,y2:160};const next=resizeElement(line,'end',{x:280,y:210});
  assert.equal(next.x,100);assert.equal(next.y,100);assert.equal(next.x2,280);assert.equal(next.y2,210);
});
test('les poignées agrandissent le cadre du texte à taille de police constante',()=>{
  const text={id:'t',type:'text',x:100,y:130,text:'Bonjour',fontSize:18,stroke:'#334155',strokeWidth:2};
  const next=resizeElement(text,'se',{x:500,y:300});
  assert.equal(next.fontSize,18);assert.equal(next.text,text.text);assert.equal(next.x,100);assert.ok(next.width>300);
});
test('dupliquer un groupe renouvelle les identifiants et garde ses composants solidaires',()=>{
  const group={...rect,id:'g',type:'group',label:'Élément UML',umlKind:'class',children:[rect]};
  const copy=duplicateElement(group);assert.notEqual(copy.id,group.id);assert.notEqual(copy.children[0].id,rect.id);
  assert.equal(copy.children[0].x,100);assert.equal(group.children[0].id,'r');
});

test('les poignées appartiennent à la sélection, jamais au rendu imprimable ni aux liens attachés',()=>{
  const page={elements:[rect]};assert.match(pageSvg(page,{selected:rect.id}),/data-resize="se"/);
  assert.doesNotMatch(pageSvg(page),/data-resize/);
  assert.doesNotMatch(pageSvg({elements:[{...rect,sourceId:'source'}]},{selected:rect.id}),/data-resize/);
});

test('copie et transformation se sauvegardent et une duplication s’annule en une action',()=>{
  const doc=createDocument();doc.pages[0].elements=[rect];
  const copy=duplicateElement(resizeElement(rect,'se',{x:350,y:240}));
  const next=addElement(doc,doc.pages[0].id,copy);
  assert.equal(validateDocument(next).pages[0].elements.length,2);
  assert.equal(undo(commit(createHistory(doc),next)).present.pages[0].elements.length,1);
});
