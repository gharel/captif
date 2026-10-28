import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyBdd, diagramActions } from '../src/diagram-inline.js';
import { readEntityBox, updateEntityBox } from '../src/entity-box.js';
import { createDocument, validateDocument } from '../src/model.js';
import { pageSvg } from '../src/render.js';
import { createEntity, readEntity } from '../src/bdd.js';

test('une nouvelle entité ne contient que deux champs libres vides et aucune indication', () => {
  const box=emptyBdd('entity');
  assert.deepEqual(readEntityBox(box), { title:'', body:'' });
  assert.deepEqual(box.children.filter(c=>c.type==='text').map(c=>c.role), ['box-title','box-body']);
  assert.deepEqual(diagramActions(box), []);
  const svg=pageSvg({elements:[box]}, {editHints:true});
  assert.doesNotMatch(svg, /Nom de|attribut|PK|FK|NULL|NN|diagram-placeholder/);
});

test('la saisie libre multiligne et sa mise en forme survivent à la reprise JSON', () => {
  const box=emptyBdd('entity'), before=structuredClone(box);
  const body=box.children.find(c=>c.role==='box-body');
  body.text='id : entier\nnom : texte\nune information libre';
  body.bold=true;body.italic=true;body.underline=true;
  const changed=updateEntityBox(box),doc=createDocument();doc.pages[0].elements=[changed];
  const saved=validateDocument(JSON.parse(JSON.stringify(doc))).pages[0].elements[0];
  assert.equal(readEntityBox(saved).body, body.text);
  assert.equal(saved.children.find(c=>c.id===body.id).underline,true);
  assert.equal(changed.id,box.id);
  assert.equal(before.children.find(c=>c.role==='box-body').text,'');
  const print=pageSvg({elements:[saved]});
  assert.match(print,/une information libre/);
  assert.doesNotMatch(print,/data-diagram-action|diagram-placeholder/);
});

test('une ancienne entité structurée conserve ses clés et ses attributs', () => {
  const legacy=createEntity();const doc=createDocument();doc.pages[0].elements=[legacy];
  assert.deepEqual(readEntity(validateDocument(doc).pages[0].elements[0]),readEntity(legacy));
});
