import { W, H, elementBounds } from './geometry.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const margin=24;
const bounded=p=>({x:clamp(p.x,margin,W-margin),y:clamp(p.y,margin,H-margin)});
function direction(start,end,shift){
  const dx=end.x-start.x,dy=end.y-start.y;
  if(!shift)return {x:dx,y:dy};
  const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,length=Math.hypot(dx,dy);
  return {x:Math.cos(angle)*length,y:Math.sin(angle)*length};
}
function vectorLimit(anchor,v,centered){
  let scale=1;
  for(const [axis,max] of [['x',W-margin],['y',H-margin]]){
    const value=v[axis];if(!value)continue;
    const room=centered?Math.min(anchor[axis]-margin,max-anchor[axis]):value>0?max-anchor[axis]:anchor[axis]-margin;
    scale=Math.min(scale,room/Math.abs(value));
  }
  return {x:v.x*scale,y:v.y*scale};
}

export function createShape(original,start,end,{shift=false,alt=false}={}){
  if(['line','arrow'].includes(original.type)){
    const v=vectorLimit(start,direction(start,end,shift),alt);
    return {...original,x:start.x-(alt?v.x:0),y:start.y-(alt?v.y:0),x2:start.x+v.x,y2:start.y+v.y};
  }
  let dx=end.x-start.x,dy=end.y-start.y;
  if(shift){const side=Math.max(Math.abs(dx),Math.abs(dy));dx=(dx<0?-1:1)*side;dy=(dy<0?-1:1)*side;}
  const v=vectorLimit(start,{x:dx,y:dy},alt);
  const other={x:start.x+v.x,y:start.y+v.y},first={x:start.x-(alt?v.x:0),y:start.y-(alt?v.y:0)};
  return {...original,x:Math.min(first.x,other.x),y:Math.min(first.y,other.y),width:Math.abs(other.x-first.x),height:Math.abs(other.y-first.y)};
}

export function canResize(element){return Boolean(element&&!element.sourceId&&!['Relation BDD','Relation UML'].includes(element.label));}
export function resizeHandles(element){
  if(['line','arrow'].includes(element?.type)&&element.routing==='orthogonal')return [{name:'start',x:element.x,y:element.y},{name:'end',x:element.x2,y:element.y2}];
  if(!canResize(element))return [];
  if(['line','arrow'].includes(element.type))return [{name:'start',x:element.x,y:element.y},{name:'end',x:element.x2,y:element.y2}];
  const b=elementBounds(element),corners=[{name:'nw',x:b.x,y:b.y},{name:'ne',x:b.x+b.width,y:b.y},{name:'se',x:b.x+b.width,y:b.y+b.height},{name:'sw',x:b.x,y:b.y+b.height}];
  if(element.type==='group')return corners;
  return [...corners,{name:'n',x:b.x+b.width/2,y:b.y},{name:'e',x:b.x+b.width,y:b.y+b.height/2},{name:'s',x:b.x+b.width/2,y:b.y+b.height},{name:'w',x:b.x,y:b.y+b.height/2}];
}

export function resizeElement(original,handle,pointer,{shift=false,alt=false}={}){
  if(original.type==='text'){
    const bounds=elementBounds(original);
    const box=resizeElement({id:original.id,type:'rect',...bounds},handle,pointer,{shift,alt});
    const next={...original,x:box.x,y:box.y+original.fontSize,width:Math.max(original.fontSize*.62+1,box.width),height:box.height};
    const measured=elementBounds(next);next.height=measured.height;
    if(alt)next.y-=(measured.height-box.height)/2;
    else if(handle.includes('n'))next.y-=measured.height-box.height;
    const finalBounds=elementBounds(next);
    if(finalBounds.y<margin||next.x+next.width>W-margin||finalBounds.y+finalBounds.height>H-margin)return structuredClone(original);
    return next;
  }
  if(['line','arrow'].includes(original.type)){
    const start=handle==='start'?{x:original.x2,y:original.y2}:{x:original.x,y:original.y};
    if(alt){start.x=(original.x+original.x2)/2;start.y=(original.y+original.y2)/2;}
    const next=createShape(original,start,pointer,{shift,alt});
    return handle==='start'?{...next,x:next.x2,y:next.y2,x2:next.x,y2:next.y}:next;
  }
  const b=elementBounds(original),horizontal=/[we]/.test(handle),vertical=/[ns]/.test(handle);
  const anchor={x:alt||!horizontal?b.x+b.width/2:handle.includes('w')?b.x+b.width:b.x,y:alt||!vertical?b.y+b.height/2:handle.includes('n')?b.y+b.height:b.y};
  const p=bounded(pointer),factor=alt?2:1;
  let width=horizontal?Math.max(4,Math.abs(p.x-anchor.x)*factor):Math.max(4,b.width);
  let height=vertical?Math.max(4,Math.abs(p.y-anchor.y)*factor):Math.max(4,b.height);
  const uniform=shift||['text','group'].includes(original.type);
  let scale=1;
  if(uniform){scale=horizontal&&vertical?Math.max(width/Math.max(1,b.width),height/Math.max(1,b.height)):horizontal?width/Math.max(1,b.width):height/Math.max(1,b.height);}
  const texts=original.type==='text'?[original]:original.children?.filter(e=>e.type==='text')||[];
  if(texts.length)scale=clamp(scale,Math.max(...texts.map(e=>12/e.fontSize)),Math.min(...texts.map(e=>32/e.fontSize)));
  if(uniform){width=b.width*scale;height=b.height*scale;}
  const negativeX=horizontal?p.x<anchor.x:false,negativeY=vertical?p.y<anchor.y:false;
  const centeredX=alt||!horizontal,centeredY=alt||!vertical;
  const roomX=centeredX?2*Math.min(anchor.x-margin,W-margin-anchor.x):negativeX?anchor.x-margin:W-margin-anchor.x;
  const roomY=centeredY?2*Math.min(anchor.y-margin,H-margin-anchor.y):negativeY?anchor.y-margin:H-margin-anchor.y;
  if(uniform){const limit=Math.min(1,roomX/width,roomY/height);width*=limit;height*=limit;}
  else {width=Math.min(width,roomX);height=Math.min(height,roomY);}
  // Reject a shrink at the page edge that would make existing text unreadable.
  if(texts.some(e=>e.fontSize*width/Math.max(1,b.width)<12-1e-8))return structuredClone(original);
  const x=centeredX?anchor.x-width/2:negativeX?anchor.x-width:anchor.x;
  const y=centeredY?anchor.y-height/2:negativeY?anchor.y-height:anchor.y;
  const sx=width/Math.max(1,b.width),sy=height/Math.max(1,b.height);
  const map=e=>{
    const next={...e,x:x+(e.x-b.x)*sx,y:y+(e.y-b.y)*sy};
    if(e.width!==undefined){next.width=e.width*sx;next.height=e.height*sy;}
    if(e.x2!==undefined){next.x2=x+(e.x2-b.x)*sx;next.y2=y+(e.y2-b.y)*sy;}
    if(e.points)next.points=e.points.map(p=>({x:x+(p.x-b.x)*sx,y:y+(p.y-b.y)*sy}));
    if(e.fontSize)next.fontSize=clamp(e.fontSize*sx,12,32);
    if(e.children)next.children=e.children.map(map);
    return next;
  };
  return map(original);
}

export function duplicateElement(element){
  const copy=structuredClone(element);
  const renew=e=>{e.id=crypto.randomUUID();e.children?.forEach(renew);};renew(copy);
  return copy;
}
