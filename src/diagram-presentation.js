import { textLines } from './geometry.js';
import { gradientTextColor } from './gradient-contrast.js';
const INTERNAL_LABELS=new Set(['usecase','action','decision','component','artifact','database','deployment-node','data-object','identifying-relationship','process','subprocess','input-output','document','manual-input','preparation','weak-entity','send-signal','receive-signal']);
// Exclusive color transitions inspired by the supplied gradient reference.
export const DIAGRAM_COLORS=Object.freeze(Object.fromEntries(Object.entries({
  entity:['#b6e9a0','#68ca94','#35a780'],
  association:['#b6d5ff','#75a6f3','#6b8ede'],
  class:['#d7b7f0','#ae80d5','#9c7dcb'],
  'abstract-class':['#a1eeee','#57cbd5','#32a6be'],
  interface:['#ced6de','#9ba8b8','#8392a7'],
  object:['#ffda8a','#ffac63','#ed8358'],
  participant:['#ffc6b5','#ef8d83','#d8626d'],
  usecase:['#ffbfd6','#ef88b7','#d571a6'],
  fragment:['#fff0a0','#f4d26f','#dbb44a'],
}).map(([kind,stops])=>[kind,Object.freeze(stops)])));

/** Display-only geometry shared by SVG and direct editing. Never changes the copy. */
export function diagramTextPresentation(text,parent){
  if(!parent||text?.type!=='text')return text;
  const title=['box-title','entity-name','association-name','uml-name'].includes(text.role);
  const stereotype=text.role==='uml-stereotype'&&parent.umlKind!=='fragment';
  if(!title&&!stereotype)return text;
  let x=parent.x+12,width=parent.width-24;
  if(parent.umlKind==='fragment'){x=parent.x+70;width=parent.width-82;}
  if(parent.umlKind==='package')width=(parent.children.find(c=>c.type==='rect'&&c.y===parent.y)?.width||parent.width)-24;
  const next={...text,x,width:Math.max(12,width),_centerX:x+Math.max(12,width)/2};
  const loneState=parent.umlKind==='state'&&!parent.children.some(c=>c.role==='uml-attributes');
  const association=parent.label==='Association BDD'&&!parent.children.some(c=>c.role==='attribute-name');
  if(INTERNAL_LABELS.has(parent.umlKind)||loneState||association){
    const lines=textLines(next).length,size=text.fontSize||18;
    next.y=parent.y+parent.height/2+size*.35-(lines-1)*size*.75;
  }
  return next;
}

export function diagramSurface(group,child){
  if(child.role==='header')return DIAGRAM_COLORS.entity;
  if(group.label==='Association BDD'&&child.type==='ellipse')return DIAGRAM_COLORS.association;
  if(child.type==='rect'&&child.role==='uml-decoration'&&child.fill!=='none')return DIAGRAM_COLORS[group.umlKind]||null;
  if(group.umlKind==='participant'&&child.role==='uml-frame')return DIAGRAM_COLORS.participant;
  if(group.umlKind==='usecase'&&child.type==='ellipse')return DIAGRAM_COLORS.usecase;
  return null;
}

export function diagramTitleColor(group,child){
  if(child.type!=='text'||group.label==='Bloc de code')return child.stroke||'#263246';
  const color=group.stroke||child.stroke||'#888c94',text=diagramTextPresentation(child,group);
  const x=text._centerX??text.x,y=text.y-(text.fontSize||18)*.35;
  const surface=group.children.find(shape=>diagramSurface(group,shape)&&x>=shape.x&&x<=shape.x+shape.width&&y>=shape.y&&y<=shape.y+shape.height);
  return surface?gradientTextColor(diagramSurface(group,surface),color):color;
}
