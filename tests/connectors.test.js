import test from 'node:test';
import assert from 'node:assert/strict';
import { anchorsFor,findAnchor,resolveConnectors,attachEndpoint,segmentHitsBox,connectorData } from '../src/connectors.js';
import { createDocument,validateDocument,removeElement } from '../src/model.js';
import { translateElement } from '../src/geometry.js';
import { duplicateSelection } from '../src/selection.js';
import { pageSvg } from '../src/render.js';
const a={id:'a',type:'rect',x:80,y:160,width:120,height:100,stroke:'#334155',strokeWidth:2};
const b={...a,id:'b',x:540};
const link={id:'link',type:'arrow',x:200,y:210,x2:540,y2:210,sourceId:'a',targetId:'b',sourceAnchor:'e',targetAnchor:'w',routing:'orthogonal',stroke:'#334155',strokeWidth:2};
const orthogonal=points=>points.slice(1).every((p,i)=>p.x===points[i].x||p.y===points[i].y);

test('les quatre ports sont sur le bord des rectangles et ellipses et accrochent à proximité',()=>{
  for(const type of ['rect','ellipse']){
    const anchors=anchorsFor({...a,type});assert.equal(anchors.length,4);
    assert.deepEqual(anchors.find(p=>p.side==='e'),{shapeId:'a',side:'e',x:200,y:210});
    assert.equal(findAnchor([{...a,type}],{x:204,y:211},12).side,'e');
    assert.equal(findAnchor([{...a,type}],{x:300,y:300},12),null);
  }
});
test('les coudes contournent un obstacle sans segment diagonal',()=>{
  const obstacle={...a,id:'obstacle',x:310,y:150,width:100,height:140};
  const route=resolveConnectors({elements:[a,b,obstacle,link]}).elements.at(-1).route;
  assert.ok(route.length>=4);assert.ok(orthogonal(route));
  assert.ok(route.slice(1).every((p,i)=>!segmentHitsBox(route[i],p,obstacle)));
});
test('les ancrages et le routage suivent déplacements et redimensionnements sans mutation',()=>{
  const moved=translateElement(a,40,70),resized={...b,width:160,height:180};
  const resolved=resolveConnectors({elements:[moved,resized,link]}).elements.at(-1);
  assert.deepEqual(resolved.route[0],{x:240,y:280});assert.deepEqual(resolved.route.at(-1),{x:540,y:250});
  assert.equal(link.x,200);assert.ok(orthogonal(resolved.route));
});
test('une poignée reconnecte ou détache une extrémité sans toucher l’autre',()=>{
  const detached=attachEndpoint(link,'end',{x:450,y:380},null);
  assert.equal(detached.targetId,undefined);assert.equal(detached.sourceId,'a');assert.equal(detached.x2,450);
  const next=attachEndpoint(detached,'end',{x:10,y:10},anchorsFor(b)[0]);
  assert.equal(next.targetId,'b');assert.equal(next.targetAnchor,'n');
});
test('sauvegarde, suppression et duplication préservent les références des connexions',()=>{
  const doc=createDocument();doc.pages[0].elements=[a,b,link];
  const saved=validateDocument(JSON.parse(JSON.stringify(doc)));assert.equal(saved.pages[0].elements[2].sourceAnchor,'e');
  assert.equal(removeElement(saved,saved.pages[0].id,'a').pages[0].elements.length,1);
  const copies=duplicateSelection([a,b],[a,b,link]);assert.equal(copies[2].sourceId,copies[0].id);assert.equal(copies[2].targetId,copies[1].id);
  doc.pages[0].elements[2]={...link,sourceAnchor:'injection'};assert.throws(()=>validateDocument(doc));
});
test('écran et impression calculent les mêmes coudes, sans imprimer les ports',()=>{
  const page={elements:[a,b,link]};const svg=pageSvg(page);
  assert.match(svg,/connector-path/);assert.doesNotMatch(svg,/data-anchor-shape/);
  assert.match(pageSvg(page,{connectionMode:true}),/data-anchor-shape="a"/);
});
test('deux connexions concurrentes évitent de partager tout leur parcours',()=>{
  const resolved=resolveConnectors({elements:[a,b,link,{...link,id:'second'}]});
  assert.notDeepEqual(resolved.elements[2].route,resolved.elements[3].route);
  assert.ok(orthogonal(resolved.elements[3].route));
});
test('les connexions attachées gardent leurs deux poignées et les routes calculées ne sont pas sauvegardées',()=>{
  const resolved=resolveConnectors({elements:[a,b,link]}).elements[2];
  assert.ok(resolved.route.length);assert.equal(connectorData(resolved).route,undefined);
  const svg=pageSvg({elements:[a,b,link]},{selected:'link'});
  assert.match(svg,/data-resize="start"/);assert.match(svg,/data-resize="end"/);
});
test('une connexion attachée seulement à l’arrivée suit sa cible en conservant son départ libre',()=>{
  const half=attachEndpoint(link,'start',{x:40,y:80},null);
  const resolved=resolveConnectors({elements:[translateElement(b,20,40),half]}).elements[1];
  assert.deepEqual(resolved.route[0],{x:40,y:80});assert.deepEqual(resolved.route.at(-1),{x:560,y:250});
  assert.ok(orthogonal(resolved.route));
});
