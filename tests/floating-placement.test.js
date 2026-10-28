import test from 'node:test';
import assert from 'node:assert/strict';
import { placeFloating } from '../src/floating-placement.js';
const area={left:200,top:160,right:1000,bottom:760};
test('les commandes privilégient l’espace à droite de la sélection',()=>{
  const result=placeFloating({left:300,top:300,right:400,bottom:400},{width:220,height:80},area);
  assert.equal(result.left,410);assert.equal(result.top,300);
});
test('près des bords les commandes passent au-dessus, en dessous ou dans les limites disponibles',()=>{
  for(const target of [{left:900,top:300,right:980,bottom:400},{left:900,top:160,right:980,bottom:200},{left:200,top:160,right:1000,bottom:760}]){
    const before=JSON.stringify(target),result=placeFloating(target,{width:220,height:80},area);
    assert.ok(result.left>=area.left&&result.left+220<=area.right);
    assert.ok(result.top>=area.top&&result.top+80<=area.bottom);assert.equal(JSON.stringify(target),before);
  }
});
test('une commande trop large reçoit une largeur maximale compatible avec l’atelier',()=>{
  const result=placeFloating({left:10,top:10,right:80,bottom:80},{width:400,height:100},{left:0,top:0,right:240,bottom:300});
  assert.equal(result.maxWidth,240);assert.equal(result.left,0);
});
test('le placement évite la sélection lorsqu’un côté est disponible',()=>{
  assert.equal(placeFloating({left:900,top:300,right:980,bottom:400},{width:220,height:80},area).top,210);
  assert.equal(placeFloating({left:900,top:160,right:980,bottom:200},{width:220,height:80},area).top,210);
  assert.equal(placeFloating({left:900,top:160,right:980,bottom:760},{width:220,height:80},area).left,670);
});
test('les commandes évitent une boîte voisine quand une autre position est libre',()=>{
  const result=placeFloating({left:300,top:300,right:400,bottom:400},{width:220,height:80},area,10,[{left:410,top:300,right:680,bottom:420}]);
  assert.equal(result.top,210);assert.equal(result.left,300);
});
