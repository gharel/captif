import { W, H } from './geometry.js';

export const UML_NODE_KINDS = ['class', 'abstract-class', 'interface', 'object', 'actor', 'usecase', 'system', 'participant', 'activation', 'fragment', 'destruction', 'note', 'package', 'state', 'action', 'initial', 'final', 'flow-final', 'decision', 'fork', 'join', 'history', 'deep-history', 'swimlane', 'component', 'artifact', 'database', 'deployment-node', 'port', 'provided-interface', 'required-interface', 'entry-point', 'exit-point', 'terminate', 'junction', 'send-signal', 'receive-signal', 'time-event', 'data-object', 'process', 'subprocess', 'input-output', 'document', 'manual-input', 'preparation', 'weak-entity', 'identifying-relationship'];
const uid = () => crypto.randomUUID();
const color = '#303540';
const defaults = { class: 'Classe', 'abstract-class': 'ClasseAbstraite', interface: 'Interface', object: 'instance', actor: 'Acteur', usecase: "Cas d’utilisation", system: 'Système', participant: 'Participant', activation: '', fragment: 'Fragment', destruction: '', note: 'Note' };
const string = (value, fallback = '', limit = 50) => {
  const result = String(value ?? fallback).trim();
  if (result.length > limit || result.includes('\n') || result.includes('\r')) throw new Error(`Texte limité à ${limit} caractères sur une ligne.`);
  return result;
};
const lines = (value, fallback = []) => {
  const result = value ?? fallback;
  if (!Array.isArray(result) || result.length > 10) throw new Error('Dix lignes au maximum par compartiment.');
  return result.map(line => string(line, '', 80));
};
const dimension = (value, fallback, min, max) => {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || result < min || result > max) throw new Error(`Dimension attendue entre ${min} et ${max}.`);
  return result;
};
const primitive = (type, values) => ({ id: uid(), type, stroke: color, strokeWidth: 1, ...values });
const rect = (x, y, width, height, fill = '#ffffff', extra = {}) => primitive('rect', { role: 'uml-frame', x, y, width, height, fill, ...extra });
const line = (x, y, x2, y2, extra = {}) => primitive('line', { role: 'uml-decoration', x, y, x2, y2, ...extra });
const text = (role, x, y, value, fontSize = 14, extra = {}) => primitive('text', { role, x, y, text: value, fontSize, ...extra });
const textWidth = (value, size) => Math.max(1, ...String(value).split('\n').map(line => line.length)) * size * .62;
const compactKinds = new Set(['initial','final','flow-final','fork','join','history','deep-history']);
const smallKinds = new Set(['port','provided-interface','required-interface','entry-point','exit-point','terminate','junction','time-event']);
const flowKinds = new Set(['send-signal','receive-signal','process','subprocess','input-output','document','manual-input','preparation','weak-entity']);

export function isUmlNode(group) {
  return Boolean(group?.type === 'group' && (UML_NODE_KINDS.includes(group.umlKind) || group.label === 'Classe UML'));
}

export function createUmlNode(kind, options = {}) {
  if (!UML_NODE_KINDS.includes(kind)) throw new Error('Élément UML inconnu.');
  const name = string(options.name, defaults[kind] ?? '');
  const stereotype = string(options.stereotype, '', 40);
  const attributes = lines(options.attributes, ['class', 'abstract-class', 'interface'].includes(kind) ? ['- attribut : Type'] : kind === 'object' ? ['attribut = valeur'] : kind === 'note' ? ['Votre commentaire'] : []);
  const operations = lines(options.operations, ['class', 'abstract-class', 'interface'].includes(kind) ? ['+ operation() : Type'] : []);
  const className = string(options.className, 'Classe');
  const condition = string(options.condition, 'condition', 80);
  const fragmentKind = options.fragmentKind ?? 'alt';
  if (!['alt', 'opt', 'loop', 'par'].includes(fragmentKind)) throw new Error('Fragment attendu : alt, opt, loop ou par.');
  let width, height;
  const classLike = ['class', 'abstract-class', 'interface'].includes(kind);
  const displayedStereotype = kind === 'interface' ? `«interface»${stereotype ? ` · «${stereotype}»` : ''}` : stereotype ? `«${stereotype}»` : '';
  const title = kind === 'object' ? className?`${name} : ${className}`:name : name;
  let headerHeight, attrHeight, opHeight, nodeHeight;
  if (classLike || kind === 'object') {
    width = Math.max(240, textWidth(title, 15) + 32, textWidth(displayedStereotype, 11) + 32, ...attributes.map(a => textWidth(a, 13) + 32), ...operations.map(a => textWidth(a, 13) + 32));
    headerHeight = displayedStereotype ? 54 : 36;
    attrHeight = Math.max(36, attributes.length * 19.5 + 20);
    opHeight = kind === 'object' ? 0 : Math.max(36, operations.length * 19.5 + 20);
    height = headerHeight + attrHeight + opHeight;
  } else if (kind === 'actor') { width = Math.max(120, textWidth(name, 14) + 20); height = 148; }
  else if (kind === 'usecase') { width = Math.max(190, textWidth(name, 15) + 52); height = 82; }
  else if (kind === 'system') { width = Math.max(dimension(options.width, 520, 380, 746), textWidth(name, 16) + 32); height = dimension(options.height, 360, 120, 1063); }
  else if (kind === 'participant') { width = Math.max(170, textWidth(name, 16) + 30); height = dimension(options.height, 460, 120, 1063); }
  else if (kind === 'activation') { width = name?Math.max(110, textWidth(name, 12) + 12):20; nodeHeight = dimension(options.height, 110, 40, 1000); height = nodeHeight + (name?34:0); }
  else if (kind === 'fragment') { width = Math.max(dimension(options.width, 500, 280, 746), textWidth(condition, 13) + 40, textWidth(name, 13) + 100); height = dimension(options.height, 240, 120, 1063); }
  else if (kind === 'destruction') { width = name?Math.max(80, textWidth(name, 12) + 16):40; height = name?80:48; }
  else if (kind === 'package') { width = Math.max(dimension(options.width, 280, 180, 746),textWidth(name,15)+32); height = dimension(options.height,180,90,1063); }
  else if (kind === 'swimlane') { width = Math.max(dimension(options.width,250,160,746),textWidth(name,14)+28); height = dimension(options.height,380,120,1063); }
  else if (kind === 'state') { width = Math.max(210,textWidth(name,15)+32,...attributes.map(a=>textWidth(a,13)+28));height=64+(attributes.length?Math.max(32,attributes.length*19.5+20):0); }
  else if (kind === 'action') { width = Math.max(180,textWidth(name,15)+40);height=64; }
  else if (kind === 'decision') { width = Math.max(112,textWidth(name,14)*1.6+32);height=Math.max(80,width*.6); }
  else if (kind === 'component') { width = Math.max(220,textWidth(name,15)+64);height=100; }
  else if (kind === 'artifact') { width = Math.max(190,textWidth(name,15)+38);height=110; }
  else if (kind === 'database') { width = Math.max(180,textWidth(name,15)+36);height=100; }
  else if (kind === 'deployment-node') { width=Math.max(200,textWidth(name,14)+54);height=130; }
  else if (kind === 'data-object') { width=Math.max(150,textWidth(name,14)+38);height=110; }
  else if (kind === 'identifying-relationship') { width=Math.max(140,textWidth(name,14)*1.6+36);height=Math.max(90,width*.65); }
  else if (smallKinds.has(kind)) { nodeHeight=kind==='port'?26:kind==='time-event'?64:kind.endsWith('interface')?60:40;width=Math.max(kind.endsWith('interface')?90:kind==='time-event'?64:40,name?textWidth(name,12)+20:0);height=nodeHeight+(name?28:0); }
  else if (flowKinds.has(kind)) { width=Math.max(kind==='weak-entity'?240:190,textWidth(name,14)+64);height=kind==='weak-entity'?110:82; }
  else if (compactKinds.has(kind)) { width=Math.max(kind==='fork'?120:kind==='join'?12:40,name?textWidth(name,12)+16:0);nodeHeight=kind==='join'?120:kind==='fork'?12:40;height=nodeHeight+(name?28:0); }
  else { width = Math.max(280, textWidth(name, 16) + 36, ...attributes.map(a => textWidth(a, 14) + 36)); height = 68 + Math.max(1, attributes.length) * 21; }
  if (width > W - 48 || height > H - 60) throw new Error('Cet élément dépasse les dimensions utiles de la feuille.');
  const requestedX = options.x ?? 50, requestedY = options.y ?? 90;
  if (!Number.isFinite(requestedX) || !Number.isFinite(requestedY)) throw new Error('Position invalide.');
  const x = Math.max(24, Math.min(W - 24 - width, requestedX));
  const y = Math.max(36, Math.min(H - 24 - height, requestedY));
  const children = [];
  if (classLike || kind === 'object') {
    children.push(rect(x, y, width, height), rect(x, y, width, headerHeight, kind === 'object' ? '#f0eaff' : '#e8efff', { role: 'uml-decoration' }));
    if (displayedStereotype) children.push(text('uml-stereotype', x + (width - textWidth(displayedStereotype, 11)) / 2, y + 18, displayedStereotype, 11, { stroke: '#64748b' }));
    children.push(text('uml-name', x + (width - textWidth(title, 15)) / 2, y + (displayedStereotype ? 40 : 24), title, 15, { bold: true, ...(kind === 'abstract-class' ? { italic: true } : {}), ...(kind === 'object' ? { underline: true } : {}) }));
    children.push(line(x, y + headerHeight, x + width, y + headerHeight));
    children.push(text('uml-attributes', x + 14, y + headerHeight + 23, attributes.join('\n'), 13));
    if (kind !== 'object') { children.push(line(x, y + headerHeight + attrHeight, x + width, y + headerHeight + attrHeight)); children.push(text('uml-operations', x + 14, y + headerHeight + attrHeight + 23, operations.join('\n'), 13)); }
  } else if (kind === 'actor') {
    const center = x + width / 2;
    children.push(primitive('ellipse', { role: 'uml-decoration', x: center - 13, y: y + 5, width: 26, height: 26, fill: '#ffffff' }), line(center, y + 31, center, y + 83), line(center - 29, y + 49, center + 29, y + 49), line(center, y + 83, center - 25, y + 112), line(center, y + 83, center + 25, y + 112), text('uml-name', x + (width - textWidth(name, 14)) / 2, y + 135, name, 14));
  } else if (kind === 'usecase') {
    children.push(primitive('ellipse', { role: 'uml-frame', x, y, width, height, fill: '#ede5ff' }), text('uml-name', x + (width - textWidth(name, 15)) / 2, y + height / 2 + 5, name, 15));
  } else if (kind === 'system') {
    children.push(rect(x, y, width, height, 'none'), text('uml-name', x + 14, y + 27, name, 16));
  } else if (kind === 'participant') {
    children.push(rect(x, y, width, 46, '#eef0ff'), text('uml-name', x + (width - textWidth(name, 16)) / 2, y + 29, name, 16), line(x + width / 2, y + 46, x + width / 2, y + height, { dash: '6 5' }));
  } else if (kind === 'activation') {
    children.push(rect(x + (width - 20) / 2, y, 20, nodeHeight));
    if(name)children.push(text('uml-name', x + (width - textWidth(name, 12)) / 2, y + nodeHeight + 23, name, 12));
  } else if (kind === 'fragment') {
    children.push(rect(x, y, width, height, 'none'), rect(x, y, 58, 33, '#eef0ff', { role: 'uml-decoration' }), text('uml-stereotype', x + 12, y + 23, fragmentKind, 14), text('uml-name', x + 75, y + 23, name, 13), text('uml-condition', x + 16, y + 56, condition?`[${condition}]`:'', 13));
    if (fragmentKind === 'alt' || fragmentKind === 'par') children.push(line(x, y + height / 2, x + width, y + height / 2, { dash: '6 5' }));
  } else if (kind === 'destruction') {
    const center = x + width / 2;
    children.push(line(center - 16, y + 8, center + 16, y + 40), line(center + 16, y + 8, center - 16, y + 40));
    if(name)children.push(text('uml-name', x + (width - textWidth(name, 12)) / 2, y + 66, name, 12));
  } else if (kind === 'package') {
    const tab=Math.min(width-24,Math.max(84,textWidth(name,15)+28));
    children.push(rect(x,y+24,width,height-24),rect(x,y,tab,24),text('uml-name',x+12,y+17,name,15));
  } else if (kind === 'swimlane') {
    children.push(rect(x,y,width,height,'none'),line(x,y+36,x+width,y+36),text('uml-name',x+14,y+24,name,14));
  } else if (kind === 'state' || kind === 'action') {
    children.push(rect(x,y,width,height),text('uml-name',x+(width-textWidth(name,15))/2,y+38,name,15));
    if(kind==='state'&&attributes.length)children.push(line(x,y+56,x+width,y+56),text('uml-attributes',x+14,y+79,attributes.join('\n'),13));
  } else if (kind === 'decision') {
    children.push(primitive('pen',{role:'uml-frame',x,y,fill:'#ffffff',points:[{x:x+width/2,y},{x:x+width,y:y+height/2},{x:x+width/2,y:y+height},{x,y:y+height/2},{x:x+width/2,y}]}),text('uml-name',x+(width-textWidth(name,14))/2,y+height/2+5,name,14));
  } else if (kind === 'component') {
    children.push(rect(x+12,y,width-12,height),rect(x,y+22,24,16),rect(x,y+60,24,16),text('uml-name',x+40,y+height/2+5,name,15));
  } else if (kind === 'artifact') {
    children.push(primitive('pen',{role:'uml-frame',x,y,fill:'#ffffff',points:[{x,y},{x:x+width-22,y},{x:x+width,y:y+22},{x:x+width,y:y+height},{x,y:y+height},{x,y}]}),line(x+width-22,y,x+width-22,y+22),line(x+width-22,y+22,x+width,y+22),text('uml-name',x+14,y+height/2+5,name,15));
  } else if (kind === 'database') {
    children.push(rect(x,y+10,width,height-20),primitive('ellipse',{role:'uml-decoration',x,y:y+height-20,width,height:20,fill:'#ffffff'}),primitive('ellipse',{role:'uml-decoration',x,y,width,height:20,fill:'#ffffff'}),text('uml-name',x+(width-textWidth(name,15))/2,y+height/2+7,name,15));
  } else if (kind === 'deployment-node') {
    const depth=18;
    children.push(rect(x,y+depth,width-depth,height-depth),primitive('pen',{role:'uml-decoration',x,y,fill:'#f5f6fa',points:[{x,y:y+depth},{x:x+depth,y},{x:x+width,y},{x:x+width-depth,y:y+depth},{x,y:y+depth}]}),line(x+width-depth,y+depth,x+width,y),line(x+width,y,x+width,y+height-depth),line(x+width,y+height-depth,x+width-depth,y+height),text('uml-name',x+(width-depth-textWidth(name,14))/2,y+height/2+12,name,14));
  } else if (kind === 'data-object') {
    children.push(primitive('pen',{role:'uml-frame',x,y,fill:'#ffffff',points:[{x,y},{x:x+width-20,y},{x:x+width,y:y+20},{x:x+width,y:y+height},{x,y:y+height},{x,y}]}),line(x+width-20,y,x+width-20,y+20),line(x+width-20,y+20,x+width,y+20),text('uml-name',x+(width-textWidth(name,14))/2,y+height/2+5,name,14));
  } else if (kind === 'identifying-relationship') {
    const polygon=inset=>primitive('pen',{role:'uml-frame',x:x+inset,y:y+inset,fill:inset?'none':'#ffffff',points:[{x:x+width/2,y:y+inset},{x:x+width-inset,y:y+height/2},{x:x+width/2,y:y+height-inset},{x:x+inset,y:y+height/2},{x:x+width/2,y:y+inset}]});
    children.push(polygon(0),polygon(7),text('uml-name',x+(width-textWidth(name,14))/2,y+height/2+5,name,14));
  } else if (smallKinds.has(kind)) {
    const cx=x+width/2,cy=y+nodeHeight/2;
    if(kind==='port')children.push(rect(cx-12,y+1,24,24));
    else if(kind==='provided-interface')children.push(line(x+6,cy,cx-12,cy),primitive('ellipse',{role:'uml-frame',x:cx-12,y:cy-12,width:24,height:24,fill:'#ffffff'}));
    else if(kind==='required-interface'){
      const points=Array.from({length:13},(_,i)=>{const angle=Math.PI/2+i*Math.PI/12;return{x:cx+12*Math.cos(angle),y:cy+12*Math.sin(angle)};});
      children.push(line(x+6,cy,cx-12,cy),primitive('pen',{role:'uml-frame',...points[0],points,fill:'none'}));
    } else if(kind==='entry-point'||kind==='exit-point'){
      children.push(primitive('ellipse',{role:'uml-frame',x:cx-16,y:y+4,width:32,height:32,fill:'#ffffff'}));
      if(kind==='exit-point')children.push(line(cx-8,cy-8,cx+8,cy+8),line(cx+8,cy-8,cx-8,cy+8));
    } else if(kind==='terminate')children.push(line(cx-14,cy-14,cx+14,cy+14),line(cx+14,cy-14,cx-14,cy+14));
    else if(kind==='junction')children.push(primitive('ellipse',{role:'uml-marker',x:cx-7,y:cy-7,width:14,height:14,fill:color}));
    else if(kind==='time-event')children.push(primitive('pen',{role:'uml-frame',x:cx-20,y:y+4,fill:'none',points:[{x:cx-20,y:y+4},{x:cx+20,y:y+4},{x:cx-20,y:y+nodeHeight-4},{x:cx+20,y:y+nodeHeight-4},{x:cx-20,y:y+4}]}));
    if(name)children.push(text('uml-name',x+(width-textWidth(name,12))/2,y+nodeHeight+20,name,12));
  } else if (flowKinds.has(kind)) {
    const points=kind==='send-signal'?[{x,y},{x:x+width-22,y},{x:x+width,y:y+height/2},{x:x+width-22,y:y+height},{x,y:y+height},{x,y}]
      :kind==='receive-signal'?[{x,y},{x:x+width,y},{x:x+width,y:y+height},{x,y:y+height},{x:x+22,y:y+height/2},{x,y}]
      :kind==='input-output'?[{x:x+22,y},{x:x+width,y},{x:x+width-22,y:y+height},{x,y:y+height},{x:x+22,y}]
      :kind==='manual-input'?[{x,y:y+18},{x:x+width,y},{x:x+width,y:y+height},{x,y:y+height},{x,y:y+18}]
      :kind==='preparation'?[{x:x+20,y},{x:x+width-20,y},{x:x+width,y:y+height/2},{x:x+width-20,y:y+height},{x:x+20,y:y+height},{x,y:y+height/2},{x:x+20,y}]
      :kind==='document'?[{x,y},{x:x+width,y},{x:x+width,y:y+height-12},...Array.from({length:13},(_,i)=>({x:x+width*(1-i/12),y:y+height-12+8*Math.sin(i/12*Math.PI*2)})),{x,y}]:null;
    if(points)children.push(primitive('pen',{role:'uml-frame',x,y,fill:'#ffffff',points}));
    else children.push(rect(x,y,width,height));
    if(kind==='subprocess')children.push(line(x+10,y,x+10,y+height),line(x+width-10,y,x+width-10,y+height));
    if(kind==='weak-entity')children.push(rect(x+6,y+6,width-12,height-12,'none'));
    children.push(text('uml-name',x+(width-textWidth(name,14))/2,y+height/2+5,name,14));
  } else if (compactKinds.has(kind)) {
    const cx=x+width/2;
    if(kind==='fork'||kind==='join')children.push(rect(kind==='join'?cx-6:x,y,kind==='join'?12:width,nodeHeight,color,{role:'uml-marker'}));
    else{
      children.push(primitive('ellipse',{role:kind==='initial'?'uml-marker':'uml-frame',x:cx-20,y,width:40,height:40,fill:kind==='initial'?color:'#ffffff'}));
      if(kind==='final')children.push(primitive('ellipse',{role:'uml-marker',x:cx-13,y:y+7,width:26,height:26,fill:color}));
      if(kind==='flow-final')children.push(line(cx-10,y+10,cx+10,y+30),line(cx+10,y+10,cx-10,y+30));
      if(kind==='history'||kind==='deep-history')children.push(text('uml-decoration',cx-(kind==='history'?5:9),y+26,kind==='history'?'H':'H*',16));
    }
    if(name)children.push(text('uml-name',x+(width-textWidth(name,12))/2,y+nodeHeight+20,name,12));
  } else {
    children.push(rect(x, y, width, height, '#fff9dc'), line(x + width - 22, y, x + width - 22, y + 22), line(x + width - 22, y + 22, x + width, y + 22), text('uml-name', x + 14, y + 28, name, 16), text('uml-attributes', x + 14, y + 57, attributes.join('\n'), 14));
  }
  return { id: uid(), type: 'group', label: 'Élément UML', umlKind: kind, x, y, width, height, stroke: color, strokeWidth: 1, children };
}

function legacy(group) {
  const content = group.children?.find(child => child.type === 'text')?.text || 'Classe';
  const sections = [[]];
  for (const row of content.split('\n')) { if (/^─+$/.test(row)) sections.push([]); else sections.at(-1).push(row); }
  return { kind: 'class', name: sections[0].join(' '), stereotype: '', attributes: sections[1] || [], operations: sections[2] || [], className: 'Classe', condition: 'condition', fragmentKind: 'alt', width: group.width, height: group.height };
}

export function readUmlNode(group) {
  if (!isUmlNode(group)) throw new Error('Élément UML non reconnu.');
  if (!group.umlKind) return legacy(group);
  const value = role => group.children.find(child => child.role === role && child.type === 'text')?.text || '';
  let name = value('uml-name');
  let className = group.umlKind==='object'?'':'Classe';
  if (group.umlKind === 'object') { const at = name.lastIndexOf(' : '); if (at >= 0) { className = name.slice(at + 3); name = name.slice(0, at); } }
  let stereotype = value('uml-stereotype');
  if (group.umlKind === 'interface') stereotype = stereotype.replace(/^«interface»(?: · )?/, '');
  const fragmentKind = group.umlKind === 'fragment' ? value('uml-stereotype') || 'alt' : 'alt';
  if (group.umlKind === 'fragment') stereotype = '';
  stereotype = stereotype.replace(/^«|»$/g, '');
  const memberLines = role => value(role) ? value(role).split('\n') : [];
  const height = group.umlKind === 'activation' ? group.children.find(child => child.role === 'uml-frame').height : group.height;
  return { kind: group.umlKind, name, stereotype, attributes: memberLines('uml-attributes'), operations: memberLines('uml-operations'), className, condition: value('uml-condition').replace(/^\[|\]$/g, ''), fragmentKind, width: group.width, height };
}

export function updateUmlNode(group, patch) {
  const values = { ...readUmlNode(group), ...patch, x: group.x, y: group.y };
  const next = createUmlNode(values.kind, values);
  const seen = new Map();
  return { ...next, id: group.id, stroke: group.stroke, strokeWidth: group.strokeWidth, ...(group.dash ? {dash: group.dash} : {}), children: next.children.map(child => {
    const index = seen.get(child.role) || 0; seen.set(child.role, index + 1);
    const previous = group.children.filter(candidate => candidate.role === child.role)[index];
    return previous ? { ...child, id: previous.id, stroke: previous.stroke, strokeWidth: previous.strokeWidth,...(previous.dash?{dash:previous.dash}:{}),...Object.fromEntries(['bold','italic','underline'].filter(key=>previous[key]!==undefined).map(key=>[key,previous[key]])) } : child;
  }) };
}
