import test from 'node:test';
import assert from 'node:assert/strict';
import { createUmlRelation, readUmlRelation, updateUmlRelation, resolveUmlRelations, UML_RELATION_KINDS } from '../src/uml-relations.js';
import { createEntityBox } from '../src/entity-box.js';
import { createDocument, validateDocument, translateElement } from '../src/model.js';
import { resolveDiagramConnections,editableConnector } from '../src/diagram-connections.js';
import { emptyUml } from '../src/diagram-inline.js';

const kinds=['erd-one-one','erd-one-many','erd-zero-one','erd-zero-many','erd-many-many'];

test('une icône ERD relie les deux entités sélectionnées sans ajouter de texte',()=>{
  const a=createEntityBox(),b=createEntityBox(),c=createEntityBox();
  const link=emptyUml('erd-one-many',{relation:true,elements:[a,b,c],preferred:[b.id,c.id]});
  assert.equal(link.sourceId,b.id);assert.equal(link.targetId,c.id);assert.equal(readUmlRelation(link).name,'');
});

test('le routage orthogonal garde chaque marqueur ERD près de son extrémité après déplacement',()=>{
  const a=createEntityBox(),b=translateElement(createEntityBox(),360,340);
  const relation=createUmlRelation({kind:'erd-zero-many',sourceId:a.id,targetId:b.id});
  for(const source of [a,translateElement(a,0,140)]){
    const raw={elements:[source,b,relation]},before=structuredClone(raw);
    const routed=resolveDiagramConnections(resolveUmlRelations(raw)).elements[2],wire=editableConnector(routed);
    for(const marker of routed.children.filter(c=>c.role==='uml-marker')){
      const end=marker.rowId==='source'?wire.route[0]:wire.route.at(-1);
      const points=marker.type==='ellipse'?[{x:marker.x+marker.width/2,y:marker.y+marker.height/2}]:marker.points;
      assert.ok(points.every(p=>Math.hypot(p.x-end.x,p.y-end.y)<35),marker.rowId);
    }
    assert.deepEqual(raw,before);
  }
});

test('les variantes ERD portent des marqueurs aux deux bouts sans cardinalités textuelles fournies', () => {
  for(const kind of kinds){
    assert.ok(UML_RELATION_KINDS.includes(kind),kind);
    const relation=createUmlRelation({kind});
    const markers=relation.children.filter(c=>c.role==='uml-marker');
    assert.ok(markers.some(c=>c.rowId==='source'),kind);
    assert.ok(markers.some(c=>c.rowId==='target'),kind);
    assert.ok(markers.every(c=>['pen','ellipse'].includes(c.type)));
    assert.ok(relation.children.filter(c=>c.type==='text').every(c=>c.text===''));
    assert.equal(readUmlRelation(relation).name,'');
  }
});

test('les cercles facultatifs et les pattes d’oie restent graphiquement distincts', () => {
  const markers=kind=>createUmlRelation({kind}).children.filter(c=>c.role==='uml-marker'&&c.rowId==='target');
  assert.equal(markers('erd-one-one').filter(c=>c.type==='ellipse').length,0);
  for(const kind of ['erd-zero-one','erd-zero-many'])assert.equal(markers(kind).filter(c=>c.type==='ellipse').length,1);
  for(const kind of ['erd-one-many','erd-zero-many','erd-many-many'])assert.ok(markers(kind).some(c=>c.points?.length>=5),kind);
  assert.ok(!markers('erd-one-one').some(c=>c.points?.length>=5));
});

test('les liens ERD suivent leurs entités sans mutation et conservent leurs marqueurs après reprise', () => {
  const a=createEntityBox(),b=translateElement(createEntityBox(),340,270);
  const relation=createUmlRelation({kind:'erd-zero-many',sourceId:a.id,targetId:b.id});
  const page={elements:[a,b,relation]},before=structuredClone(page);
  const first=resolveUmlRelations(page).elements[2];
  const moved=resolveUmlRelations({elements:[translateElement(a,30,50),b,relation]}).elements[2];
  assert.deepEqual(page,before);
  assert.notDeepEqual(moved.children.find(c=>c.rowId==='source').points,first.children.find(c=>c.rowId==='source').points);
  const edited=updateUmlRelation(relation,{name:'lien libre'});
  assert.equal(edited.id,relation.id);
  const doc=createDocument();doc.pages[0].elements=[a,b,edited];
  const saved=validateDocument(JSON.parse(JSON.stringify(doc))).pages[0].elements[2];
  assert.equal(readUmlRelation(saved).name,'lien libre');
  assert.ok(saved.children.some(c=>c.rowId==='source'));
  assert.ok(saved.children.some(c=>c.rowId==='target'));
});
