import test from 'node:test';
import assert from 'node:assert/strict';
import { gradientTextColor } from '../src/gradient-contrast.js';
import { DIAGRAM_COLORS,diagramTitleColor } from '../src/diagram-presentation.js';
import { emptyUml,emptyBdd } from '../src/diagram-inline.js';

const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
test('chaque palette conserve au moins 4,5:1 pour le texte corrigé sur toute la transition',()=>{
  for(const stops of Object.values(DIAGRAM_COLORS)){
    const color=gradientTextColor(stops,'#888c94'),foreground=luminance(rgb(color));
    for(let segment=0;segment<stops.length-1;segment++)for(let i=0;i<=1000;i++){
      const a=rgb(stops[segment]),b=rgb(stops[segment+1]);
      const background=luminance(a.map((v,k)=>v+(b[k]-v)*i/1000));
      assert.ok((Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05)>=4.5,color);
    }
  }
});
test('le calcul garde une couleur suffisante ou choisit noir et blanc selon le fond',()=>{
  assert.equal(gradientTextColor(['#fafafa','#ffffff'],'#222222'),'#222222');
  assert.equal(gradientTextColor(['#fafafa','#ffffff'],'#eeeeee'),'#000000');
  assert.equal(gradientTextColor(['#111111','#222222'],'#222222'),'#ffffff');
});
test('seuls les textes sur les surfaces dégradées changent sans modifier le groupe',()=>{
  const group=emptyUml('class');group.stroke='#888c94';const before=structuredClone(group);
  assert.equal(diagramTitleColor(group,group.children.find(c=>c.role==='uml-name')),'#000000');
  assert.equal(diagramTitleColor(group,group.children.find(c=>c.role==='uml-attributes')),group.stroke);
  assert.deepEqual(group,before);
  const association=emptyBdd('association');association.stroke='#888c94';
  assert.equal(diagramTitleColor(association,association.children.find(c=>c.type==='text')),'#000000');
});
