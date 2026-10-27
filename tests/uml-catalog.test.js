import test from 'node:test';
import assert from 'node:assert/strict';
import { UML_DIAGRAMS } from '../src/uml-ui.js';
import { createUmlNode, UML_NODE_KINDS } from '../src/uml-nodes.js';
import { createUmlRelation } from '../src/uml-relations.js';
import { createDocument, validateDocument } from '../src/model.js';
import { elementSvg } from '../src/render.js';

test('les quatre palettes exposent des composants valides, sauvegardables et imprimables',()=>{
  assert.equal(Object.keys(UML_DIAGRAMS).length,4);
  const nodes=new Set();
  for(const diagram of Object.values(UML_DIAGRAMS)){
    const elements=[...diagram.nodes.map(kind=>{nodes.add(kind);return createUmlNode(kind);}),...diagram.relations.map(kind=>createUmlRelation({kind}))];
    const doc=createDocument();doc.pages[0].elements=elements;
    const restored=validateDocument(JSON.parse(JSON.stringify(doc)));
    assert.equal(restored.pages[0].elements.length,elements.length);
    for(const element of restored.pages[0].elements)assert.match(elementSvg(element),/<g/);
  }
  assert.deepEqual([...nodes].sort(),[...UML_NODE_KINDS].sort());
});
