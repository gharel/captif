import test from 'node:test';
import assert from 'node:assert/strict';
import { alignElements,autoLayout } from '../src/layout.js';
import { elementBounds } from '../src/geometry.js';
import { createUmlNode } from '../src/uml-nodes.js';

const rect=(id,x,y,width=100,height=70)=>({id,type:'rect',x,y,width,height,stroke:'#334155',strokeWidth:1});
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function assertPacked(elements){
  const bounds=elements.map(elementBounds);
  for(const b of bounds){assert.ok(b.x>=24&&b.y>=24);assert.ok(b.x+b.width<=770.001&&b.y+b.height<=1099.001);}
  for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++)assert.equal(overlap(bounds[i],bounds[j]),false);
}

test('six alignements prennent en compte les tailles différentes',()=>{
  const source=[rect('a',90,80,100,70),rect('b',260,240,160,110)];
  const selectors={left:b=>b.x,'center-x':b=>b.x+b.width/2,right:b=>b.x+b.width,top:b=>b.y,'center-y':b=>b.y+b.height/2,bottom:b=>b.y+b.height};
  for(const [mode,select] of Object.entries(selectors)){
    const next=alignElements(source,mode).map(elementBounds);assert.equal(select(next[0]),select(next[1]),mode);
  }
  assert.equal(source[0].x,90);assert.throws(()=>alignElements(source,'unknown'));
});
test('les distributions égalisent les espaces en conservant les deux extrêmes',()=>{
  const source=[rect('a',24,24,80,70),rect('b',210,240,120,90),rect('c',560,600,140,100)];
  for(const [mode,axis,size] of [['distribute-x','x','width'],['distribute-y','y','height']]){
    const next=alignElements(source,mode).map(elementBounds).sort((a,b)=>a[axis]-b[axis]);
    assert.equal(next[0][axis],source[0][axis]);assert.equal(next[2][axis],source[2][axis]);
    assert.ok(Math.abs(next[1][axis]-next[0][axis]-next[0][size]-(next[2][axis]-next[1][axis]-next[1][size]))<1e-8);
  }
  assert.throws(()=>alignElements([rect('a',30,30,200),rect('b',40,40,200),rect('c',50,50,200)],'distribute-x'));
});
test('les groupes gardent leurs enfants et les liens attachés ne sont pas translatés seuls',()=>{
  const group={...rect('g',80,90),type:'group',label:'Élément UML',children:[rect('child',85,95,20,20)]};
  const line={id:'l',type:'line',x:180,y:120,x2:400,y2:300,sourceId:'g',targetId:'b',routing:'orthogonal',stroke:'#334155',strokeWidth:1};
  const source=[group,rect('b',400,300),line],before=structuredClone(source),next=alignElements(source,'left');
  assert.equal(next[1].x,80);assert.equal(next[0].children[0].x,85);assert.deepEqual(next[2],line);assert.deepEqual(source,before);
  const right=alignElements(source,'right');assert.equal(right[0].x,400);assert.equal(right[0].children[0].x,405);assert.equal(right[0].children[0].y,95);
});
test('la réorganisation sépare les boîtes superposées en préservant le contenu et les liens',()=>{
  const nodes=Array.from({length:6},(_,i)=>rect(`n${i}`,100,100,230+(i%2)*30,100+(i%3)*30));
  const edges=nodes.slice(1).map((e,i)=>({id:`l${i}`,type:'line',x:0,y:0,x2:1,y2:1,sourceId:nodes[i].id,targetId:e.id,routing:'orthogonal',stroke:'#334155',strokeWidth:1}));
  const source=[...nodes,...edges],before=structuredClone(source),next=autoLayout(source);
  assertPacked(next.slice(0,nodes.length));assert.deepEqual(next.map(e=>e.id),source.map(e=>e.id));assert.deepEqual(next.slice(nodes.length),edges);assert.deepEqual(source,before);
  assert.deepEqual(autoLayout(source),next);
});
test('une chaîne se lit de haut en bas et un cycle garde une disposition valide',()=>{
  const nodes=[rect('a',200,200,240,120),rect('b',200,200,240,120),rect('c',200,200,240,120)];
  const edge=(id,sourceId,targetId)=>({id,type:'arrow',x:0,y:0,x2:1,y2:1,sourceId,targetId,routing:'orthogonal',stroke:'#334155',strokeWidth:1});
  const edges=[edge('ab','a','b'),edge('bc','b','c')],next=autoLayout([...nodes,...edges]);
  assert.ok(next[0].y<next[1].y&&next[1].y<next[2].y);assertPacked(next.slice(0,3));
  assertPacked(autoLayout([...nodes,...edges,edge('ca','c','a')]).slice(0,3));
});
test('les participants de séquence restent sur des colonnes distinctes avec les offsets inchangés',()=>{
  const a=createUmlNode('participant',{name:'Client',x:300,y:300}),b=createUmlNode('participant',{name:'Service',x:300,y:300});
  const activation={...createUmlNode('activation'),sourceId:b.id,offset:160};
  const message={id:'message',type:'line',x:1,y:1,x2:2,y2:2,sourceId:a.id,targetId:b.id,offset:230};
  const next=autoLayout([a,b,activation,message]);assert.equal(next[0].y,next[1].y);assertPacked(next.slice(0,2));
  assert.deepEqual(next[2],activation);assert.deepEqual(next[3],message);
});
test('un fragment suit les participants sous leurs en-têtes, sans redimensionner ses textes',()=>{
  const a=createUmlNode('participant',{name:'Client',x:300,y:300}),b=createUmlNode('participant',{name:'Service',x:300,y:300});
  const fragment=createUmlNode('fragment',{x:50,y:200,width:500,height:240}),next=autoLayout([a,b,fragment]);
  assert.ok(next[2].y>=next[0].y+46);assert.equal(next[2].width,fragment.width);assert.equal(next[2].height,fragment.height);
  assert.deepEqual(next[2].children.filter(c=>c.type==='text').map(c=>[c.text,c.fontSize]),fragment.children.filter(c=>c.type==='text').map(c=>[c.text,c.fontSize]));
});
test('les cas contenus restent dans la frontière de leur système',()=>{
  const system=createUmlNode('system',{x:120,y:80,width:520,height:380});
  const first=createUmlNode('usecase',{x:180,y:160}),second=createUmlNode('usecase',{x:180,y:160});
  const next=autoLayout([system,first,second]),frame=elementBounds(next[0]);assertPacked(next.slice(1));
  for(const e of next.slice(1)){const b=elementBounds(e);assert.ok(b.x>frame.x&&b.x+b.width<frame.x+frame.width&&b.y>frame.y&&b.y+b.height<frame.y+frame.height);}
});
test('une capacité insuffisante échoue sans modifier ou réduire les éléments',()=>{
  const source=Array.from({length:6},(_,i)=>rect(`n${i}`,24,36,700,300)),before=structuredClone(source);
  assert.throws(()=>autoLayout(source),/place|feuille|capacité/i);assert.deepEqual(source,before);
});
test('un alignement refuse le dépassement provoqué par le retour à la ligne d’un texte historique',()=>{
  const text={id:'legacy-text',type:'text',x:24,y:1088,text:'A'.repeat(25),fontSize:18,stroke:'#334155',strokeWidth:1};
  const source=[text,rect('r',670,100,100,70)],before=structuredClone(source);
  assert.throws(()=>alignElements(source,'right'),/texte|feuille|dépass/i);assert.deepEqual(source,before);
});
