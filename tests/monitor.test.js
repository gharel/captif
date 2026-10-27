import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonitor, validateSession } from '../src/monitor.js';

function setup() {
  let time = 1_000;
  let notifications = 0;
  const monitor = createMonitor({ now: () => time, onChange: () => { notifications += 1; } });
  return { monitor, at: (value) => { time = value; }, notifications: () => notifications };
}

test('aucun suivi avant démarrage explicite', () => {
  const { monitor } = setup();
  monitor.signal('focus', false);
  monitor.signal('visibility', false);
  monitor.signal('fullscreen', true);
  monitor.signal('fullscreen', false);
  const state = monitor.snapshot();
  assert.equal(state.status, 'idle');
  assert.equal(state.startedAt, null);
  assert.equal(state.endedAt, null);
  assert.equal(state.absenceCount, 0);
  assert.equal(state.totalAwayMs, 0);
  assert.equal(state.fullscreenExits, 0);
  assert.deepEqual(state.incidents, []);
});

test('focus perdu puis retrouvé : une absence et sa durée réelle', () => {
  const { monitor, at, notifications } = setup();
  monitor.start();
  at(2_000);
  monitor.signal('focus', false);
  at(5_500);
  let state = monitor.snapshot();
  assert.equal(state.status, 'active');
  assert.equal(state.startedAt, 1_000);
  assert.equal(state.absenceCount, 1);
  assert.equal(state.totalAwayMs, 3_500);
  assert.equal(state.incidents[0].end, null);
  assert.equal(state.incidents[0].durationMs, 3_500);
  monitor.signal('focus', true);
  at(9_000);
  state = monitor.snapshot();
  assert.equal(state.totalAwayMs, 3_500);
  assert.equal(state.incidents[0].start, 2_000);
  assert.equal(state.incidents[0].end, 5_500);
  assert.deepEqual(state.incidents[0].reasons, ['focus']);
  assert.ok(notifications() > 0);
});

test('blur et page masquée qui se chevauchent comptent une seule absence', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(2_000);
  monitor.signal('focus', false);
  at(2_100);
  monitor.signal('visibility', false);
  at(3_000);
  monitor.signal('focus', true);
  assert.equal(monitor.snapshot().incidents[0].end, null);
  at(7_000);
  monitor.signal('visibility', true);
  const state = monitor.snapshot();
  assert.equal(state.absenceCount, 1);
  assert.equal(state.totalAwayMs, 5_000);
  assert.equal(state.incidents[0].durationMs, 5_000);
  assert.deepEqual(new Set(state.incidents[0].reasons), new Set(['focus', 'visibility']));
});

test('les événements répétés ne doublent pas les absences, les intervalles séparés restent distincts', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(2_000);
  monitor.signal('visibility', false);
  at(3_000);
  monitor.signal('visibility', false);
  at(4_000);
  monitor.signal('visibility', true);
  monitor.signal('visibility', true);
  at(5_000);
  monitor.signal('focus', false);
  at(8_000);
  monitor.signal('focus', true);
  const state = monitor.snapshot();
  assert.equal(state.absenceCount, 2);
  assert.equal(state.totalAwayMs, 5_000);
  assert.deepEqual(state.incidents.map((incident) => incident.durationMs), [2_000, 3_000]);
});

test('les sorties plein écran nécessitent une transition réelle et restent un compteur séparé', () => {
  const { monitor } = setup();
  monitor.start();
  monitor.signal('fullscreen', false);
  assert.equal(monitor.snapshot().fullscreenExits, 0);
  monitor.signal('fullscreen', true);
  monitor.signal('fullscreen', false);
  monitor.signal('fullscreen', false);
  assert.equal(monitor.snapshot().fullscreenExits, 1);
  monitor.signal('fullscreen', true);
  monitor.signal('fullscreen', false);
  const state = monitor.snapshot();
  assert.equal(state.fullscreenExits, 2);
  assert.equal(state.absenceCount, 0);
  assert.equal(state.totalAwayMs, 0);
});

test('terminer ferme une absence, fige la durée et ignore les signaux ultérieurs', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(2_000);
  monitor.signal('visibility', false);
  at(6_000);
  monitor.finish();
  const finished = monitor.snapshot();
  assert.equal(finished.status, 'finished');
  assert.equal(finished.endedAt, 6_000);
  assert.equal(finished.totalAwayMs, 4_000);
  assert.equal(finished.incidents[0].end, 6_000);
  at(50_000);
  monitor.signal('focus', false);
  monitor.signal('fullscreen', true);
  monitor.signal('fullscreen', false);
  monitor.finish();
  assert.deepEqual(monitor.snapshot(), finished);
});

test('démarrer deux fois ne remet pas à zéro une session en cours', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(2_000);
  monitor.signal('focus', false);
  at(3_000);
  monitor.start();
  const state = monitor.snapshot();
  assert.equal(state.startedAt, 1_000);
  assert.equal(state.absenceCount, 1);
  assert.equal(state.totalAwayMs, 1_000);
});

test('les snapshots sont des copies : un consommateur ne peut pas réécrire le journal', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(2_000);
  monitor.signal('focus', false);
  at(3_000);
  monitor.signal('focus', true);
  const state = monitor.snapshot();
  state.incidents[0].reasons.push('inventée');
  state.incidents[0].durationMs = 999;
  state.incidents.length = 0;
  const actual = monitor.snapshot();
  assert.equal(actual.incidents.length, 1);
  assert.deepEqual(actual.incidents[0].reasons, ['focus']);
  assert.equal(actual.incidents[0].durationMs, 1_000);
});

test('une reprise active conserve le journal et comptabilise une interruption depuis la dernière sauvegarde', () => {
  const restored = {
    status: 'active', startedAt: 1_000, endedAt: null, savedAt: 5_000,
    incidents: [{ start: 2_000, end: 3_000, durationMs: 1_000, reasons: ['focus'] }],
    absenceCount: 1, totalAwayMs: 1_000, fullscreenExits: 2,
  };
  const monitor = createMonitor({ now: () => 9_000, onChange: () => {}, restored });
  const state = monitor.snapshot();
  assert.equal(state.status, 'active');
  assert.equal(state.startedAt, 1_000);
  assert.equal(state.fullscreenExits, 2);
  assert.equal(state.absenceCount, 2);
  assert.equal(state.totalAwayMs, 5_000);
  assert.deepEqual(state.incidents[0], restored.incidents[0]);
  assert.equal(state.incidents[1].start, 5_000);
  assert.ok(state.incidents[1].reasons.includes('reload'));
});

test('une horloge qui recule ne produit ni durée négative ni absence plus longue que la session', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(4_000);
  monitor.signal('focus', false);
  at(6_000);
  assert.equal(monitor.snapshot().totalAwayMs, 2_000);
  at(2_000);
  monitor.signal('focus', true);
  at(1_500);
  monitor.signal('visibility', false);
  at(1_000);
  monitor.finish();
  const state = monitor.snapshot();
  assert.equal(state.endedAt, 6_000);
  assert.equal(state.totalAwayMs, 2_000);
  assert.ok(state.incidents.every((entry) => entry.durationMs >= 0));
  assert.ok(state.totalAwayMs <= state.endedAt - state.startedAt);
  assert.deepEqual(validateSession(state), state);
});

test('les sorties plein écran sont datées et les snapshots restent indépendants', () => {
  const { monitor, at } = setup();
  monitor.start();
  monitor.signal('fullscreen', true);
  at(3_000);
  monitor.signal('fullscreen', false);
  assert.deepEqual(monitor.snapshot().fullscreenEvents, [{ at: 3_000, type: 'exit' }]);
  const state = monitor.snapshot();
  state.fullscreenEvents[0].at = 1;
  assert.equal(monitor.snapshot().fullscreenEvents[0].at, 3_000);
});

test('validation : null est accepté, snapshots valides reconstruits par liste blanche', () => {
  const { monitor } = setup();
  assert.equal(validateSession(null), null);
  assert.equal(validateSession(undefined), null);
  assert.deepEqual(validateSession(monitor.snapshot()), monitor.snapshot());
  monitor.start();
  const original = monitor.snapshot();
  const clean = validateSession({ ...original, unwanted: '<script>' });
  assert.equal(clean.unwanted, undefined);
  assert.deepEqual(clean, original);
  assert.notEqual(clean.incidents, original.incidents);
});

test('validation : rejette états, horodatages, compteurs et intervalles incohérents', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(2_000);
  monitor.signal('focus', false);
  at(3_000);
  monitor.signal('focus', true);
  at(4_000);
  monitor.finish();
  const valid = monitor.snapshot();
  const invalid = [
    {}, { ...valid, status: 'unknown' }, { ...valid, startedAt: '1000' },
    { ...valid, endedAt: 500 }, { ...valid, totalAwayMs: 2_000 },
    { ...valid, absenceCount: 99 }, { ...valid, fullscreenExits: -1 },
    { ...valid, incidents: null },
    { ...valid, incidents: [{ ...valid.incidents[0], start: 0 }] },
    { ...valid, incidents: [{ ...valid.incidents[0], end: null }] },
    { ...valid, incidents: [{ ...valid.incidents[0], reasons: ['inventée'] }] },
    { ...valid, incidents: [...valid.incidents, valid.incidents[0]] },
    { ...valid, fullscreenExits: 1, fullscreenEvents: [{ at: 9_000, type: 'exit' }] },
  ];
  for (const state of invalid) {
    assert.throws(() => validateSession(state), /invalide/);
    assert.throws(() => createMonitor({ restored: state }), /invalide/);
  }
});

test('une reprise avec horloge en recul ne revient pas avant la dernière sauvegarde', () => {
  const { monitor, at } = setup();
  monitor.start();
  at(8_000);
  const restored = monitor.snapshot();
  const resumed = createMonitor({ now: () => 5_000, restored });
  resumed.signal('focus', true);
  resumed.signal('visibility', true);
  resumed.finish();
  const state = resumed.snapshot();
  assert.equal(state.endedAt, 8_000);
  assert.equal(state.totalAwayMs, 0);
  assert.deepEqual(validateSession(state), state);
});
