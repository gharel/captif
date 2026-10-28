import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyUml, diagramPlaceholder } from '../src/diagram-inline.js';
import { pageSvg, elementSvg } from '../src/render.js';

test('les différentes formes vides restent sans indication de texte à l’écran et à l’impression', () => {
  for(const kind of ['class','object','actor','usecase','system','participant','note','state','action','package','swimlane']){
    const shape=emptyUml(kind),before=structuredClone(shape);
    for(const editHints of [true,false]){
      const svg=pageSvg({elements:[shape]},{editHints});
      assert.doesNotMatch(svg,/Nom|Ajouter des attributs|Ajouter des méthodes|diagram-placeholder/,kind);
    }
    assert.deepEqual(shape,before);
    for(const field of shape.children.filter(c=>c.type==='text'))assert.equal(diagramPlaceholder(field),'');
  }
});

test('les trois compartiments vides d’une classe conservent de larges cibles cliquables', () => {
  const shape=emptyUml('class'),svg=elementSvg(shape,false,true);
  for(const role of ['uml-name','uml-attributes','uml-operations']){
    const field=shape.children.find(c=>c.role===role);
    const group=svg.split(`data-element="${field.id}"`)[1].split('</g>')[0];
    const hit=group.match(/class="text-hit"[^>]+width="([\d.]+)"[^>]+height="([\d.]+)"/);
    assert.ok(hit,role);assert.ok(Number(hit[1])>=shape.width-32,role);assert.ok(Number(hit[2])>=14,role);
  }
});

test('un texte saisi identique à une ancienne indication est conservé', () => {
  const shape=emptyUml('class');
  shape.children.find(c=>c.role==='uml-name').text='Nom';
  shape.children.find(c=>c.role==='uml-attributes').text='Ajouter des attributs';
  const svg=pageSvg({elements:[shape]},{editHints:true});
  assert.match(svg,/>Nom<\/tspan>/);
  assert.match(svg,/>Ajouter des attributs<\/tspan>/);
});
