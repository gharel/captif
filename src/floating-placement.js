import { weakMemo } from './performance.js';
import { elementBounds } from './geometry.js';
export const floatingBoxes=weakMemo(elements=>elements.filter(e=>['rect','ellipse','text','group'].includes(e.type)&&!['Relation BDD','Relation UML'].includes(e.label)).map(e=>({id:e.id,box:elementBounds(e)})));
export function placeFloating(target,size,area,gap=10,obstacles=[]){
  const maxWidth=Math.max(0,area.right-area.left),maxHeight=Math.max(0,area.bottom-area.top);
  const width=Math.min(size.width,maxWidth),height=Math.min(size.height,maxHeight);
  const right=target.right+gap,left=target.left-gap-width,above=target.top-gap-height,below=target.bottom+gap;
  const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  const candidates=[[right,target.top],[target.left,above],[target.left,below],[left,target.top],[right,below],[right,above],[left,below],[left,above]].map(([x,y],order)=>{
    const box={left:Math.max(area.left,Math.min(area.right-width,x)),top:Math.max(area.top,Math.min(area.bottom-height,y))};
    box.right=box.left+width;box.bottom=box.top+height;
    return {...box,order,score:overlap(box,target)*4+obstacles.reduce((sum,b)=>sum+overlap(box,b),0)};
  });
  candidates.sort((a,b)=>a.score-b.score||a.order-b.order);
  return {left:candidates[0].left,top:candidates[0].top,maxWidth,maxHeight};
}
