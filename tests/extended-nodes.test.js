import test from 'node:test';
import assert from 'node:assert/strict';
import { createUmlNode, readUmlNode, updateUmlNode, UML_NODE_KINDS } from '../src/uml-nodes.js';
import { elementBounds } from '../src/geometry.js';

const kinds=['package','state','action','initial','final','flow-final','decision','fork','join','history','deep-history','swimlane','component','artifact','database'];

test('les formes d’état, d’activité et de structure sont des groupes vides bornés',()=>{
  for(const kind of kinds){
    assert.ok(UML_NODE_KINDS.includes(kind),kind);
    const node=createUmlNode(kind,{name:'',attributes:[],operations:[],x:740,y:1080});
    assert.equal(node.label,'Élément UML');
    assert.equal(readUmlNode(node).name,'');
    assert.ok(node.children.length>0,kind);
    assert.ok(node.children.every(c=>['rect','ellipse','line','pen','text'].includes(c.type)),kind);
    const bounds=elementBounds(node);
    assert.ok(bounds.x>=24&&bounds.y>=24,kind);
    assert.ok(bounds.x+bounds.width<=770.01&&bounds.y+bounds.height<=1099.01,kind);
  }
});

test('les nouveaux groupes restent éditables sans mutation et conservent leurs identifiants',()=>{
  for(const kind of kinds){
    const node=createUmlNode(kind,{name:'',attributes:[],operations:[]});
    const snapshot=structuredClone(node);
    const next=updateUmlNode(node,{name:'Nom'});
    assert.equal(next.id,node.id,kind);
    assert.equal(readUmlNode(next).name,'Nom',kind);
    assert.deepEqual(node,snapshot,kind);
    const originalTitle=node.children.find(c=>c.role==='uml-name');
    if(originalTitle)assert.equal(next.children.find(c=>c.role==='uml-name').id,originalTitle.id,kind);
  }
});

test('paquetage, losange et marqueurs de début et fin ont des silhouettes distinctes',()=>{
  const pkg=createUmlNode('package',{name:''});
  assert.ok(pkg.children.filter(c=>c.type==='rect').length>=2);
  const diamond=createUmlNode('decision',{name:''});
  const polygon=diamond.children.find(c=>c.type==='pen');
  assert.equal(polygon.points.length,5);
  assert.deepEqual(polygon.points[0],polygon.points.at(-1));
  const start=createUmlNode('initial',{name:''}),end=createUmlNode('final',{name:''}),flowEnd=createUmlNode('flow-final',{name:''});
  assert.equal(start.children.filter(c=>c.type==='ellipse').length,1);
  assert.equal(end.children.filter(c=>c.type==='ellipse').length,2);
  assert.ok(flowEnd.children.filter(c=>c.type==='line').length>=2);
  assert.notEqual(createUmlNode('fork',{name:''}).width,createUmlNode('join',{name:''}).width);
});
