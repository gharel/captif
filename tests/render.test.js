import test from 'node:test';
import assert from 'node:assert/strict';
import { createUmlNode } from '../src/uml-nodes.js';
import { pageSvg, elementSvg } from '../src/render.js';

test('le nom de l’acteur reste centré sur sa silhouette à l’écran et à l’impression', () => {
  const actor=createUmlNode('actor',{x:110,y:90,name:'Responsable des inscriptions'}),before=structuredClone(actor);
  const center=actor.x+actor.width/2;
  for(const options of [{},{editHints:true}]){
    const svg=pageSvg({elements:[actor]},options);
    assert.match(svg,new RegExp(`<text x="${center}"[^>]+text-anchor="middle"`));
  }
  assert.deepEqual(actor,before);
});

const group = {
  id: 'uml', type: 'group', label: 'Classe UML', x: 50, y: 60, width: 220, height: 160, stroke: '#263833', strokeWidth: 2,
  children: [
    { id: 'frame', type: 'rect', x: 50, y: 60, width: 220, height: 160, stroke: '#263833', strokeWidth: 2 },
    { id: 'text', type: 'text', x: 66, y: 90, text: '<Client>\n- id : int', fontSize: 16, stroke: '#263833', strokeWidth: 2 },
  ],
};

test('SVG : un groupe conserve ses enfants et sa surface de sélection', () => {
  const svg = elementSvg(group);
  assert.match(svg, /data-group="uml"/);
  assert.match(svg, /class="group-hit"/);
  assert.match(svg, /data-element="frame"/);
  assert.match(svg, /data-element="text"/);
  assert.match(svg, /&lt;Client&gt;/);
  assert.doesNotMatch(svg, /<Client>/);
});

test('SVG : sélection et isolation ont des cadres dédiés et le contenu imprimable reste intact', () => {
  const svg = pageSvg({ elements: [group] }, { selected: 'text', editingGroup: 'uml' });
  assert.match(svg, /class="selection-outline"/);
  assert.match(svg, /class="group-isolation-outline"/);
  assert.match(svg, /pointer-events="none"/);
  const print = pageSvg({ elements: [group] });
  assert.doesNotMatch(print, /selection-outline|group-isolation-outline/);
  assert.match(print, /stroke="#263833"/);
});

test('SVG : le déplacement provisoire d’un enfant remplace son rendu dans le groupe', () => {
  const svg = pageSvg({ elements: [group] }, { draft: { ...group.children[1], x: 100, text: 'Déplacé' } });
  assert.equal((svg.match(/data-element="text"/g) || []).length, 1);
  assert.match(svg, /Déplacé/);
  assert.doesNotMatch(svg, /&lt;Client&gt;/);
});

test('SVG : une cellule vide ne crée pas de texte fantôme à l’origine de la feuille', () => {
  const svg = elementSvg({ ...group.children[1], text: '', x: 400, y: 300 });
  assert.doesNotMatch(svg, /<text /);
  assert.match(svg, /class="text-hit" x="400"/);
});
