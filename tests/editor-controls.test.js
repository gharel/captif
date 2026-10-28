import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleTextFormat, textFormatMarkup, alignmentIcon } from '../src/editor-controls.js';
import { createDocument, updateElement, validateDocument, createHistory, commit, undo } from '../src/model.js';
import { pageSvg } from '../src/render.js';
import { createEntity, updateEntity } from '../src/bdd.js';
import { createUmlNode, updateUmlNode } from '../src/uml-nodes.js';

test('le formatage provisoire ne modifie pas le texte source et peut être désactivé', () => {
  const original = Object.freeze({ bold: false, italic: true, underline: false });
  const next = toggleTextFormat(original, 'bold');
  assert.deepEqual(original, { bold: false, italic: true, underline: false });
  assert.deepEqual(next, { bold: true, italic: true, underline: false });
  assert.deepEqual(toggleTextFormat(next, 'bold'), original);
  assert.throws(() => toggleTextFormat(original, 'script'));
});

test('texte et trois styles survivent à la sauvegarde et se défont en une seule action', () => {
  const doc = createDocument();
  const text = { id: 'formatted', type: 'text', x: 80, y: 110, text: 'Avant', fontSize: 18, stroke: '#334155', strokeWidth: 1 };
  doc.pages[0].elements = [text];
  const patch = { text: 'Après', bold: true, italic: true, underline: true };
  const next = updateElement(doc, doc.pages[0].id, text.id, patch);
  const restored = validateDocument(JSON.parse(JSON.stringify(next)));
  const svg = pageSvg(restored.pages[0]);
  assert.match(svg, /font-weight="700"/);
  assert.match(svg, /font-style="italic"/);
  assert.match(svg, /text-decoration="underline"/);
  assert.equal(undo(commit(createHistory(doc), restored)).present.pages[0].elements[0].text, 'Avant');
  assert.deepEqual(doc.pages[0].elements[0], text);
});

test('les commandes de texte et les huit alignements ont des icônes accessibles distinctes', () => {
  const html = textFormatMarkup({ bold: true, italic: false, underline: true });
  for (const name of ['Gras', 'Italique', 'Souligné']) assert.ok(html.includes(`aria-label="${name}"`));
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 2);
  const modes = ['left','center-x','right','top','center-y','bottom','distribute-x','distribute-y'];
  const icons = modes.map(alignmentIcon);
  assert.equal(new Set(icons).size, modes.length);
  for (const svg of icons) assert.match(svg, /<svg[^>]+aria-hidden="true"/);
});

test('le soulignement reste sur une cellule après reconstruction des compartiments BDD ou UML', () => {
  const table=createEntity();
  const attribute=table.children.find(c=>c.role==='attribute-name');
  attribute.underline=true;
  const updatedTable=updateEntity(table,{name:'Compte'});
  assert.equal(updatedTable.children.find(c=>c.id===attribute.id).underline,true);
  const cls=createUmlNode('class');
  const member=cls.children.find(c=>c.role==='uml-attributes');
  member.underline=true;
  const updatedClass=updateUmlNode(cls,{name:'Compte'});
  assert.equal(updatedClass.children.find(c=>c.id===member.id).underline,true);
});
