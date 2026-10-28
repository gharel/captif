import { DEFAULT_STROKE } from './stroke.js';
export const DEFAULT_DRAWING_STYLE=Object.freeze({color:DEFAULT_STROKE,thickness:1,dash:''});

/** Apply remembered drawing choices to a new object without changing its source. */
export function applyDrawingStyle(element,style,patternChosen=false){
  const next={...element,stroke:style.color,strokeWidth:style.thickness};
  if(patternChosen)next.dash=style.dash||'solid';
  if(element.role==='uml-marker'&&element.fill!=='none'&&element.fill!=='#ffffff')next.fill=style.color;
  if(element.children)next.children=element.children.map(child=>applyDrawingStyle(child,style,patternChosen));
  return next;
}
