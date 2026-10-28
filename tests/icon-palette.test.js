import test from 'node:test';
import assert from 'node:assert/strict';
import { umlPaletteMarkup,PALETTE_NODE_KINDS } from '../src/uml-ui.js';
import { UML_RELATION_KINDS } from '../src/uml-relations.js';
import { DIAGRAM_GROUPS } from '../src/palette-groups.js';

test('la palette expose toutes les formes et connexions par famille sans menu sélecteur', () => {
  const html = umlPaletteMarkup();
  assert.doesNotMatch(html, /<select|role="tablist"|role="tab"/);
  for(const group of DIAGRAM_GROUPS){assert.ok(html.includes(`data-diagram-family="${group.id}"`));assert.ok(html.includes(group.label));}
  for (const kind of PALETTE_NODE_KINDS) assert.ok(html.includes(`data-uml-node="${kind}"`), kind);
  for(const kind of ['abstract-class','interface'])assert.ok(!html.includes(`data-uml-node="${kind}"`));
  for (const kind of UML_RELATION_KINDS) assert.ok(html.includes(`data-uml-relation="${kind}"`), kind);
  for (const id of ['entity', 'association', 'relation']) assert.ok(html.includes(`id="${id}"`), id);
});

test('chaque bouton de forme possède un nom accessible et une infobulle, sans texte visible', () => {
  const html = umlPaletteMarkup();
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.equal(buttons.length,DIAGRAM_GROUPS.reduce((sum,g)=>sum+g.nodes.length+g.relations.length,0));
  for (const [, attrs, content] of buttons) {
    assert.match(attrs, /aria-label="[^"]+"/);
    assert.match(attrs, /title="[^"]+"/);
    assert.match(content, /<svg/);
    assert.doesNotMatch(content, /<text|<strong|<small/);
    assert.equal(content.replace(/<[^>]+>/g, '').trim(), '');
  }
});

test('les groupes associent les composants attendus sans perdre le catalogue',()=>{
  const groups=new Map(DIAGRAM_GROUPS.map(g=>[g.id,g]));
  for(const id of ['data','classes','objects','usecases','sequence','states','activity','components','process','annotations'])assert.ok(groups.has(id));
  assert.ok(groups.get('data').nodes.includes('entity'));assert.ok(groups.get('data').relations.includes('erd-one-many'));
  assert.ok(groups.get('sequence').nodes.includes('participant'));assert.ok(groups.get('sequence').relations.includes('message-async'));
  assert.ok(groups.get('usecases').relations.includes('include'));assert.ok(groups.get('annotations').nodes.includes('code-block'));
  const union=new Set(DIAGRAM_GROUPS.flatMap(g=>[...g.nodes.map(k=>`node:${k}`),...g.relations.map(k=>`relation:${k}`)]));
  assert.equal(union.size,PALETTE_NODE_KINDS.length+UML_RELATION_KINDS.length+4);
});

test('Annotations arrive en premier et MCD / MLD conserve seulement ses deux formes simples',()=>{
  assert.equal(DIAGRAM_GROUPS[0].id,'annotations');
  const data=DIAGRAM_GROUPS.find(g=>g.id==='data');
  assert.deepEqual(data.nodes,['entity','bdd-association']);
  const html=umlPaletteMarkup();
  assert.ok(html.indexOf('data-diagram-family="annotations"')<html.indexOf('data-diagram-family="data"'));
  for(const kind of ['weak-entity','identifying-relationship'])assert.ok(!html.includes(`data-uml-node="${kind}"`));
  assert.ok(DIAGRAM_GROUPS.find(g=>g.id==='components').nodes.includes('database'));
});

test('la note et les boîtes à compartiments sont identifiables par leur description de forme', () => {
  const html = umlPaletteMarkup();
  assert.match(html, /aria-label="Note[^"]*"/);
  assert.match(html, /aria-label="Entité"/);
  assert.match(html, /aria-label="Classe"/);
  assert.match(html, /aria-label="Objet \/ instance"/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});
