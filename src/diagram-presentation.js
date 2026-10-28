import { textLines } from './geometry.js';
const INTERNAL_LABELS=new Set(['usecase','action','decision','component','artifact','database','deployment-node','data-object','identifying-relationship','process','subprocess','input-output','document','manual-input','preparation','weak-entity','send-signal','receive-signal']);

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
  if(child.role==='header'||group.label==='Association BDD'&&child.type==='ellipse')return ['#a85b18','#824016'];
  if(child.type==='rect'&&child.role==='uml-decoration'&&child.fill!=='none')return group.umlKind==='object'?['#7655aa','#4d357d']:['#346b9d','#22466f'];
  if(group.umlKind==='participant'&&child.role==='uml-frame')return ['#346b9d','#22466f'];
  if(group.umlKind==='usecase'&&child.type==='ellipse')return ['#7655aa','#4d357d'];
  return null;
}

export function darkDiagramTitle(group,child){
  return ['box-title','entity-name','association-name'].includes(child.role)||group.umlKind==='fragment'&&child.role==='uml-stereotype'||['uml-name','uml-stereotype'].includes(child.role)&&['class','abstract-class','interface','object','participant','usecase'].includes(group.umlKind);
}
