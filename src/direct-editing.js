import { elementBounds, W } from './geometry.js';
import { diagramTextPresentation } from './diagram-presentation.js';

export function directTextPlacement(text,parent,scale=1){
  text=diagramTextPresentation({...text,type:'text'},parent);
  const bounds=elementBounds({...text,type:'text'}),fontSize=text.fontSize||18;
  const centered=text._centerX!==undefined;
  const x=text.x;
  const width=text.width??Math.max(120,bounds.width+24);
  return {left:x*scale,top:(text.y-fontSize)*scale,width:Math.max(24,Math.min(width,W-x-24)*scale),height:Math.max(fontSize*1.5,bounds.height)*scale,fontSize:fontSize*scale,align:centered?'center':'left'};
}
