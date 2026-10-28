import { weakMemo } from './performance.js';
import { W, H, textLines, elementBounds } from './geometry.js';
import { resolveRelations } from './bdd.js';
import { resolveUmlRelations } from './uml-relations.js';
import { resizeHandles } from './transforms.js';
import { selectionBounds } from './selection.js';
import { scaledDash } from './stroke.js';
import { resolveConnectors,anchorsForElements,bendHandles } from './connectors.js';
import { diagramActions,isDiagram } from './diagram-inline.js';
import { editableConnector,resolveDiagramConnections } from './diagram-connections.js';
import { codeSvg } from './code-highlight.js';
import { diagramTextPresentation,diagramSurface,diagramTitleColor } from './diagram-presentation.js';
export { W, H, textLines } from './geometry.js';
export const escape = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const resolvePageGeometry=weakMemo(page=>resolveConnectors(resolveDiagramConnections(resolveUmlRelations(resolveRelations(page)))));

export function textFits(e) {
  const size = e.fontSize || 18;
  const bounds=elementBounds(e);
  return bounds.y>=20 && bounds.y+bounds.height<=H-28 && bounds.x+bounds.width<=W-24 && e.x<W-32-size;
}

export function elementSvg(e, selected = false,editHints=false) {
  const color = /^#[\da-f]{6}$/i.test(e.stroke) ? e.stroke : '#263833';
  const gradientId=`surface-${encodeURIComponent(e.id)}`;
  const fill = e._gradient?`url(#${gradientId})`:e.fill === 'none' || /^#[\da-f]{6}$/i.test(e.fill) ? e.fill : 'none';
  const pattern=scaledDash(e.dash,e.strokeWidth||2);
  const dash = pattern ? ` stroke-dasharray="${pattern}"` : '';
  const style = `stroke="${color}" stroke-width="${e.strokeWidth || 2}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"${dash}`;
  let inner = '';
  if (e.type === 'group') {
    const themedChildren=e.children.map(child=>{
      const next={...diagramTextPresentation(child,e)};
      next._gradient=diagramSurface(e,child);
      next.stroke=diagramTitleColor(e,child);
      if(child.role==='code-content')next._codeLanguage=e.codeLanguage||'plaintext';
      if(child.role==='code-language')next._rightX=e.x+e.width-20;
      if(child.type==='text'&&!child.text.trim()&&['uml-name','uml-attributes','uml-operations','uml-condition'].includes(child.role)){
        const bounds=elementBounds(next);
        const following=e.children.filter(c=>c.type==='text'&&c.y>child.y).map(c=>elementBounds(c).y).sort((a,b)=>a-b)[0];
        const end=Math.min(following??e.y+e.height-8,['uml-name','uml-condition'].includes(child.role)?bounds.y+36:Infinity);
        next._hitBounds={x:e.x+12,y:bounds.y,width:Math.max(1,e.width-24),height:Math.max(bounds.height,end-bounds.y-4)};
      }
      if(child.type==='rect'&&child.role==='uml-frame'&&['state','action'].includes(e.umlKind))next._radius=e.umlKind==='action'?Math.min(child.height/2,32):12;
      if(['box-title','entity-name','uml-name','association-name'].includes(child.role)){
        if((child.role==='entity-name'||['class','abstract-class','interface','object'].includes(e.umlKind))&&child.bold===undefined)next.bold=true;
      }
      if(['header','code-header'].includes(child.role)||(child.type==='rect'&&child.role==='uml-decoration'&&child.width===e.width&&child.fill!=='none'))next._header=true;
      return next;
    });
    inner = `${['Relation BDD','Relation UML'].includes(e.label) ? '' : `<rect class="group-hit" x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" fill="transparent" stroke="none"/>`}${themedChildren.map(child => elementSvg(child,false,editHints)).join('')}`;
  }
  if (e.type === 'rect') inner = e._header
    ? `<path d="M${e.x+5},${e.y} H${e.x+e.width-5} Q${e.x+e.width},${e.y} ${e.x+e.width},${e.y+5} V${e.y+e.height} H${e.x} V${e.y+5} Q${e.x},${e.y} ${e.x+5},${e.y}Z" fill="${fill}" stroke="${color}" stroke-width="${e.strokeWidth||1}"/>`
    : `<rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${e._radius??(['frame','uml-frame'].includes(e.role)?5:2)}" ${style}/>`;
  if (e.type === 'ellipse') inner = `<ellipse cx="${e.x + e.width / 2}" cy="${e.y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" ${style}/>`;
  if (e.type === 'line' || e.type === 'arrow') {
    const points=e.route?.length?e.route:[{x:e.x,y:e.y},{x:e.x2,y:e.y2}],d=points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ');
    inner = `${e.routing==='orthogonal'||['relation-line','uml-relation-line'].includes(e.role) ? `<path d="${d}" stroke="transparent" stroke-width="14" fill="none"/>` : ''}<path${e.routing==='orthogonal'?' class="connector-path"':''} d="${d}" ${style}/>`;
    if (e.type === 'arrow') {
      const previous=points.at(-2)||points[0],a = Math.atan2(e.y2 - previous.y, e.x2 - previous.x);
      inner += `<path d="M${e.x2 - 12 * Math.cos(a - .45)},${e.y2 - 12 * Math.sin(a - .45)} L${e.x2},${e.y2} L${e.x2 - 12 * Math.cos(a + .45)},${e.y2 - 12 * Math.sin(a + .45)}" ${style}/>`;
    }
  }
  if (e.type === 'pen') {const d=e.points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ');inner=`${['relation-line','uml-relation-line'].includes(e.role)?`<path d="${d}" stroke="transparent" stroke-width="14" fill="none" vector-effect="non-scaling-stroke"/>`:''}<path d="${d}" ${style}/>`;}
  if (e.type === 'text') {
    const size = e.fontSize || 18;
    // Fixed page coordinates and explicit line breaking keep screen and PDF identical.
    const lines = textLines(e);
    const bounds = elementBounds(e);
    const background = e.text.trim() && ['relation-name', 'cardinality-left', 'cardinality-right', 'uml-relation-name', 'uml-source-label', 'uml-target-label'].includes(e.role)
      ? `<rect class="relation-label-background" x="${bounds.x - 4}" y="${bounds.y - 2}" width="${bounds.width + 8}" height="${bounds.height + 4}" rx="3" fill="#ffffff" stroke="none" pointer-events="none"/>` : '';
    const textX=e._rightX??e._centerX??e.x;
    let text = e.text.trim() ? `<text x="${textX}" y="${e.y}"${e._rightX!==undefined?' text-anchor="end"':e._centerX!==undefined?' text-anchor="middle"':''} font-size="${size}" fill="${color}" font-family="${e.role?'Arial, Helvetica, sans-serif':'ui-monospace, monospace'}"${e.bold ? ' font-weight="700"' : ''}${e.italic ? ' font-style="italic"' : ''}${e.underline ? ' text-decoration="underline"' : ''}>${lines.map((line, i) => `<tspan x="${textX}" dy="${i ? size * 1.5 : 0}">${escape(line) || ' '}</tspan>`).join('')}</text>` : '';
    if(e.role==='code-content')text=e.text?codeSvg(e,e._codeLanguage||'plaintext'):'';
    const hit=e._hitBounds||bounds;
    inner = `${background}<rect class="text-hit" x="${hit.x}" y="${hit.y}" width="${hit.width}" height="${hit.height}" fill="transparent" stroke="none"/>${text}`;
  }
  const pointerStyle = ['Relation BDD','Relation UML'].includes(e.label) ? ' style="pointer-events:none"' : ['relation-line','uml-relation-line'].includes(e.role) ? ' style="pointer-events:visiblePainted"' : '';
  const gradient=e._gradient?`<defs><linearGradient id="${gradientId}" x1="0%" y1="35%" x2="100%" y2="65%">${e._gradient.map((color,i)=>`<stop offset="${i*50}%" stop-color="${color}"/>`).join('')}</linearGradient></defs>`:'';
  return `<g data-element="${escape(e.id)}"${e.type === 'group' ? ` data-group="${escape(e.id)}" role="group" aria-label="${escape(e.label)}"` : ''} class="drawing-element${e.type === 'group' ? ' group-element' : ''}"${pointerStyle}>${gradient}${inner}${selected ? outline(e, 'selection-outline') : ''}</g>`;
}

function findElement(elements, id) {
  for (const element of elements) {
    if (element.id === id) return element;
    if (element.children) {
      const found = element.children.find(child => child.id === id);
      if (found) return diagramTextPresentation(found,element);
    }
  }
}

function outline(element, className, padding = 5) {
  const wire=editableConnector(element);
  if(wire?.route?.length)return `<path class="${className}" d="${wire.route.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')}" fill="none" stroke="#c35424" stroke-width="5" opacity=".35" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  const bounds = elementBounds(element);
  return `<rect class="${className}" x="${bounds.x - padding}" y="${bounds.y - padding}" width="${Math.max(1, bounds.width) + padding * 2}" height="${Math.max(1, bounds.height) + padding * 2}" rx="4" fill="none" stroke="#c35424" stroke-width="1.3"${className === 'group-isolation-outline' ? ' stroke-dasharray="6 4"' : ''} vector-effect="non-scaling-stroke" pointer-events="none"/>`;
}

export function pageSvg(page, { selected, selectedIds = [], editingGroup, grid = false, draft = null, drafts = [], marquee = null, handleSize = 10,connectionMode=false,snapAnchor=null,editHints=false } = {}) {
  let replaced = false;
  let visible = draft ? page.elements.map(element => {
    if (element.id === draft.id) { replaced = true; return draft; }
    if (element.children?.some(child => child.id === draft.id)) {
      replaced = true;
      return { ...element, children: element.children.map(child => child.id === draft.id ? draft : child) };
    }
    return element;
  }) : page.elements;
  if (draft && !replaced) visible.push(draft);
  if(drafts.length){
    const replacements=new Map(drafts.map(e=>[e.id,e]));
    visible=visible.map(e=>replacements.get(e.id)||{...e,...(e.children?{children:e.children.map(c=>replacements.get(c.id)||c)}:{})});
    const known=new Set(visible.flatMap(e=>[e.id,...(e.children?.map(c=>c.id)||[])]));
    const additions=drafts.filter(e=>!known.has(e.id));
    if(editingGroup)visible=visible.map(e=>e.id===editingGroup?{...e,children:[...e.children,...additions]}:e);
    else visible=[...visible,...additions];
  }
  visible = resolvePageGeometry(!draft&&!drafts.length?page:{...page,elements:visible}).elements;
  const selectedElement = findElement(visible, selected);
  const multiple=selectedIds.length>1?selectedIds.map(id=>findElement(visible,id)).filter(Boolean):[];
  const selectionFrame=selectionBounds(multiple);
  const isolated = visible.find(e => e.type === 'group' && e.id === editingGroup);
  const attachedParent = visible.find(e => e.sourceId && e.children?.some(c => c.id === selected));
  const selectedWire=editableConnector(selectedElement);
  const handles = selectedElement && !multiple.length && !attachedParent ? resizeHandles(selectedWire||selectedElement).map(h => `<rect class="resize-handle handle-${h.name}" data-resize="${h.name}" x="${h.x-handleSize/2}" y="${h.y-handleSize/2}" width="${handleSize}" height="${handleSize}" rx="2" fill="#fff" stroke="#c35424" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`).join('') : '';
  const marqueeSvg=marquee?`<rect class="marquee-selection" x="${Math.min(marquee.start.x,marquee.end.x)}" y="${Math.min(marquee.start.y,marquee.end.y)}" width="${Math.abs(marquee.end.x-marquee.start.x)}" height="${Math.abs(marquee.end.y-marquee.start.y)}" fill="#c3542412" stroke="#c35424" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`:'';
  const ports=connectionMode?anchorsForElements(visible).map(p=>`<circle class="connection-anchor${snapAnchor?.shapeId===p.shapeId&&snapAnchor.side===p.side?' active':''}" data-anchor-shape="${escape(p.shapeId)}" data-anchor-side="${p.side}" cx="${p.x}" cy="${p.y}" r="${handleSize*.55}" fill="#fff" stroke="#c35424" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`).join(''):'';
  const bends=selectedWire&&!multiple.length?bendHandles(selectedWire).map(h=>`<rect class="bend-handle axis-${h.axis}" data-bend-index="${h.index}" x="${h.x-handleSize*.4}" y="${h.y-handleSize*.4}" width="${handleSize*.8}" height="${handleSize*.8}" transform="rotate(45 ${h.x} ${h.y})" fill="#fff1e8" stroke="#c35424" stroke-width="1.3" vector-effect="non-scaling-stroke"><title>Déplacer ce coude</title></rect>`).join(''):'';
  const activeDiagram=!multiple.length?(isDiagram(selectedElement)?selectedElement:visible.find(e=>isDiagram(e)&&e.children?.some(c=>c.id===selected))):null;
  const actions=editHints&&activeDiagram?diagramActions(activeDiagram,selected):[];
  const tools=actions.length?`<g class="diagram-inline-actions" data-diagram-owner="${escape(activeDiagram.id)}">${actions.map((a,i)=>{const b=elementBounds(activeDiagram),x=b.x+i*104,y=Math.min(H-32,b.y+b.height+8);return `<g data-diagram-action="${a.action}" role="button" tabindex="0" aria-label="${escape(a.label)}"><rect x="${x}" y="${y}" width="98" height="26" rx="6" fill="#fff" stroke="#dedbf7"/><text x="${x+10}" y="${y+17}" font-size="12" font-family="system-ui,sans-serif" fill="#c35424">${escape(a.label)}</text></g>`;}).join('')}</g>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="paper-svg" aria-label="Zone de dessin de la feuille" role="img">
    ${grid ? '<defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#d9dfda"/></pattern></defs><rect width="794" height="1123" fill="url(#dots)"/>' : ''}
    ${visible.map(e => elementSvg(e,false,editHints&&(!['Relation BDD','Relation UML'].includes(e.label)||e.id===selected||e.children?.some(c=>c.id===selected)))).join('')}${isolated ? outline(isolated, 'group-isolation-outline', 10) : ''}${multiple.length?multiple.map(e=>outline(e,'selection-outline')).join('')+outline(selectionFrame,'multi-selection-outline',8):selectedElement ? outline(selectedElement, 'selection-outline') : ''}${handles}${bends}${marqueeSvg}${ports}${tools}</svg>`;
}

export const duration = ms => {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
export const time = value => value == null ? 'En cours' : new Date(value).toLocaleString('fr-FR');
