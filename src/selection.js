import { W,H,elementBounds,translateElement } from './geometry.js';

export function selectionBounds(elements){
  if(!elements.length)return null;
  const bounds=elements.map(elementBounds),x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y));
  return {x,y,width:Math.max(...bounds.map(b=>b.x+b.width))-x,height:Math.max(...bounds.map(b=>b.y+b.height))-y};
}
export function enclosedElements(elements,start,end){
  const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),right=Math.max(start.x,end.x),bottom=Math.max(start.y,end.y);
  return elements.filter(e=>{const b=elementBounds(e);return b.x>=x&&b.y>=y&&b.x+b.width<=right&&b.y+b.height<=bottom;}).map(e=>e.id);
}
export function moveSelection(elements,dx,dy){
  const bounds=selectionBounds(elements.filter(e=>!e.sourceId&&!e.targetId));
  if(!bounds)return structuredClone(elements);
  dx=Math.max(24-bounds.x,Math.min(W-24-bounds.x-bounds.width,dx));
  dy=Math.max(24-bounds.y,Math.min(H-24-bounds.y-bounds.height,dy));
  return elements.map(e=>e.sourceId||e.targetId?structuredClone(e):translateElement(e,dx,dy));
}
export function duplicateSelection(elements,available=elements){
  const selected=new Set(elements.map(e=>e.id));
  const all=[...elements,...available.filter(e=>!selected.has(e.id)&&e.sourceId&&e.targetId&&selected.has(e.sourceId)&&selected.has(e.targetId))];
  const copies=structuredClone(all),ids=new Map();
  const renew=e=>{const next=crypto.randomUUID();ids.set(e.id,next);e.id=next;e.children?.forEach(renew);};copies.forEach(renew);
  const remap=e=>{for(const key of ['sourceId','targetId'])if(ids.has(e[key]))e[key]=ids.get(e[key]);e.children?.forEach(remap);};copies.forEach(remap);
  return copies;
}
