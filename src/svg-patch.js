// Preserve unchanged SVG groups and native event targets during pointer gestures.
export function patchSvg(container,markup){
  const template=document.createElement('template');template.innerHTML=markup;
  const next=template.content.firstElementChild,current=container.firstElementChild;
  if(!current||current.tagName!==next.tagName){container.replaceChildren(next);return;}
  for(const attr of [...current.attributes])if(!next.hasAttribute(attr.name))current.removeAttribute(attr.name);
  for(const attr of next.attributes)if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
  const key=(node,index)=>node.getAttribute('data-element')||`${node.tagName}:${node.getAttribute('class')||''}:${index}`;
  const old=new Map([...current.children].map((node,i)=>[key(node,i),node]));
  const children=[...next.children].map((node,i)=>{
    const previous=old.get(key(node,i));return previous?.outerHTML===node.outerHTML?previous:node;
  });
  const retained=new Set(children);
  for(const node of [...current.children])if(!retained.has(node))node.remove();
  children.forEach((node,i)=>{if(current.children[i]!==node)current.insertBefore(node,current.children[i]||null);});
}
