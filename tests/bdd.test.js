import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntity, readEntity, updateEntity, createAssociation, readAssociation, updateAssociation, createRelation, readRelation, updateRelation, resolveRelations, CARDINALITIES } from '../src/bdd.js';
import { createDocument, validateDocument, translateElement, removeElement } from '../src/model.js';
import { pageSvg } from '../src/render.js';

test('entité détaillée : attributs distincts, clés et types se conservent après validation', () => {
  const attributes = [{name:'id',type:'INTEGER',key:'PK',nullable:false},{name:'client_id',type:'INTEGER',key:'FK',nullable:false},{name:'note',type:'TEXT',key:'',nullable:true}];
  const entity = createEntity({name:'COMMANDE',attributes});
  const doc = createDocument(); doc.pages[0].elements = [entity];
  const clean = validateDocument(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(readEntity(clean.pages[0].elements[0]), {name:'COMMANDE',attributes});
  assert.equal(entity.children.filter(c=>c.role==='attribute-name').length,3);
  assert.ok(entity.children.some(c=>c.role==='separator' && c.type==='line'));
});

test('édition directe d’un attribut relue sans métadonnée périmée et mise à jour immuable', () => {
  const entity = createEntity({name:'CLIENT',attributes:[{name:'id',type:'INTEGER',key:'PK',nullable:false}]});
  entity.children.find(c=>c.role==='attribute-name').text = 'id_client';
  assert.equal(readEntity(entity).attributes[0].name,'id_client');
  const next = updateEntity(entity,{name:'CONTACT',attributes:[{name:'email',type:'VARCHAR(120)',key:'',nullable:true}]});
  assert.equal(next.id,entity.id); assert.equal(next.x,entity.x); assert.equal(next.y,entity.y);
  assert.equal(readEntity(entity).name,'CLIENT'); assert.equal(readEntity(next).name,'CONTACT');
  assert.throws(()=>createEntity({attributes:Array.from({length:13},()=>({name:'a',type:'INT'}))}));
});

test('association et relation ont un nom et des cardinalités éditables', () => {
  const association = createAssociation({x:70,y:300,name:'PASSE',attributes:[{name:'date',type:'DATE',key:'',nullable:false}]});
  assert.equal(association.label,'Association BDD');
  assert.equal(readAssociation(association).name,'PASSE');
  assert.equal(readAssociation(updateAssociation(association,{name:'ACHÈTE',attributes:[]})).name,'ACHÈTE');
  const relation = createRelation({name:'passer',left:'1,1',right:'0,N'});
  assert.deepEqual(CARDINALITIES,['0,1','1,1','0,N','1,N']);
  assert.equal(readRelation(updateRelation(relation,{left:'0,1',right:'1,N',name:'contient'})).left,'0,1');
  assert.throws(()=>createRelation({left:'4,6'}));
});

test('les relations attachées suivent leurs entités sans modifier la page source', () => {
  const source = createEntity({x:30,y:50,name:'CLIENT'});
  const target = createEntity({x:430,y:350,name:'COMMANDE'});
  const relation = createRelation({sourceId:source.id,targetId:target.id});
  const page = {id:'page',elements:[source,target,relation]};
  const original = structuredClone(page);
  const resolved = resolveRelations(page);
  assert.deepEqual(page,original);
  const line = resolved.elements[2].children.find(c=>c.type==='line');
  assert.ok(line.x > source.x); assert.ok(line.x2 >= target.x);
  const movedPage = {...page,elements:[translateElement(source,0,150),target,relation]};
  const moved = resolveRelations(movedPage).elements[2].children.find(c=>c.type==='line');
  assert.notEqual(moved.y,line.y);
  const missing = resolveRelations({...page,elements:[source,relation]});
  assert.deepEqual(missing.elements[1],relation);
});

test('rendu écran et impression résolvent les mêmes liens et préservent les références JSON', () => {
  const source=createEntity({x:30,y:50}),target=createEntity({x:430,y:350});
  const relation=createRelation({sourceId:source.id,targetId:target.id});
  const doc=createDocument();doc.pages[0].elements=[source,target,relation];
  const clean=validateDocument(JSON.parse(JSON.stringify(doc)));
  assert.equal(readRelation(clean.pages[0].elements[2]).sourceId,source.id);
  const print=pageSvg(clean.pages[0]);
  assert.match(print,/1,1/); assert.match(print,/0,N/);
  assert.match(print,/fill="#fff6d5"/);
  assert.doesNotMatch(print,/selection-outline/);
  const draft=translateElement(source,0,100);
  const screen=pageSvg(clean.pages[0],{draft});
  assert.notEqual(screen,print);
});

test('mise à jour détaillée conserve les identifiants des composants existants', () => {
  const entity=createEntity(); const original=entity.children.find(c=>c.role==='attribute-name');
  const next=updateEntity(entity,{...readEntity(entity),name:'CHANGÉ',x:500,y:500});
  assert.equal(next.x,entity.x); assert.equal(next.y,entity.y);
  assert.equal(next.children.find(c=>c.role==='attribute-name').id,original.id);
  assert.equal(next.children.find(c=>c.role==='attribute-name').rowId,original.rowId);
});

test('supprimer une entité retire ses relations attachées sans affecter les autres objets', () => {
  const source=createEntity(),target=createEntity({x:400,y:400});
  const relation=createRelation({sourceId:source.id,targetId:target.id});
  const free=createRelation(); const doc=createDocument();
  doc.pages[0].elements=[source,target,relation,free];
  const next=removeElement(doc,doc.pages[0].id,source.id);
  assert.deepEqual(next.pages[0].elements.map(e=>e.id),[target.id,free.id]);
  assert.equal(doc.pages[0].elements.length,4);
});

test('import BDD refuse styles et rôles injectés ; relations ne masquent pas les entités au clic', () => {
  const entity=createEntity(); const doc=createDocument();doc.pages[0].elements=[entity];
  entity.children[0].fill='url(x)'; assert.throws(()=>validateDocument(doc));
  entity.children[0].fill='#ffffff'; entity.children[0].role='onclick'; assert.throws(()=>validateDocument(doc));
  const svg=pageSvg({elements:[createRelation()]});
  assert.match(svg,/pointer-events:none/); assert.doesNotMatch(svg,/class="group-hit"/);
});

test('relations courtes : détour en U et libellés séparés suivent les tables', () => {
  const source=createEntity({x:52,y:80,name:'CLIENT'});
  const target=createEntity({x:412,y:80,name:'COMMANDE'});
  const relation=createRelation({sourceId:source.id,targetId:target.id,name:'passe'});
  const page={elements:[source,target,relation]};
  const routed=resolveRelations(page).elements[2];
  const segments=routed.children.filter(c=>c.role==='relation-line');
  assert.equal(segments.length,3);
  assert.equal(segments[0].x,source.x+source.width/2);
  assert.equal(segments[0].y,source.y+source.height);
  assert.equal(segments[1].y,segments[1].y2);
  assert.match(segments[1].id,/-route-mid$/);
  const left=routed.children.find(c=>c.role==='cardinality-left');
  const right=routed.children.find(c=>c.role==='cardinality-right');
  assert.ok(Math.abs(left.x-right.x)>100);
  const moved=resolveRelations({elements:[translateElement(source,0,30),target,relation]}).elements[2];
  assert.equal(moved.children.find(c=>c.role==='relation-line').y,segments[0].y+30);
  assert.equal(resolveRelations({elements:[source,target,routed]}).elements[2].children.filter(c=>c.role==='relation-line').length,3);
  const svg=pageSvg(page);
  assert.match(svg,/class="relation-label-background"/);
});

test('relations courtes près du bas : détour au-dessus des tables', () => {
  const nearBottom=1123-createEntity().height-60;
  const source=createEntity({x:52,y:nearBottom,name:'CLIENT'}),target=createEntity({x:412,y:nearBottom,name:'COMMANDE'});
  const relation=createRelation({sourceId:source.id,targetId:target.id});
  const routed=resolveRelations({elements:[source,target,relation]}).elements[2];
  const segments=routed.children.filter(c=>c.role==='relation-line');
  assert.equal(segments.length,3);
  assert.ok(segments[1].y<source.y);
  assert.ok(segments[1].y>24);
});
