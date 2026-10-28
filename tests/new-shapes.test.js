import test from 'node:test';
import assert from 'node:assert/strict';
import { createUmlNode, readUmlNode, updateUmlNode, UML_NODE_KINDS } from '../src/uml-nodes.js';
import { createDocument, validateDocument } from '../src/model.js';
import { elementBounds } from '../src/geometry.js';
import { elementSvg } from '../src/render.js';

const kinds=['deployment-node','port','provided-interface','required-interface','entry-point','exit-point','terminate','junction','send-signal','receive-signal','time-event','data-object','process','subprocess','input-output','document','manual-input','preparation','weak-entity','identifying-relationship'];

test('les formes complémentaires sont vides, groupées et restent sur la feuille',()=>{
  for(const kind of kinds){
    assert.ok(UML_NODE_KINDS.includes(kind),kind);
    const node=createUmlNode(kind,{name:'',attributes:[],operations:[],x:750,y:1100});
    assert.equal(readUmlNode(node).name,'',kind);
    assert.ok(node.children.every(c=>c.type!=='text'||c.text===''),kind);
    const b=elementBounds(node);
    assert.ok(b.x>=24&&b.y>=36,kind);
    assert.ok(b.x+b.width<=770.001&&b.y+b.height<=1099.001,kind);
    const doc=createDocument();doc.pages[0].elements=[node];
    const restored=validateDocument(JSON.parse(JSON.stringify(doc))).pages[0].elements[0];
    assert.equal(restored.umlKind,kind);
    assert.match(elementSvg(restored),/<g/);
  }
});

test('les formes complémentaires acceptent un texte libre sans mutation ni changement d’identité',()=>{
  for(const kind of kinds){
    const node=createUmlNode(kind,{name:'',attributes:[],operations:[]}),before=structuredClone(node);
    const next=updateUmlNode(node,{name:'Information libre'});
    assert.deepEqual(node,before,kind);
    assert.equal(next.id,node.id,kind);
    assert.equal(readUmlNode(next).name,'Information libre',kind);
    const title=node.children.find(c=>c.role==='uml-name');
    if(title)assert.equal(next.children.find(c=>c.role==='uml-name').id,title.id,kind);
  }
});

test('les silhouettes portent les éléments graphiques propres à leur notation',()=>{
  const make=kind=>createUmlNode(kind,{name:''});
  assert.equal(make('weak-entity').children.filter(c=>c.type==='rect').length,2);
  assert.equal(make('identifying-relationship').children.filter(c=>c.type==='pen').length,2);
  assert.ok(make('deployment-node').children.filter(c=>c.type==='line').length>=3);
  const socket=make('required-interface').children.find(c=>c.type==='pen');
  assert.ok(socket.points.length>=9);
  assert.notDeepEqual(make('send-signal').children.find(c=>c.type==='pen').points,make('receive-signal').children.find(c=>c.type==='pen').points);
  const document=make('document').children.find(c=>c.type==='pen');
  assert.ok(document.points.length>7);
});
