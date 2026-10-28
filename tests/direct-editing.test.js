import test from 'node:test';
import assert from 'node:assert/strict';
import { directTextPlacement } from '../src/direct-editing.js';

test('la saisie conserve les coordonnées, la police et la largeur au zoom courant',()=>{
  const text={x:100,y:160,width:240,height:80,fontSize:18,text:'Bonjour',role:'box-body'};
  const before=JSON.stringify(text);
  const placed=directTextPlacement(text,null,.5);
  assert.equal(placed.left,50);assert.equal(placed.top,71);
  assert.equal(placed.width,120);assert.equal(placed.fontSize,9);
  assert.equal(placed.align,'left');assert.equal(JSON.stringify(text),before);
});
test('les titres et noms d’acteurs utilisent la largeur du groupe et restent centrés',()=>{
  for(const [role,umlKind] of [['box-title',undefined],['uml-name','actor'],['uml-name','class']]){
    const p=directTextPlacement({x:120,y:160,fontSize:16,text:'Titre',role},{x:100,width:240,umlKind},1);
    assert.equal(p.left,112);assert.equal(p.width,216);assert.equal(p.align,'center');
  }
});
test('le code reste dans sa zone et les champs vides gardent une cible de saisie',()=>{
  const code=directTextPlacement({x:90,y:162,width:380,height:100,fontSize:13,text:'',role:'code-content'},null,1);
  assert.equal(code.left,90);assert.equal(code.width,380);assert.equal(code.height,100);
  assert.ok(directTextPlacement({x:20,y:30,fontSize:18,text:''},null,1).width>=24);
});
