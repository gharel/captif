import test from 'node:test';
import assert from 'node:assert/strict';
import { diagramTextPresentation,diagramSurface,diagramTitleColor,DIAGRAM_COLORS } from '../src/diagram-presentation.js';
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

test('les en-têtes ont un dégradé SVG local, les formes vides restent vides',()=>{
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
  assert.equal(diagramTitleColor(fragment,stereo),'#172033');
  const name=fragment.children.find(c=>c.role==='uml-name');
  assert.equal(diagramTitleColor(fragment,name),name.stroke);
});

test('chaque type coloré a son dégradé lumineux exclusif et son texte lisible sur toute la surface',()=>{
  const luminance=hex=>{
    const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  const seen=new Set();
  for(const [kind,stops] of Object.entries(DIAGRAM_COLORS)){
    assert.equal(stops.length,3);
    for(const stop of stops){assert.match(stop,/^#[a-f0-9]{6}$/);assert.ok(!seen.has(stop),kind);seen.add(stop);}
    const rgb=stops.map(c=>c.slice(1).match(/../g).map(v=>parseInt(v,16)));
    assert.ok(Math.max(...rgb[0].map((v,i)=>Math.abs(v-rgb[1][i])))>=40,`${kind}: transition colorée`);
    const foreground=luminance('#172033');
    for(let i=0;i<=40;i++){
      const segment=i<20?0:1,t=(i-segment*20)/20;
      const hex='#'+rgb[segment].map((v,k)=>Math.round(v+(rgb[segment+1][k]-v)*t).toString(16).padStart(2,'0')).join('');
      assert.ok((luminance(hex)+.05)/(foreground+.05)>=4.5,`${kind}: contraste à ${i*2.5}%`);
    }
  }
  assert.ok(Object.keys(DIAGRAM_COLORS).length>=9);
  const groups=[emptyBdd('entity'),emptyBdd('association'),...['class','abstract-class','interface','object','participant','usecase','fragment'].map(kind=>emptyUml(kind))];
  const rendered=groups.map(group=>group.children.map(child=>diagramSurface(group,child)).find(Boolean));
  assert.ok(rendered.every(Boolean));
  assert.equal(new Set(rendered.map(stops=>stops.join(':'))).size,groups.length);
  const group=emptyBdd('entity'),title=group.children.find(c=>c.role==='box-title');
  assert.equal(diagramTitleColor(group,title),'#172033');
  assert.match(elementSvg(group),/x1="0%" y1="35%" x2="100%" y2="65%"/);
  assert.match(elementSvg(group),/<stop offset="50%"/);
});

test('les types principaux conservent des dominantes distinctes',()=>{
  const hsv=hex=>{
    const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    return ((max===r?(g-b)/delta:max===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
  };
  const expected={entity:[135,165],association:[210,230],class:[265,285],object:[20,40],usecase:[325,345],participant:[0,15],fragment:[40,55],'abstract-class':[175,195]};
  for(const [kind,[min,max]] of Object.entries(expected)){
    const hue=hsv(DIAGRAM_COLORS[kind][1]);assert.ok(hue>=min&&hue<=max,`${kind}: ${hue}`);
  }
});
