import { weakMemo } from './performance.js';
export const pageIndex=weakMemo(page=>{
  const elements=new Map(),parents=new Map(),order=new Map();
  const add=element=>{order.set(element.id,elements.size);elements.set(element.id,element);};
  for(const element of page.elements){add(element);for(const child of element.children||[]){add(child);parents.set(child.id,element);}}
  return {elements,parents,order};
});
