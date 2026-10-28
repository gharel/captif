export { translateElement, elementBounds } from './geometry.js';
import { TEXT_SIZE } from './geometry.js';
import { UML_NODE_KINDS } from './uml-nodes.js';
import { UML_RELATION_KINDS } from './uml-relations.js';
import { CODE_LANGUAGES } from './code-languages.js';
const TYPES = new Set(['rect', 'text', 'pen', 'ellipse', 'line', 'arrow', 'group']);
const uid = () => globalThis.crypto.randomUUID();

export function createDocument() {
  return {
    version: 1,
    id: uid(),
    student: { name: '' },
    exam: '',
    pages: [{ id: uid(), elements: [] }],
  };
}

export function addPage(doc) {
  if (doc.pages.length >= 50) return doc;
  return { ...doc, pages: [...doc.pages, { id: uid(), elements: [] }] };
}

export function removePage(doc, pageId) {
  if (doc.pages.length <= 1 || !doc.pages.some((page) => page.id === pageId)) return doc;
  return { ...doc, pages: doc.pages.filter((page) => page.id !== pageId) };
}

function mapPage(doc, pageId, transform) {
  if (!doc.pages.some((page) => page.id === pageId)) return doc;
  return { ...doc, pages: doc.pages.map((page) => page.id === pageId ? transform(page) : page) };
}

export function addElement(doc, pageId, element) {
  if (!TYPES.has(element.type)) throw new Error('Type d’élément inconnu.');
  return mapPage(doc, pageId, (page) => countElements(page.elements) + countElements([element]) > 2_000
    ? page
    : { ...page, elements: [...page.elements, structuredClone(element)] });
}

function countElements(elements) {
  return elements.reduce((sum, element) => sum + 1 + (element.children ? element.children.length : 0), 0);
}

export function updateElement(doc, pageId, elementId, patch) {
  return mapPage(doc, pageId, (page) => ({
    ...page,
    elements: page.elements.map((element) => {
      if (element.id === elementId) return { ...element, ...structuredClone(patch), id: element.id, type: element.type };
      if (element.type === 'group') return { ...element, children: element.children.map(child => child.id === elementId ? { ...child, ...structuredClone(patch), id: child.id, type: child.type } : child) };
      return element;
    }),
  }));
}

export function removeElement(doc, pageId, elementId) {
  return mapPage(doc, pageId, (page) => ({
    ...page, elements: page.elements.filter((element) => element.id !== elementId && element.sourceId !== elementId && element.targetId !== elementId).map(element => element.type === 'group'
      ? { ...element, children: element.children.filter(child => child.id !== elementId) } : element),
  }));
}

export const createHistory = (initial) => ({ past: [], present: initial, future: [] });

export function commit(history, doc) {
  if (history.present === doc) return history;
  return { past: [...history.past, history.present].slice(-100), present: doc, future: [] };
}

export function undo(history) {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1),
    future: [history.present, ...history.future].slice(0, 100),
  };
}

export function redo(history) {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present].slice(-100),
    present: history.future[0],
    future: history.future.slice(1),
  };
}

/** Rebuild imported JSON using a strict whitelist; never inject imported markup. */
export function validateDocument(value) {
  const fail = () => { throw new Error('Copie invalide : format, limites ou géométrie incorrects.'); };
  const object = (item) => item && typeof item === 'object' && !Array.isArray(item);
  const string = (item, max) => {
    if (typeof item !== 'string' || item.length > max) fail();
    return item;
  };
  const ids = new Set();
  const id = (item) => {
    const result = string(item, 128);
    if (!result || ids.has(result)) fail();
    ids.add(result);
    return result;
  };
  const number = (item, min, max) => {
    if (typeof item !== 'number' || !Number.isFinite(item) || item < min || item > max) fail();
    return item;
  };
  if (!object(value) || value.version !== 1 || !object(value.student)
    || !Array.isArray(value.pages) || !value.pages.length || value.pages.length > 50) fail();
  const result = {
    version: 1,
    id: id(value.id),
    student: { name: string(value.student.name, 200) },
    exam: string(value.exam, 300),
    pages: [],
  };
  let pageElementCount = 0;
  function cleanElement(element, child = false) {
      if (!object(element) || !TYPES.has(element.type) || (child && element.type === 'group') || ++pageElementCount > 2_000) fail();
      const clean = {
        id: id(element.id), type: element.type,
        x: number(element.x, 0, 794), y: number(element.y, 0, 1123),
        stroke: string(element.stroke, 7),
        strokeWidth: number(element.strokeWidth, 1, 12),
      };
      if (!/^#[\da-f]{6}$/i.test(clean.stroke)) fail();
      for (const style of ['underline', 'italic', 'bold']) {
        if (element[style] !== undefined) {
          if (typeof element[style] !== 'boolean') fail();
          clean[style] = element[style];
        }
      }
      if (element.dash !== undefined) {
        if (!['solid', '6 5', '4 4', '8 5', '1 5', '8 4 1 4'].includes(element.dash)) fail();
        clean.dash = element.dash;
      }
      if(element.type==='group'&&element.waypoints!==undefined){if(!Array.isArray(element.waypoints)||element.waypoints.length>32)fail();clean.waypoints=element.waypoints.map(p=>{if(!object(p))fail();return {x:number(p.x,12,782),y:number(p.y,12,1111)};});}
      if (element.fill !== undefined) {
        clean.fill = string(element.fill, 7);
        if (clean.fill !== 'none' && !/^#[\da-f]{6}$/i.test(clean.fill)) fail();
      }
      if (element.role !== undefined) {
        const roles = ['entity-name', 'attribute-name', 'attribute-type', 'attribute-key', 'attribute-nullable', 'association-name', 'relation-name', 'cardinality-left', 'cardinality-right', 'frame', 'header', 'separator', 'column-label', 'empty-label', 'relation-line', 'uml-name', 'uml-stereotype', 'uml-attributes', 'uml-operations', 'uml-condition', 'uml-frame', 'uml-decoration', 'uml-relation-line', 'uml-relation-name', 'uml-source-label', 'uml-target-label', 'uml-marker'];
        clean.role = string(element.role, 40);
        if (!roles.includes(clean.role) && !['box-title','box-body','code-content','code-header','code-language','code-decoration'].includes(clean.role)) fail();
      }
      if (element.rowId !== undefined) {
        clean.rowId = string(element.rowId, 128);
        if (!/^[\w-]{1,128}$/.test(clean.rowId)) fail();
      }
      if (element.type === 'rect' || element.type === 'ellipse' || element.type === 'group') {
        clean.width = number(element.width, 0, 794);
        clean.height = number(element.height, 0, 1123);
        if (clean.x + clean.width > 794 || clean.y + clean.height > 1123) fail();
        if (element.type === 'group') {
          clean.label = string(element.label, 80);
          if (!['Classe UML', 'Entité BDD', 'Association BDD', 'Relation BDD', 'Élément UML', 'Relation UML','Bloc de code'].includes(clean.label) || !Array.isArray(element.children) || element.children.length > 100) fail();
          if(element.codeLanguage!==undefined){if(clean.label!=='Bloc de code'||!Object.hasOwn(CODE_LANGUAGES,element.codeLanguage))fail();clean.codeLanguage=element.codeLanguage;}
          if (element.umlKind !== undefined) {
            if (element.umlKind !== 'relation' && !UML_NODE_KINDS.includes(element.umlKind)) fail();
            clean.umlKind = element.umlKind;
          }
          if (element.relationKind !== undefined) {
            if (!UML_RELATION_KINDS.includes(element.relationKind)) fail();
            clean.relationKind = element.relationKind;
          }
          if (element.offset !== undefined) clean.offset = number(element.offset, 80, 800);
          for (const reference of ['sourceId', 'targetId']) {
            if (element[reference] != null) {
              clean[reference] = string(element[reference], 128);
              if (!clean[reference]) fail();
            }
          }
          for(const key of ['sourceAnchor','targetAnchor'])if(element[key]!==undefined){if(!['n','e','s','w'].includes(element[key]))fail();clean[key]=element[key];}
          for(const key of ['startPoint','endPoint'])if(element[key]!==undefined){if(!object(element[key]))fail();clean[key]={x:number(element[key].x,0,794),y:number(element[key].y,0,1123)};}
          clean.children = element.children.map(child => cleanElement(child, true));
        }
      } else if (element.type === 'line' || element.type === 'arrow') {
        clean.x2 = number(element.x2, 0, 794);
        clean.y2 = number(element.y2, 0, 1123);
        if(element.routing!==undefined){if(element.routing!=='orthogonal')fail();clean.routing=element.routing;}
        for(const key of ['sourceId','targetId'])if(element[key]!=null){clean[key]=string(element[key],128);if(!clean[key])fail();}
        for(const key of ['sourceAnchor','targetAnchor'])if(element[key]!==undefined){if(!['n','e','s','w'].includes(element[key]))fail();clean[key]=element[key];}
        if(element.waypoints!==undefined){if(!Array.isArray(element.waypoints)||element.waypoints.length>32)fail();clean.waypoints=element.waypoints.map(p=>{if(!object(p))fail();return {x:number(p.x,12,782),y:number(p.y,12,1111)};});}
      } else if (element.type === 'text') {
        clean.text = string(element.text, 10_000);
        clean.fontSize = number(element.fontSize, child && clean.role ? 8 : TEXT_SIZE.min, TEXT_SIZE.max);
        if(element.width!==undefined){clean.width=number(element.width,1,794);if(clean.x+clean.width>794)fail();}
        if(element.height!==undefined){clean.height=number(element.height,1,1123);if(clean.y-clean.fontSize+clean.height>1123)fail();}
      } else if (element.type === 'pen') {
        if (!Array.isArray(element.points) || !element.points.length || element.points.length > 20_000) fail();
        clean.points = element.points.map((point) => {
          if (!object(point)) fail();
          return { x: number(point.x, 0, 794), y: number(point.y, 0, 1123) };
        });
      }
      return clean;
  }
  for (const page of value.pages) {
    if (!object(page) || !Array.isArray(page.elements) || page.elements.length > 2_000) fail();
    pageElementCount = 0;
    const cleanPage = { id: id(page.id), elements: page.elements.map(element => cleanElement(element)) };
    // Earlier versions emitted templates as adjacent frame/text pairs. Only
    // their precise geometry and separator signature qualify for migration.
    cleanPage.elements = cleanPage.elements.reduce((elements, frame, index, all) => {
      if (index > 0 && elements.at(-1)?.children?.includes(frame)) return elements;
      const text = all[index + 1];
      const legacy = frame.type === 'rect' && frame.width === 300 && [175, 225].includes(frame.height)
        && text?.type === 'text' && text.fontSize === 16
        && text.x === frame.x + 16 && text.y === frame.y + 30
        && /^─{10,}$/u.test(text.text.split('\n')[1] || '');
      if (!legacy) { elements.push(frame); return elements; }
      if (++pageElementCount > 2_000) fail();
      let groupId = uid();
      while (ids.has(groupId)) groupId = uid();
      ids.add(groupId);
      elements.push({ id: groupId, type: 'group', label: frame.height === 175 ? 'Entité BDD' : 'Classe UML', x: frame.x, y: frame.y, width: frame.width, height: frame.height, stroke: frame.stroke, strokeWidth: frame.strokeWidth, children: [frame, text] });
      return elements;
    }, []);
    result.pages.push(cleanPage);
  }
  return result;
}
