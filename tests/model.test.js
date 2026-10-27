import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDocument, addPage, removePage, addElement, updateElement, removeElement,
  createHistory, commit, undo, redo, validateDocument,
  translateElement, elementBounds,
} from '../src/model.js';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

test('une nouvelle copie possède une page vide et une identité indépendante', () => {
  const first = createDocument();
  const second = createDocument();
  assert.equal(first.version, 1);
  assert.equal(typeof first.id, 'string');
  assert.ok(first.id.length > 0);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(first.student, { name: '' });
  assert.equal(first.exam, '');
  assert.equal(first.pages.length, 1);
  assert.ok(first.pages[0].id);
  assert.deepEqual(first.pages[0].elements, []);
  assert.notEqual(first.pages[0].id, second.pages[0].id);
});

test('ajouter et supprimer une page préserve les pages existantes et la copie source', () => {
  const source = deepFreeze(createDocument());
  const next = addPage(source);
  assert.equal(source.pages.length, 1);
  assert.equal(next.pages.length, 2);
  assert.deepEqual(next.pages[0], source.pages[0]);
  assert.notEqual(next.pages[0].id, next.pages[1].id);
  assert.deepEqual(next.pages[1].elements, []);
  deepFreeze(next);
  const removed = removePage(next, source.pages[0].id);
  assert.equal(removed.pages.length, 1);
  assert.equal(removed.pages[0].id, next.pages[1].id);
  assert.equal(next.pages.length, 2);
});

test('la dernière page et les identifiants inconnus ne détruisent pas la copie', () => {
  const doc = deepFreeze(createDocument());
  assert.deepEqual(removePage(doc, doc.pages[0].id), doc);
  assert.deepEqual(removePage(doc, 'inconnue'), doc);
  assert.deepEqual(updateElement(doc, doc.pages[0].id, 'inconnu', { x: 9 }), doc);
  assert.deepEqual(removeElement(doc, doc.pages[0].id, 'inconnu'), doc);
});

test('chaque outil produit un élément conservé sans mutation', () => {
  const types = ['rect', 'text', 'pen', 'ellipse', 'line', 'arrow'];
  let doc = createDocument();
  const pageId = doc.pages[0].id;
  for (const type of types) {
    const source = deepFreeze(doc);
    const element = deepFreeze({ id: `element-${type}`, type, x: 10, y: 20 });
    doc = addElement(source, pageId, element);
    assert.equal(doc.pages[0].elements.length, source.pages[0].elements.length + 1);
    assert.deepEqual(doc.pages[0].elements.at(-1), element);
  }
  assert.deepEqual(doc.pages[0].elements.map((element) => element.type), types);
});

test('déplacer ou modifier un élément ne touche ni ses voisins ni les autres pages', () => {
  let doc = addPage(createDocument());
  const pageId = doc.pages[0].id;
  doc = addElement(doc, pageId, { id: 'texte', type: 'text', x: 10, y: 20, text: 'Client' });
  doc = addElement(doc, pageId, { id: 'cadre', type: 'rect', x: 0, y: 0, width: 100, height: 80 });
  deepFreeze(doc);
  const next = updateElement(doc, pageId, 'texte', { x: 80, text: 'Commande' });
  assert.deepEqual(next.pages[0].elements[0], { id: 'texte', type: 'text', x: 80, y: 20, text: 'Commande' });
  assert.equal(doc.pages[0].elements[0].text, 'Client');
  assert.deepEqual(next.pages[0].elements[1], doc.pages[0].elements[1]);
  assert.deepEqual(next.pages[1], doc.pages[1]);
  const removed = removeElement(deepFreeze(next), pageId, 'texte');
  assert.deepEqual(removed.pages[0].elements.map((element) => element.id), ['cadre']);
  assert.equal(next.pages[0].elements.length, 2);
});

test('annuler et rétablir restaurent les documents, une branche nouvelle efface le rétablissement', () => {
  const initial = createDocument();
  const edited = addPage(initial);
  let history = createHistory(initial);
  assert.deepEqual(history, { past: [], present: initial, future: [] });
  history = commit(deepFreeze(history), edited);
  assert.deepEqual(history.present, edited);
  assert.equal(history.past.length, 1);
  const reverted = undo(deepFreeze(history));
  assert.deepEqual(reverted.present, initial);
  assert.deepEqual(redo(deepFreeze(reverted)).present, edited);
  const alternative = addElement(initial, initial.pages[0].id, { id: 'note', type: 'text', text: 'A' });
  const branched = commit(reverted, alternative);
  assert.deepEqual(branched.present, alternative);
  assert.deepEqual(branched.future, []);
  assert.deepEqual(redo(branched).present, alternative);
});

test('annuler ou rétablir sans historique est sans effet', () => {
  const history = deepFreeze(createHistory(createDocument()));
  assert.deepEqual(undo(history), history);
  assert.deepEqual(redo(history), history);
});

test('import : reconstruction par liste blanche et texte conservé comme donnée', () => {
  let doc = createDocument();
  doc = addElement(doc, doc.pages[0].id, {
    id: 'label', type: 'text', x: 10, y: 20, text: '<script>alert(1)</script>',
    stroke: '#123abc', strokeWidth: 2, fontSize: 16, onclick: 'interdit',
  });
  doc.secret = 'à ignorer';
  doc.pages[0].unsafe = 'à ignorer';
  const clean = validateDocument(doc);
  assert.equal(clean.secret, undefined);
  assert.equal(clean.pages[0].unsafe, undefined);
  assert.equal(clean.pages[0].elements[0].onclick, undefined);
  assert.equal(clean.pages[0].elements[0].text, '<script>alert(1)</script>');
  assert.notEqual(clean.pages, doc.pages);
});

test('import : rejet des identifiants dupliqués et des copies vides ou démesurées', () => {
  const doc = createDocument();
  assert.throws(() => validateDocument({ ...doc, pages: [] }));
  assert.throws(() => validateDocument({ ...doc, pages: Array.from({ length: 51 }, (_, index) => ({ id: `p${index}`, elements: [] })) }));
  assert.throws(() => validateDocument({ ...doc, pages: [doc.pages[0], doc.pages[0]] }));
});

test('import : rejet des valeurs non finies, du CSS injecté et des textes excessifs', () => {
  const doc = createDocument();
  const valid = { id: 'e', type: 'text', x: 10, y: 20, text: 'OK', stroke: '#111111', strokeWidth: 2, fontSize: 16 };
  const withElement = (element) => ({ ...doc, pages: [{ ...doc.pages[0], elements: [element] }] });
  for (const patch of [{ x: NaN }, { y: Infinity }, { x: -1 }, { stroke: 'url(x)' }, { fontSize: 100 }, { text: 'a'.repeat(10_001) }]) {
    assert.throws(() => validateDocument(withElement({ ...valid, ...patch })));
  }
  assert.equal(validateDocument(withElement(valid)).pages[0].elements[0].text, 'OK');
});

test('import : géométrie des formes, traits et tracés respecte les limites A4', () => {
  let doc = createDocument();
  const base = { x: 10, y: 10, stroke: '#111111', strokeWidth: 2 };
  const elements = [
    { ...base, id: 'r', type: 'rect', width: 100, height: 60 },
    { ...base, id: 'o', type: 'ellipse', width: 40, height: 80 },
    { ...base, id: 'l', type: 'line', x2: 100, y2: 100 },
    { ...base, id: 'a', type: 'arrow', x2: 200, y2: 200 },
    { ...base, id: 'p', type: 'pen', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] },
  ];
  for (const element of elements) doc = addElement(doc, doc.pages[0].id, element);
  assert.equal(validateDocument(doc).pages[0].elements.length, 5);
  const outside = updateElement(doc, doc.pages[0].id, 'r', { x: 780 });
  assert.throws(() => validateDocument(outside));
});

function umlGroup() {
  return {
    id: 'group-client', type: 'group', label: 'Classe UML', x: 70, y: 100, width: 300, height: 225,
    stroke: '#263833', strokeWidth: 2,
    children: [
      { id: 'group-frame', type: 'rect', x: 70, y: 100, width: 300, height: 225, stroke: '#263833', strokeWidth: 2 },
      { id: 'group-text', type: 'text', x: 86, y: 130, text: 'Client\n- id : int', fontSize: 16, stroke: '#263833', strokeWidth: 2 },
    ],
  };
}

test('un groupe se déplace avec son cadre et son texte sans modifier la source', () => {
  const group = deepFreeze(umlGroup());
  const moved = translateElement(group, 40, -20);
  assert.equal(moved.x, 110);
  assert.equal(moved.y, 80);
  assert.equal(moved.children[0].x, 110);
  assert.equal(moved.children[1].x, 126);
  assert.equal(moved.children[1].y, 110);
  assert.equal(group.children[1].x, 86);
  assert.deepEqual(elementBounds(moved), { x: 110, y: 80, width: 300, height: 225 });
});

test('modifier et supprimer un enfant préserve les autres éléments du groupe', () => {
  let doc = createDocument();
  const pageId = doc.pages[0].id;
  doc = addElement(doc, pageId, umlGroup());
  deepFreeze(doc);
  const edited = updateElement(doc, pageId, 'group-text', { text: 'Commande' });
  assert.equal(edited.pages[0].elements[0].children[1].text, 'Commande');
  assert.equal(doc.pages[0].elements[0].children[1].text, 'Client\n- id : int');
  assert.deepEqual(edited.pages[0].elements[0].children[0], doc.pages[0].elements[0].children[0]);
  const withoutText = removeElement(edited, pageId, 'group-text');
  assert.deepEqual(withoutText.pages[0].elements[0].children.map(e => e.id), ['group-frame']);
  assert.deepEqual(removeElement(edited, pageId, 'group-client').pages[0].elements, []);
});

test('groupe : sauvegarde JSON conserve la structure et élimine un ancien numéro étudiant', () => {
  let doc = createDocument();
  doc = addElement(doc, doc.pages[0].id, umlGroup());
  doc.student.number = 'ancien-numero';
  const clean = validateDocument(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(clean.student, { name: '' });
  assert.deepEqual(clean.pages[0].elements[0], umlGroup());
});

test('groupe : import refuse imbrication, enfants dupliqués et limites dépassées', () => {
  const doc = createDocument();
  const withGroup = group => ({ ...doc, pages: [{ ...doc.pages[0], elements: [group] }] });
  const nested = umlGroup(); nested.children.push({ ...umlGroup(), id: 'nested' });
  assert.throws(() => validateDocument(withGroup(nested)));
  const duplicated = umlGroup(); duplicated.children[1].id = duplicated.children[0].id;
  assert.throws(() => validateDocument(withGroup(duplicated)));
  const tooMany = umlGroup(); tooMany.children = Array.from({ length: 101 }, (_, i) => ({ ...tooMany.children[0], id: `child-${i}` }));
  assert.throws(() => validateDocument(withGroup(tooMany)));
  const outside = umlGroup(); outside.children[0].x = 790;
  assert.throws(() => validateDocument(withGroup(outside)));
});

test('la translation conserve aussi extrémités et points des tracés', () => {
  const line = { id: 'a', type: 'arrow', x: 40, y: 50, x2: 20, y2: 90 };
  const moved = translateElement(line, 10, 20);
  assert.deepEqual(moved, { id: 'a', type: 'arrow', x: 50, y: 70, x2: 30, y2: 110 });
  assert.deepEqual(elementBounds(moved), { x: 30, y: 70, width: 20, height: 40 });
  const pen = { id: 'p', type: 'pen', x: 40, y: 50, points: [{ x: 40, y: 50 }, { x: 10, y: 80 }] };
  assert.deepEqual(translateElement(pen, 10, 20).points, [{ x: 50, y: 70 }, { x: 20, y: 100 }]);
  assert.deepEqual(elementBounds(pen), { x: 10, y: 50, width: 30, height: 30 });
});

test('import groupe : la limite de page compte aussi les enfants', () => {
  const doc = createDocument();
  const elements = Array.from({ length: 20 }, (_, g) => {
    const group = umlGroup(); group.id = `g-${g}`;
    group.children = Array.from({ length: 100 }, (_, c) => ({ ...group.children[0], id: `c-${g}-${c}` }));
    return group;
  });
  assert.throws(() => validateDocument({ ...doc, pages: [{ ...doc.pages[0], elements }] }));
});
