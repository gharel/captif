import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyBdd,emptyUml,editDiagramRows } from '../src/diagram-inline.js';
import { readEntity,createEntity } from '../src/bdd.js';
import { readEntityBox } from '../src/entity-box.js';
import { readUmlNode } from '../src/uml-nodes.js';
import { createDocument,validateDocument } from '../src/model.js';
import { pageSvg } from '../src/render.js';
import { editableConnector,resolveDiagramConnections } from '../src/diagram-connections.js';
import { moveBend } from '../src/connectors.js';
import { resolveRelations,createRelation } from '../src/bdd.js';
import { translateElement } from '../src/geometry.js';

test('un clic de palette crée une entité vide à contenu libre',()=>{
  const entity=emptyBdd('entity');assert.deepEqual(readEntityBox(entity),{title:'',body:''});
  assert.ok(entity.children.some(c=>c.role==='box-body'));
});
test('les composants UML vides ne contiennent pas de données d’exemple',()=>{
  for(const kind of ['class','abstract-class','interface','object','actor','usecase','participant','note']){
    const node=emptyUml(kind);const value=readUmlNode(node);
    assert.equal(value.name,'',kind);assert.deepEqual(value.attributes,[],kind);assert.deepEqual(value.operations,[],kind);
  }
});
test('ajouter et retirer une ligne BDD conserve le groupe et ses champs existants',()=>{
  const initial=createEntity({attributes:[{name:'',type:'',key:'',nullable:false}]}),added=editDiagramRows(initial,'add-attribute');
  assert.equal(added.id,initial.id);assert.equal(readEntity(added).attributes.length,2);
  const rowId=added.children.filter(c=>c.role==='attribute-name')[1].rowId;
  const removed=editDiagramRows(added,'remove-row',rowId);assert.equal(readEntity(removed).attributes.length,1);
});
test('les nouveaux champs libres restent vides à l’écran comme à l’impression',()=>{
  const group=emptyBdd('entity'),doc=createDocument();doc.pages[0].elements=[group];
  const saved=validateDocument(doc);assert.equal(readEntityBox(saved.pages[0].elements[0]).title,'');
  assert.doesNotMatch(pageSvg(doc.pages[0],{editHints:true}),/Nom de l’entité/);
  assert.doesNotMatch(pageSvg(doc.pages[0]),/Nom de l’entité/);
});
test('les passages manuels des relations BDD survivent à la sauvegarde et à la reprise',()=>{
  const a=emptyBdd('entity'),b=translateElement(emptyBdd('entity'),0,350);
  const relation=createRelation({sourceId:a.id,targetId:b.id,name:'inscrire'});
  const page={elements:[a,b,relation]},first=resolveDiagramConnections(resolveRelations(page)),wire=editableConnector(first.elements[2]);
  const changed=moveBend(wire,0,{x:450,y:250});
  const doc=createDocument();doc.pages[0].elements=[a,b,{...relation,waypoints:changed.waypoints,sourceAnchor:'e',targetAnchor:'w'}];
  const restored=validateDocument(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(restored.pages[0].elements[2].waypoints,changed.waypoints);
  assert.equal(restored.pages[0].elements[2].sourceAnchor,'e');
  assert.doesNotMatch(pageSvg(restored.pages[0]),/data-bend-index/);
  assert.match(pageSvg(restored.pages[0],{selected:relation.id}),/data-bend-index/);
});
test('les extrémités libres des relations se déplacent avec leur groupe',()=>{
  const relation={...emptyBdd('relation'),startPoint:{x:80,y:100},endPoint:{x:400,y:200},waypoints:[{x:200,y:100}]};
  const moved=translateElement(relation,20,30);
  assert.deepEqual(moved.startPoint,{x:100,y:130});assert.deepEqual(moved.waypoints,[{x:220,y:130}]);
  const doc=createDocument();doc.pages[0].elements=[moved];assert.deepEqual(validateDocument(doc).pages[0].elements[0].endPoint,{x:420,y:230});
});
