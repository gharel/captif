import test from 'node:test';
import assert from 'node:assert/strict';
import { bendHandles,moveBend,resolveConnectors,segmentHitsBox,connectorData } from '../src/connectors.js';
import { translateElement } from '../src/geometry.js';

const a={id:'a',type:'rect',x:80,y:160,width:120,height:100,stroke:'#334155',strokeWidth:1};
const b={...a,id:'b',x:540};
const link={id:'link',type:'arrow',x:200,y:210,x2:540,y2:210,sourceId:'a',targetId:'b',sourceAnchor:'e',targetAnchor:'w',routing:'orthogonal',stroke:'#635bff',strokeWidth:3,dash:'8 5'};
const orthogonal=route=>route.slice(1).every((p,i)=>p.x===route[i].x||p.y===route[i].y);
const resolved=()=>resolveConnectors({elements:[a,b,link]}).elements[2];

test('une ligne droite propose une poignée centrale qui crée un détour',()=>{
  const source=resolved(),handles=bendHandles(source),before=structuredClone(source);
  assert.equal(handles.length,1);assert.equal(handles[0].axis,'y');
  const changed=moveBend(source,handles[0].index,{x:300,y:350});
  assert.ok(changed.waypoints.some(p=>p.y===350));assert.deepEqual(source,before);
  const next=resolveConnectors({elements:[a,b,changed]}).elements[2];
  assert.ok(orthogonal(next.route));assert.ok(next.route.some(p=>p.y===350));
  assert.deepEqual(next.route[0],{x:200,y:210});assert.deepEqual(next.route.at(-1),{x:540,y:210});
});
test('les poignées de coudes déplacent un seul axe et excluent les petites sorties des ports',()=>{
  const changed=moveBend(resolved(),0,{x:300,y:350});
  const routed=resolveConnectors({elements:[a,b,changed]}).elements[2],handles=bendHandles(routed);
  assert.ok(handles.every(h=>h.index!==0));
  assert.ok(handles.every(h=>{
    const first=routed.route[h.index],last=routed.route[h.index+1];
    return h.index!==routed.route.length-2||Math.abs(first.x-last.x)+Math.abs(first.y-last.y)>40;
  }));
  const vertical=handles.find(h=>h.axis==='x');assert.ok(vertical);
  const next=moveBend(routed,vertical.index,{x:260,y:600});
  assert.ok(next.waypoints.some(p=>p.x===260));
  assert.equal(next.sourceId,'a');assert.equal(next.targetId,'b');assert.equal(next.stroke,'#635bff');assert.equal(next.dash,'8 5');
});
test('les extrémités suivent les formes après modification des coudes',()=>{
  const changed=moveBend(resolved(),0,{x:300,y:350});
  const moved=translateElement(a,40,20),next=resolveConnectors({elements:[moved,b,changed]}).elements[2];
  assert.deepEqual(next.route[0],{x:240,y:230});assert.deepEqual(next.route.at(-1),{x:540,y:210});
  assert.ok(orthogonal(next.route));assert.ok(next.waypoints.some(p=>p.y===350));
});
test('les passages manuels conservent le contournement des formes',()=>{
  const changed=moveBend(resolved(),0,{x:300,y:350});
  const obstacle={...a,id:'obstacle',x:320,y:280,width:80,height:140};
  const next=resolveConnectors({elements:[a,b,obstacle,changed]}).elements[3];
  assert.ok(orthogonal(next.route));
  assert.ok(next.route.slice(1).every((p,i)=>!segmentHitsBox(next.route[i],p,obstacle)));
});
test('les passages restent bornés et le chemin calculé reste hors des données sauvegardées',()=>{
  const changed=moveBend(resolved(),0,{x:300,y:-1000});
  assert.ok(changed.waypoints.every(p=>p.x>=12&&p.x<=782&&p.y>=12&&p.y<=1111));
  assert.equal(connectorData(changed).route,undefined);assert.deepEqual(connectorData(changed).waypoints,changed.waypoints);
  assert.throws(()=>moveBend(resolved(),99,{x:30,y:40}));
  assert.throws(()=>moveBend(resolved(),0,{x:NaN,y:40}));
});
