import { W, H, elementBounds } from './geometry.js';

export const CARDINALITIES = ['0,1', '1,1', '0,N', '1,N'];
const uid = () => crypto.randomUUID();
const stroke = '#303540';
const textValue = (value, fallback = '', limit = 80) => {
  const result = String(value ?? fallback).trim();
  if (result.length > limit || result.includes('\n')) throw new Error(`Texte limité à ${limit} caractères sur une ligne.`);
  return result;
};
const primitive = (type, props) => ({ id: uid(), type, stroke, strokeWidth: 1, ...props });
const text = (role, x, y, content, fontSize = 13, props = {}) => primitive('text', { role, x, y, text: String(content), fontSize, ...props });
const line = (role, x, y, x2, y2) => primitive('line', { role, x, y, x2, y2, stroke: '#cbd5e1' });
const rect = (role, x, y, width, height, fill = '#ffffff') => primitive('rect', { role, x, y, width, height, fill });

function attributesValue(attributes) {
  if (!Array.isArray(attributes) || attributes.length > 12) throw new Error('Une entité accepte au maximum 12 attributs.');
  return attributes.map(attribute => {
    const key = String(attribute.key || '').toUpperCase().replace(/\s/g, '');
    if (!['', 'PK', 'FK', 'PK,FK'].includes(key)) throw new Error('Clé attendue : PK, FK, PK,FK ou aucune.');
    return { name: textValue(attribute.name, 'attribut', 40), type: textValue(attribute.type, 'VARCHAR(100)', 30), key, nullable: Boolean(attribute.nullable) };
  });
}

function position(x, y, width, height) {
  if (![x, y, width, height].every(Number.isFinite) || width > W - 48 || height > H - 60) throw new Error('Le composant dépasse la feuille.');
  return { x: Math.max(24, Math.min(W - 24 - width, x)), y: Math.max(36, Math.min(H - 24 - height, y)) };
}

export function createEntity({ x = 70, y = 100, name = 'ENTITÉ', attributes = [
  { name: 'id', type: 'INTEGER', key: 'PK', nullable: false },
  { name: 'nom', type: 'VARCHAR(100)', key: '', nullable: false },
  { name: 'description', type: 'TEXT', key: '', nullable: true },
] } = {}) {
  name = textValue(name, 'ENTITÉ', 40);
  attributes = attributesValue(attributes);
  const nameWidth = Math.max(80, ...attributes.map(a => a.name.length * 12 * .62 + 12));
  const typeWidth = Math.max(90, ...attributes.map(a => a.type.length * 12 * .62 + 12));
  const width = Math.max(260, 40 + nameWidth + typeWidth + 34, name.length * 15 * .62 + 32);
  const height = 46 + Math.max(1, attributes.length) * 26;
  ({ x, y } = position(x, y, width, height));
  const typeX = x + 40 + nameWidth, nullableX = x + width - 26;
  const children = [
    rect('frame', x, y, width, height), rect('header', x, y, width, 34, '#fff6d5'),
    line('separator', x, y + 34, x + width, y + 34),
    text('entity-name', x + (width - name.length * 15 * .62) / 2, y + 23, name, 15, { bold: true }),
  ];
  attributes.forEach((attribute, index) => {
    const rowId = uid(), baseline = y + 55 + index * 26;
    children.push(text('attribute-key', x + 10, baseline, attribute.key, 9, { rowId, stroke: '#9b7622', bold: true }),
      text('attribute-name', x + 40, baseline, attribute.name, 12, { rowId }),
      text('attribute-type', typeX, baseline, attribute.type, 12, { rowId, stroke: '#8b909b' }),
      text('attribute-nullable', nullableX, baseline, attribute.nullable ? 'NULL' : 'NN', 8, { rowId, stroke: '#9ca3af' }));
  });
  if (!attributes.length) children.push(text('empty-label', x + 14, y + 55, 'Aucun attribut', 12, { stroke: '#9ca3af' }));
  return { id: uid(), type: 'group', label: 'Entité BDD', x, y, width, height, stroke, strokeWidth: 1, children };
}

function rows(group) {
  return group.children.filter(child => child.role === 'attribute-name').map(child => {
    const value = role => group.children.find(c => c.role === role && c.rowId === child.rowId)?.text || '';
    return { name: child.text, type: value('attribute-type'), key: value('attribute-key'), nullable: value('attribute-nullable').trim().toUpperCase() === 'NULL' };
  });
}

export function readEntity(group) {
  if (group.children?.some(child => child.role === 'entity-name')) return { name: group.children.find(child => child.role === 'entity-name').text, attributes: rows(group) };
  // Legacy free-text cards remain editable in the detailed editor.
  const lines = (group.children?.find(child => child.type === 'text')?.text || 'ENTITÉ').split('\n').filter(line => !/^─+$/.test(line));
  return { name: lines[0], attributes: lines.slice(1).filter(Boolean).map(row => {
    const [left, type = 'VARCHAR(100)'] = row.split(':');
    const key = /^\s*(PK|FK)\s+/.exec(left)?.[1] || '';
    return { name: left.replace(/^\s*(PK|FK)\s+/, '').trim(), type: type.trim(), key, nullable: false };
  }) };
}

function preserveChildren(group, next) {
  const oldRows = group.children.filter(child => child.role === 'attribute-name').map(child => child.rowId);
  const newRows = next.children.filter(child => child.role === 'attribute-name').map(child => child.rowId);
  const roleCounts = new Map();
  return { ...next, id: group.id, stroke: group.stroke, strokeWidth: group.strokeWidth, children: next.children.map(child => {
    const rowIndex = child.rowId ? newRows.indexOf(child.rowId) : -1;
    const rowId = rowIndex >= 0 ? oldRows[rowIndex] || child.rowId : undefined;
    const roleIndex = roleCounts.get(child.role) || 0;
    if (rowIndex < 0) roleCounts.set(child.role, roleIndex + 1);
    const previous = rowIndex >= 0 ? group.children.find(c => c.role === child.role && c.rowId === rowId)
      : group.children.filter(c => c.role === child.role && !c.rowId)[roleIndex];
    return { ...child, ...(rowId ? { rowId } : {}), ...(previous ? { id: previous.id, stroke: previous.stroke, strokeWidth: previous.strokeWidth,...Object.fromEntries(['bold','italic'].filter(key=>previous[key]!==undefined).map(key=>[key,previous[key]])) } : {}) };
  }) };
}

export function updateEntity(group, patch) {
  return preserveChildren(group, createEntity({ ...readEntity(group), ...patch, x: group.x, y: group.y }));
}

export function createAssociation({ x = 280, y = 330, name = 'ASSOCIATION', attributes = [] } = {}) {
  name = textValue(name, 'ASSOCIATION', 40); attributes = attributesValue(attributes);
  const keyWidth = Math.max(20, ...attributes.map(a => a.key.length * 12 * .62));
  const nameWidth = Math.max(60, ...attributes.map(a => a.name.length * 12 * .62));
  const typeWidth = Math.max(60, ...attributes.map(a => a.type.length * 12 * .62));
  const contentWidth = keyWidth + nameWidth + typeWidth + 70;
  const width = Math.max(210, name.length * 16 * .62 * 1.4 + 40, attributes.length ? contentWidth * 1.35 + 48 : 0);
  const height = attributes.length ? Math.max(120, 85 + attributes.length * 36) : 82;
  ({ x, y } = position(x, y, width, height));
  const bodyX = x + (width - contentWidth) / 2;
  const children = [primitive('ellipse', { role: 'frame', x, y, width, height, fill: '#fff6d5' }), text('association-name', x + (width - name.length * 16 * .62) / 2, y + (attributes.length ? height * .2 + 8 : height / 2 + 5), name, 16, { bold: true })];
  attributes.forEach((a, index) => {
    const rowId = uid(), baseline = y + height * .34 + 16 + index * 26;
    children.push(text('attribute-name', bodyX + keyWidth + 10, baseline, a.name, 12, { rowId }), text('attribute-type', bodyX + keyWidth + nameWidth + 20, baseline, a.type, 12, { rowId }), text('attribute-key', bodyX, baseline, a.key, 12, { rowId }), text('attribute-nullable', bodyX + contentWidth - 32, baseline, a.nullable ? 'NULL' : 'NN', 12, { rowId }));
  });
  return { id: uid(), type: 'group', label: 'Association BDD', x, y, width, height, stroke, strokeWidth: 1, children };
}
export const readAssociation = group => ({ name: group.children.find(c => c.role === 'association-name')?.text || 'ASSOCIATION', attributes: rows(group) });
export const updateAssociation = (group, patch) => preserveChildren(group, createAssociation({ ...readAssociation(group), ...patch, x: group.x, y: group.y }));

function cardinality(value) {
  if (!CARDINALITIES.includes(value)) throw new Error('Cardinalité attendue : 0,1 ; 1,1 ; 0,N ; 1,N.');
  return value;
}
export function createRelation({ x = 100, y = 450, name = 'associer', left = '1,1', right = '0,N', sourceId = null, targetId = null } = {}) {
  name = textValue(name, 'associer', 40); left = cardinality(left); right = cardinality(right);
  const width = Math.max(280, name.length * 13 * .62 + 90), height = 72;
  ({ x, y } = position(x, y, width, height));
  return { id: uid(), type: 'group', label: 'Relation BDD', x, y, width, height, stroke, strokeWidth: 1,
    ...(sourceId ? { sourceId: String(sourceId) } : {}), ...(targetId ? { targetId: String(targetId) } : {}),
    children: [line('relation-line', x, y + 38, x + width, y + 38), text('cardinality-left', x + 8, y + 25, left, 13), text('cardinality-right', x + width - 36, y + 25, right, 13), text('relation-name', x + Math.max(45, (width - name.length * 13 * .62) / 2), y + 60, name, 13)],
  };
}
export function readRelation(group) {
  const value = role => group.children.find(child => child.role === role)?.text || '';
  return { name: value('relation-name'), left: value('cardinality-left'), right: value('cardinality-right'), sourceId: group.sourceId || null, targetId: group.targetId || null };
}
export const updateRelation = (group, patch) => preserveChildren(group, createRelation({ ...readRelation(group), ...patch, x: group.x, y: group.y }));

function anchor(shape, towards) {
  const bounds = elementBounds(shape);
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  const dx = towards.x - cx, dy = towards.y - cy;
  const elliptical = shape.label === 'Association BDD';
  const k = elliptical ? 1 / Math.sqrt((dx / (bounds.width / 2)) ** 2 + (dy / (bounds.height / 2)) ** 2)
    : Math.min(dx ? bounds.width / 2 / Math.abs(dx) : Infinity, dy ? bounds.height / 2 / Math.abs(dy) : Infinity);
  return Number.isFinite(k) ? { x: cx + dx * k, y: cy + dy * k } : { x: cx, y: cy };
}

/** Recalculate attached connectors for display/print, without rewriting document state. */
export function resolveRelations(page) {
  return { ...page, elements: page.elements.map(group => {
    if (group.label !== 'Relation BDD' || !group.sourceId || !group.targetId || group.sourceId === group.targetId) return group;
    const source = page.elements.find(e => e.id === group.sourceId && e.type === 'group' && e.label !== 'Relation BDD');
    const target = page.elements.find(e => e.id === group.targetId && e.type === 'group' && e.label !== 'Relation BDD');
    if (!source || !target) return group;
    const a = elementBounds(source), b = elementBounds(target);
    const p = anchor(source, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
    const q = anchor(target, { x: a.x + a.width / 2, y: a.y + a.height / 2 });
    const x = Math.min(p.x, q.x), y = Math.max(24, Math.min(p.y, q.y) - 32);
    const width = Math.abs(q.x - p.x), height = Math.abs(q.y - p.y) + 68;
    const dx = q.x - p.x, dy = q.y - p.y, length = Math.hypot(dx, dy) || 1;
    const baseLine = group.children.find(child => child.role === 'relation-line');
    const baseChildren = group.children.filter(child => child.role !== 'relation-line' || child.id === baseLine?.id);
    const sideBySide = Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y)
      && Math.abs(a.x + a.width / 2 - b.x - b.width / 2) > Math.abs(a.y + a.height / 2 - b.y - b.height / 2);
    const canRouteBelow = Math.max(a.y + a.height, b.y + b.height) + 88 <= H - 24;
    const canRouteAbove = Math.min(a.y, b.y) - 76 >= 24;
    if (baseLine && length < 110 && sideBySide && (canRouteBelow || canRouteAbove)) {
      const below = canRouteBelow;
      const start = { x: a.x + a.width / 2, y: below ? a.y + a.height : a.y };
      const end = { x: b.x + b.width / 2, y: below ? b.y + b.height : b.y };
      const routeY = below ? Math.max(start.y, end.y) + 58 : Math.min(start.y, end.y) - 58;
      const segments = [
        { ...baseLine, x: start.x, y: start.y, x2: start.x, y2: routeY, stroke: group.stroke },
        { ...baseLine, id: `${baseLine.id}-route-mid`, x: start.x, y: routeY, x2: end.x, y2: routeY, stroke: group.stroke },
        { ...baseLine, id: `${baseLine.id}-route-end`, x: end.x, y: routeY, x2: end.x, y2: end.y, stroke: group.stroke },
      ];
      const labels = baseChildren.filter(child => child.role !== 'relation-line').map(child => {
        if (child.role === 'cardinality-left') return { ...child, x: start.x + 12, y: start.y + (below ? 27 : -14) };
        if (child.role === 'cardinality-right') return { ...child, x: end.x - child.text.length * 8 - 12, y: end.y + (below ? 27 : -14) };
        if (child.role === 'relation-name') return { ...child, x: Math.max(24, Math.min(W - 32 - child.text.length * 8, (start.x + end.x) / 2 - child.text.length * 4)), y: routeY + 23 };
        return child;
      });
      const children = [...segments, ...labels];
      const bounds = children.map(elementBounds);
      const rootX = Math.min(...bounds.map(b => b.x)), rootY = Math.min(...bounds.map(b => b.y));
      return { ...group, x: rootX, y: rootY, width: Math.max(...bounds.map(b => b.x + b.width)) - rootX, height: Math.max(...bounds.map(b => b.y + b.height)) - rootY, children };
    }
    const tx = dx / length, ty = dy / length;
    const labelAt = (distance, label) => ({ x: Math.max(24, Math.min(W - 55, p.x + dx * distance - label.length * 4)), y: Math.max(38, Math.min(H - 30, p.y + dy * distance - 12)) });
    return { ...group, x, y, width, height: Math.min(H - y - 12, height), children: baseChildren.map(child => {
      if (child.role === 'relation-line') return { ...child, x: p.x, y: p.y, x2: q.x, y2: q.y, stroke: group.stroke };
      if (child.role === 'cardinality-left') return { ...child, ...labelAt(Math.min(.22, 32 / length), child.text) };
      if (child.role === 'cardinality-right') return { ...child, ...labelAt(Math.max(.78, 1 - 32 / length), child.text) };
      if (child.role === 'relation-name') return { ...child, x: Math.max(24, Math.min(W - 40 - child.text.length * 8, (p.x + q.x) / 2 - child.text.length * 4 + ty * 16)), y: Math.max(38, Math.min(H - 30, (p.y + q.y) / 2 + 20 + tx * 6)) };
      return child;
    }) };
  }) };
}
