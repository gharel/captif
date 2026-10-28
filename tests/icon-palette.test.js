import test from 'node:test';
import assert from 'node:assert/strict';
import { umlPaletteMarkup } from '../src/uml-ui.js';
import { UML_NODE_KINDS } from '../src/uml-nodes.js';
import { UML_RELATION_KINDS } from '../src/uml-relations.js';

test('la palette expose toutes les formes et connexions sans filtre ni sélecteur', () => {
  const html = umlPaletteMarkup();
  assert.doesNotMatch(html, /<select|role="tablist"|role="tab"|<details/);
  for (const kind of UML_NODE_KINDS) assert.ok(html.includes(`data-uml-node="${kind}"`), kind);
  for (const kind of UML_RELATION_KINDS) assert.ok(html.includes(`data-uml-relation="${kind}"`), kind);
  for (const id of ['entity', 'association', 'relation']) assert.ok(html.includes(`id="${id}"`), id);
});

test('chaque bouton de forme possède un nom accessible et une infobulle, sans texte visible', () => {
  const html = umlPaletteMarkup();
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.equal(buttons.length, UML_NODE_KINDS.length + UML_RELATION_KINDS.length + 3);
  for (const [, attrs, content] of buttons) {
    assert.match(attrs, /aria-label="[^"]+"/);
    assert.match(attrs, /title="[^"]+"/);
    assert.match(content, /<svg/);
    assert.doesNotMatch(content, /<text|<strong|<small/);
    assert.equal(content.replace(/<[^>]+>/g, '').trim(), '');
  }
});

test('la note et les boîtes à compartiments sont identifiables par leur description de forme', () => {
  const html = umlPaletteMarkup();
  assert.match(html, /aria-label="Note[^"]*"/);
  assert.match(html, /aria-label="Entité \/ table — MCD \/ MLD"/);
  assert.match(html, /aria-label="Classe"/);
  assert.match(html, /aria-label="Objet \/ instance"/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});
