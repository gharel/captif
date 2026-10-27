import test from 'node:test';
import assert from 'node:assert/strict';
import { editableConnector,resolveDiagramConnections } from '../src/diagram-connections.js';
import { createEntity,createRelation,resolveRelations } from '../src/bdd.js';
import { createUmlNode } from '../src/uml-nodes.js';
import { createUmlRelation,resolveUmlRelations } from '../src/uml-relations.js';
import { moveBend,segmentHitsBox } from '../src/connectors.js';
import { elementBounds } from '../src/geometry.js';

const orthogonal=points=>points.slice(1).every((p,i)=>p.x===points[i].x||p.y===points[i].y);
const routed=page=>resolveDiagramConnections(resolveUmlRelations(resolveRelations(page)));

test('l’adaptateur laisse les connexions génériques intactes et exclut les messages de séquence',()=>{
  const generic={id:'line',type:'line',x:40,y:40,x2:200,y2:200,routing:'orthogonal'};
  assert.equal(editableConnector(generic),generic);
  assert.equal(editableConnector(createUmlRelation({kind:'message-sync'})),null);
});
test('une relation BDD devient un parcours orthogonal qui garde ses libellés et contourne les boîtes',()=>{
  const a=createEntity({x:24,y:100,name:'A',attributes:[]}),b=createEntity({x:420,y:420,name:'B',attributes:[]});
  const relation=createRelation({sourceId:a.id,targetId:b.id,name:'possède',left:'1,1',right:'0,N'});
  const obstacle={id:'obstacle',type:'rect',x:360,y:220,width:90,height:120,stroke:'#334155',strokeWidth:1};
  const page={elements:[a,b,obstacle,relation]},before=structuredClone(page),next=routed(page).elements.at(-1),virtual=editableConnector(next);
  assert.equal(next.id,relation.id);assert.equal(next.label,'Relation BDD');assert.ok(orthogonal(virtual.route));
  assert.equal(next.children.filter(c=>c.role==='relation-line').length,1);
  assert.equal(next.children.find(c=>c.role==='relation-line').type,'pen');
  assert.ok(virtual.route.slice(1).every((p,i)=>!segmentHitsBox(virtual.route[i],p,obstacle)));
  for(const role of ['relation-name','cardinality-left','cardinality-right']){
    assert.equal(next.children.find(c=>c.role===role).text,relation.children.find(c=>c.role===role).text);
    assert.equal(next.children.find(c=>c.role===role).id,relation.children.find(c=>c.role===role).id);
  }
  assert.deepEqual(page,before);assert.equal(next.route,undefined);
});
test('les passages manuels fonctionnent sur une relation sémantique',()=>{
  const a=createUmlNode('class',{x:30,y:100,name:'A'}),b=createUmlNode('class',{x:450,y:100,name:'B'});
  const group=createUmlRelation({kind:'association',sourceId:a.id,targetId:b.id});
  const first=routed({elements:[a,b,group]}).elements[2],virtual=editableConnector(first),changed=moveBend(virtual,0,{x:350,y:420});
  const next=routed({elements:[a,b,{...group,waypoints:changed.waypoints}]}).elements[2];
  const route=editableConnector(next).route;assert.ok(orthogonal(route));assert.ok(route.some(p=>p.y===420));assert.deepEqual(next.waypoints,changed.waypoints);
});
test('le losange de composition suit le premier segment et conserve son style',()=>{
  const a=createUmlNode('class',{x:40,y:80,name:'A'}),b=createUmlNode('class',{x:430,y:420,name:'B'});
  const group=createUmlRelation({kind:'composition',sourceId:a.id,targetId:b.id});
  const oldMarker=group.children.find(c=>c.role==='uml-marker'),next=routed({elements:[a,b,group]}).elements[2],route=editableConnector(next).route,marker=next.children.find(c=>c.role==='uml-marker');
  assert.equal(marker.id,oldMarker.id);assert.equal(marker.fill,oldMarker.fill);assert.deepEqual(marker.points[0],route[0]);
  const dx=route[1].x-route[0].x,dy=route[1].y-route[0].y,len=Math.hypot(dx,dy);
  const corner=marker.points[2];assert.ok(Math.abs((corner.x-route[0].x)*dy-(corner.y-route[0].y)*dx)<.01);
  assert.ok((corner.x-route[0].x)*dx/len+(corner.y-route[0].y)*dy/len>20);
});
test('le triangle de généralisation pivote vers la dernière portion du parcours',()=>{
  const a=createUmlNode('class',{x:40,y:80,name:'A'}),b=createUmlNode('class',{x:430,y:420,name:'B'});
  const group=createUmlRelation({kind:'generalization',sourceId:a.id,targetId:b.id});
  const next=routed({elements:[a,b,group]}).elements[2],route=editableConnector(next).route,marker=next.children.find(c=>c.role==='uml-marker'),tip=route.at(-1),previous=route.at(-2),len=Math.hypot(tip.x-previous.x,tip.y-previous.y),u={x:(tip.x-previous.x)/len,y:(tip.y-previous.y)/len};
  assert.deepEqual(marker.points[0],tip);assert.equal(marker.fill,'#ffffff');
  assert.ok(Math.abs((marker.points[1].x-tip.x)*u.x+(marker.points[1].y-tip.y)*u.y+16)<.02);
});
test('les extrémités libres explicites priment sur la géométrie du modèle',()=>{
  const group={...createRelation({name:''}),startPoint:{x:80,y:100},endPoint:{x:480,y:300}};
  const next=resolveDiagramConnections({elements:[group]}).elements[0],route=editableConnector(next).route;
  assert.deepEqual(route[0],group.startPoint);assert.deepEqual(route.at(-1),group.endPoint);assert.ok(orthogonal(route));
  assert.deepEqual(next.startPoint,group.startPoint);assert.deepEqual(next.endPoint,group.endPoint);
});
test('les coordonnées libres fractionnaires ne créent pas de micro-diagonales dans le connecteur éditable',()=>{
  const group={...createRelation({name:''}),startPoint:{x:80.123456,y:100.789123},endPoint:{x:480.987654,y:300.654321}};
  const next=resolveDiagramConnections({elements:[group]}).elements[0];
  assert.ok(orthogonal(editableConnector(next).route));
});

test('les cardinalités et le nom restent hors des boîtes rapprochées et ne se chevauchent pas',()=>{
  const overlaps=(a,b)=>a.x<b.x+b.width+2&&a.x+a.width+2>b.x&&a.y<b.y+b.height+2&&a.y+a.height+2>b.y;
  for(const gap of [28,64]){
    const a=createEntity({x:24,y:100,name:'CLIENT',attributes:[]}),b=createEntity({x:24+a.width+gap,y:100,name:'COMMANDE',attributes:[]});
    const group=createRelation({sourceId:a.id,targetId:b.id,name:'possède plusieurs',left:'1,1',right:'0,N'}),before=structuredClone(group);
    const next=routed({elements:[a,b,group]}).elements[2],labels=next.children.filter(c=>['relation-name','cardinality-left','cardinality-right'].includes(c.role));
    for(const label of labels)for(const box of [a,b])assert.ok(!overlaps(elementBounds(label),elementBounds(box)),`${gap} : ${label.role} recouvre ${box.id}`);
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(!overlaps(elementBounds(labels[i]),elementBounds(labels[j])),`${gap} : libellés superposés`);
    assert.ok(orthogonal(editableConnector(next).route));assert.deepEqual(group,before);
  }
});
