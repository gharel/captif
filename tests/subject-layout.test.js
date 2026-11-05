import test from 'node:test';
import assert from 'node:assert/strict';
import { pageBox, subjectWidthBounds, clampSubjectWidth, pageAt, nextZoomIndex } from '../src/subject-layout.js';
import { readPreferences, writePreferences } from '../src/workspace-preferences.js';

test('à 100 %, une page tient dans la largeur disponible, sans fraction qui déborde', () => {
  for (const available of [301, 333.5, 412.7, 560]) {
    for (const pageWidth of [595, 595.28, 612, 842]) {
      const box = pageBox(available, { width: pageWidth, height: 842 }, 1);
      assert.ok(box.width <= Math.floor(available), `${available} / ${pageWidth}`);
      assert.ok(box.width >= Math.floor(available) - 1);
      assert.equal(box.height, Math.floor(842 * box.scale));
    }
  }
});

test('le zoom agrandit à partir de la largeur ajustée, avec une largeur minimale', () => {
  const fit = pageBox(400, { width: 595, height: 842 }, 1);
  const zoomed = pageBox(400, { width: 595, height: 842 }, 1.5);
  assert.equal(zoomed.width, Math.floor(400 * 1.5));
  assert.ok(Math.abs(zoomed.scale - fit.scale * 1.5) < 0.01);
  assert.equal(pageBox(20, { width: 595, height: 842 }, 1).width, 160);
});

test('la largeur du panneau reste entre 260 px et ce qui laisse 360 px à la feuille', () => {
  const bounds = subjectWidthBounds({ workspace: 1440, pages: 224, library: 280 });
  assert.deepEqual(bounds, { min: 260, max: 576 });
  assert.equal(clampSubjectWidth(100, bounds), 260);
  assert.equal(clampSubjectWidth(450.6, bounds), 451);
  assert.equal(clampSubjectWidth(2000, bounds), 576);
  const narrow = subjectWidthBounds({ workspace: 800, pages: 224, library: 280 });
  assert.deepEqual(narrow, { min: 260, max: 260 });
  assert.equal(clampSubjectWidth(Number.NaN, bounds), 260);
});

test('la page courante est celle qui occupe le haut de la zone visible', () => {
  const tops = [0, 900, 1800];
  assert.equal(pageAt(tops, 0, 600), 1);
  assert.equal(pageAt(tops, 650, 600), 1);
  assert.equal(pageAt(tops, 750, 600), 2);
  assert.equal(pageAt(tops, 5000, 600), 3);
  assert.equal(pageAt([], 0, 600), 0);
});

test('les paliers de zoom sont bornés', () => {
  assert.equal(nextZoomIndex(2, 1, 6), 3);
  assert.equal(nextZoomIndex(5, 1, 6), 5);
  assert.equal(nextZoomIndex(0, -1, 6), 0);
});

test('la largeur du panneau du sujet est mémorisée localement, bornée et facultative', () => {
  let saved; const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  writePreferences({ grid: true, subjectWidth: 432 }, storage);
  assert.deepEqual(readPreferences(storage), { grid: true, subjectWidth: 432 });
  for (const bad of [-5, 12, 99999, 400.5, '400']) {
    writePreferences({ subjectWidth: bad }, storage);
    assert.deepEqual(readPreferences(storage), {});
  }
});
