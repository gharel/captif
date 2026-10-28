export const W = 794;
export const TEXT_SIZE=Object.freeze({min:12,max:32});
import { codeLines } from './code-lines.js';
export const H = 1123;

export function textLines(element) {
  const available = Math.min(element.width ?? Infinity, W - 32 - element.x);
  const maxChars = Math.max(1, Math.floor(available / ((element.fontSize || 18) * .62)));
  if(element.role==='code-content')return codeLines(element.text,maxChars);
  return element.text.split('\n').flatMap(line => {
    const parts = [];
    while (line.length > maxChars) {
      const space=line.lastIndexOf(' ',maxChars);
      const split=space>0?space:maxChars;
      parts.push(line.slice(0,split));line=line.slice(split).replace(/^ +/,'');
    }
    return [...parts, line];
  });
}

function union(bounds) {
  const x = Math.min(...bounds.map(b => b.x));
  const y = Math.min(...bounds.map(b => b.y));
  return { x, y, width: Math.max(...bounds.map(b => b.x + b.width)) - x, height: Math.max(...bounds.map(b => b.y + b.height)) - y };
}

export function elementBounds(element) {
  const e = element;
  if (e.type === 'group') {
    return union([{ x: e.x, y: e.y, width: e.width, height: e.height }, ...e.children.map(elementBounds)]);
  }
  if (e.type === 'text') {
    const size = e.fontSize || 18;
    const lines = textLines(e);
    return { x: e.x, y: e.y - size, width: e.width ?? Math.max(1, ...lines.map(line => line.length)) * size * .62, height: Math.max(e.height || 0,size * 1.3 + (lines.length - 1) * size * 1.5) };
  }
  if (e.type === 'pen') {
    return union(e.points.map(p => ({ ...p, width: 0, height: 0 })));
  }
  if (e.type === 'line' || e.type === 'arrow') {
    if(e.routing==='orthogonal'&&e.route?.length)return union(e.route.map(p=>({...p,width:0,height:0})));
    return { x: Math.min(e.x, e.x2), y: Math.min(e.y, e.y2), width: Math.abs(e.x2 - e.x), height: Math.abs(e.y2 - e.y) };
  }
  return { x: e.x, y: e.y, width: e.width, height: e.height };
}

/** Translate every stored coordinate, preserving the source and group relationships. */
export function translateElement(element, dx, dy) {
  const moved = { ...element, x: element.x + dx, y: element.y + dy };
  if (element.x2 !== undefined) { moved.x2 = element.x2 + dx; moved.y2 = element.y2 + dy; }
  if (element.points) moved.points = element.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
  if (element.route) moved.route = element.route.map(p => ({ x:p.x+dx,y:p.y+dy }));
  if (element.waypoints) moved.waypoints = element.waypoints.map(p => ({x:p.x+dx,y:p.y+dy}));
  for(const key of ['startPoint','endPoint'])if(element[key])moved[key]={x:element[key].x+dx,y:element[key].y+dy};
  if (element.children) moved.children = element.children.map(child => translateElement(child, dx, dy));
  return moved;
}
