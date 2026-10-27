import { W, H } from './geometry.js';

export const UML_NODE_KINDS = ['class', 'abstract-class', 'interface', 'object', 'actor', 'usecase', 'system', 'participant', 'activation', 'fragment', 'destruction', 'note'];
const uid = () => crypto.randomUUID();
const color = '#334155';
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
const primitive = (type, values) => ({ id: uid(), type, stroke: color, strokeWidth: 1.5, ...values });
const rect = (x, y, width, height, fill = '#ffffff', extra = {}) => primitive('rect', { role: 'uml-frame', x, y, width, height, fill, ...extra });
const line = (x, y, x2, y2, extra = {}) => primitive('line', { role: 'uml-decoration', x, y, x2, y2, ...extra });
const text = (role, x, y, value, fontSize = 14, extra = {}) => primitive('text', { role, x, y, text: value, fontSize, ...extra });
const textWidth = (value, size) => Math.max(1, ...String(value).split('\n').map(line => line.length)) * size * .62;

export function isUmlNode(group) {
  return Boolean(group?.type === 'group' && (UML_NODE_KINDS.includes(group.umlKind) || group.label === 'Classe UML'));
}

export function createUmlNode(kind, options = {}) {
  if (!UML_NODE_KINDS.includes(kind)) throw new Error('Élément UML inconnu.');
  const name = string(options.name, defaults[kind]);
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
    width = Math.max(280, textWidth(title, 18) + 32, textWidth(displayedStereotype, 12) + 32, ...attributes.map(a => textWidth(a, 14) + 32), ...operations.map(a => textWidth(a, 14) + 32));
    headerHeight = displayedStereotype ? 64 : 44;
    attrHeight = Math.max(40, attributes.length * 21 + 20);
    opHeight = kind === 'object' ? 0 : Math.max(40, operations.length * 21 + 20);
    height = headerHeight + attrHeight + opHeight;
  } else if (kind === 'actor') { width = Math.max(120, textWidth(name, 14) + 20); height = 148; }
  else if (kind === 'usecase') { width = Math.max(260, textWidth(name, 16) + 64); height = 110; }
  else if (kind === 'system') { width = Math.max(dimension(options.width, 520, 380, 746), textWidth(name, 16) + 32); height = dimension(options.height, 360, 120, 1063); }
  else if (kind === 'participant') { width = Math.max(170, textWidth(name, 16) + 30); height = dimension(options.height, 460, 120, 1063); }
  else if (kind === 'activation') { width = name?Math.max(110, textWidth(name, 12) + 12):20; nodeHeight = dimension(options.height, 110, 40, 1000); height = nodeHeight + (name?34:0); }
  else if (kind === 'fragment') { width = Math.max(dimension(options.width, 500, 280, 746), textWidth(condition, 13) + 40, textWidth(name, 13) + 100); height = dimension(options.height, 240, 120, 1063); }
  else if (kind === 'destruction') { width = name?Math.max(80, textWidth(name, 12) + 16):40; height = name?80:48; }
  else { width = Math.max(280, textWidth(name, 16) + 36, ...attributes.map(a => textWidth(a, 14) + 36)); height = 68 + Math.max(1, attributes.length) * 21; }
  if (width > W - 48 || height > H - 60) throw new Error('Cet élément dépasse les dimensions utiles de la feuille.');
  const requestedX = options.x ?? 50, requestedY = options.y ?? 90;
  if (!Number.isFinite(requestedX) || !Number.isFinite(requestedY)) throw new Error('Position invalide.');
  const x = Math.max(24, Math.min(W - 24 - width, requestedX));
  const y = Math.max(36, Math.min(H - 24 - height, requestedY));
  const children = [];
  if (classLike || kind === 'object') {
    children.push(rect(x, y, width, height), rect(x, y, width, headerHeight, '#eef0ff', { role: 'uml-decoration' }));
    if (displayedStereotype) children.push(text('uml-stereotype', x + (width - textWidth(displayedStereotype, 12)) / 2, y + 20, displayedStereotype, 12));
    children.push(text('uml-name', x + (width - textWidth(title, 18)) / 2, y + (displayedStereotype ? 47 : 28), title, 18, { ...(kind === 'abstract-class' ? { italic: true } : {}), ...(kind === 'object' ? { underline: true } : {}) }));
    children.push(line(x, y + headerHeight, x + width, y + headerHeight));
    children.push(text('uml-attributes', x + 15, y + headerHeight + 26, attributes.join('\n'), 14));
    if (kind !== 'object') { children.push(line(x, y + headerHeight + attrHeight, x + width, y + headerHeight + attrHeight)); children.push(text('uml-operations', x + 15, y + headerHeight + attrHeight + 26, operations.join('\n'), 14)); }
  } else if (kind === 'actor') {
    const center = x + width / 2;
    children.push(primitive('ellipse', { role: 'uml-decoration', x: center - 13, y: y + 5, width: 26, height: 26, fill: '#ffffff' }), line(center, y + 31, center, y + 83), line(center - 29, y + 49, center + 29, y + 49), line(center, y + 83, center - 25, y + 112), line(center, y + 83, center + 25, y + 112), text('uml-name', x + (width - textWidth(name, 14)) / 2, y + 135, name, 14));
  } else if (kind === 'usecase') {
    children.push(primitive('ellipse', { role: 'uml-frame', x, y, width, height, fill: '#f8f9ff' }), text('uml-name', x + (width - textWidth(name, 16)) / 2, y + height / 2 + 5, name, 16));
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
  } else {
    children.push(rect(x, y, width, height, '#fff9dc'), line(x + width - 22, y, x + width - 22, y + 22), line(x + width - 22, y + 22, x + width, y + 22), text('uml-name', x + 14, y + 28, name, 16), text('uml-attributes', x + 14, y + 57, attributes.join('\n'), 14));
  }
  return { id: uid(), type: 'group', label: 'Élément UML', umlKind: kind, x, y, width, height, stroke: color, strokeWidth: 1.5, children };
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
    return previous ? { ...child, id: previous.id, stroke: previous.stroke, strokeWidth: previous.strokeWidth,...(previous.dash?{dash:previous.dash}:{}),...Object.fromEntries(['bold','italic'].filter(key=>previous[key]!==undefined).map(key=>[key,previous[key]])) } : child;
  }) };
}
