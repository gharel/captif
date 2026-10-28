import { textLines } from './geometry.js';
const INTERNAL_LABELS=new Set(['usecase','action','decision','component','artifact','database','deployment-node','data-object','identifying-relationship','process','subprocess','input-output','document','manual-input','preparation','weak-entity','send-signal','receive-signal']);
// One exclusive hue per colored component; close stops keep the finish restrained.
export const DIAGRAM_COLORS=Object.freeze(Object.fromEntries(Object.entries({
  entity:['#317b78','#2c716f'],
  association:['#35768d','#306c82'],
  class:['#5564ae','#4d5ba2'],
  'abstract-class':['#656397','#5c5a8c'],
  interface:['#526f82','#4b6578'],
  object:['#805f91','#755687'],
  participant:['#416fb2','#3b65a6'],
  usecase:['#a45c7b','#985370'],
  fragment:['#627186','#59677c'],
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

export function darkDiagramTitle(group,child){
  return ['box-title','entity-name','association-name'].includes(child.role)||group.umlKind==='fragment'&&child.role==='uml-stereotype'||['uml-name','uml-stereotype'].includes(child.role)&&['class','abstract-class','interface','object','participant','usecase'].includes(group.umlKind);
}
