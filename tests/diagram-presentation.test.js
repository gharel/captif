import test from 'node:test';
import assert from 'node:assert/strict';
import { diagramTextPresentation,darkDiagramTitle } from '../src/diagram-presentation.js';
import { emptyBdd,emptyUml } from '../src/diagram-inline.js';
import { elementSvg } from '../src/render.js';
import { directTextPlacement } from '../src/direct-editing.js';

test('association : zone pleine largeur centrée, identique à la saisie et sans mutation',()=>{
  const group=emptyBdd('association'),text=group.children.find(c=>c.role==='association-name');
  text.text='Associer';
  const before=JSON.stringify(group),p=diagramTextPresentation(text,group);
  assert.equal(p.x,group.x+12);assert.equal(p.width,group.width-24);
  assert.equal(p._centerX,group.x+group.width/2);
  const edit=directTextPlacement(text,group);
  assert.equal(edit.left,p.x);assert.equal(edit.width,p.width);assert.equal(edit.align,'center');
  assert.match(elementSvg(group),/text-anchor="middle"/);
  assert.equal(JSON.stringify(group),before);
});

test('tous les noms UML sont centrés, les corps et le code restent libres',()=>{
  for(const kind of ['class','object','actor','usecase','action','state','component','artifact','process','database','swimlane']){
    const group=emptyUml(kind),text=group.children.find(c=>c.role==='uml-name');
    assert.ok(diagramTextPresentation(text,group)._centerX!==undefined,kind);
    assert.equal(directTextPlacement(text,group).align,'center',kind);
    for(const body of group.children.filter(c=>['uml-attributes','code-content'].includes(c.role)))assert.equal(diagramTextPresentation(body,group)._centerX,undefined);
  }
});

test('les en-têtes ont un dégradé SVG local et un titre clair, les formes vides restent vides',()=>{
  for(const group of [emptyBdd('entity'),emptyBdd('association'),emptyUml('class'),emptyUml('object'),emptyUml('participant'),emptyUml('usecase')]){
    const html=elementSvg(group);
    assert.match(html,/<linearGradient/);assert.match(html,/fill="url\(#/);
    assert.doesNotMatch(html,/>Nom<|>Ajouter/);
  }
});

test('les onglets de paquetage et fragment gardent leur zone propre et leur contraste',()=>{
  const pkg=emptyUml('package'),title=pkg.children.find(c=>c.role==='uml-name');
  const p=diagramTextPresentation(title,pkg),tab=pkg.children.find(c=>c.type==='rect'&&c.y===pkg.y);
  assert.equal(p.width,tab.width-24);
  const fragment=emptyUml('fragment'),stereo=fragment.children.find(c=>c.role==='uml-stereotype');
  assert.equal(diagramTextPresentation(stereo,fragment).x,stereo.x);
  assert.equal(darkDiagramTitle(fragment,stereo),true);
  assert.equal(darkDiagramTitle(fragment,fragment.children.find(c=>c.role==='uml-name')),false);
});
