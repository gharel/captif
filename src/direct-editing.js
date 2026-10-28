import { elementBounds, W } from './geometry.js';

export function directTextPlacement(text,parent,scale=1){
  const bounds=elementBounds({...text,type:'text'}),fontSize=text.fontSize||18;
  const centered=['box-title','entity-name','association-name'].includes(text.role)||text.role==='uml-name'&&['class','abstract-class','interface','object','participant','usecase','actor'].includes(parent?.umlKind);
  const x=centered&&parent?parent.x+12:text.x;
  const width=centered&&parent?parent.width-24:text.width??Math.max(120,bounds.width+24);
  return {left:x*scale,top:(text.y-fontSize)*scale,width:Math.max(24,Math.min(width,W-x-24)*scale),height:Math.max(fontSize*1.5,bounds.height)*scale,fontSize:fontSize*scale,align:centered?'center':'left'};
}
