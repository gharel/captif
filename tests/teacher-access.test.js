import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import {
  passwordHash, passwordMatches, readFailures, recordFailure, clearFailures,
  lockoutEnd, isLockedOut, lockoutMessage, FAILURES_KEY, HASH, SALT,
} from '../src/teacher-access.js';

const MINUTE = 60_000;
const salt = '00112233445566778899aabbccddeeff';
const fast = { salt, iterations: 1000 };

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('l’empreinte est une dérivation PBKDF2-SHA-256 normalisée NFC, sans le mot de passe en clair', async () => {
  const expected = pbkdf2Sync('café'.normalize('NFC'), Buffer.from(salt, 'hex'), 1000, 32, 'sha256').toString('hex');
  assert.equal(await passwordHash('café', fast), expected);
  assert.match(HASH, /^[0-9a-f]{64}$/);
  assert.match(SALT, /^[0-9a-f]{32}$/);
});

test('seul le bon mot de passe ouvre l’accès ; une saisie vide est refusée sans calcul', async () => {
  const hash = await passwordHash('Bon mot', fast);
  assert.equal(await passwordMatches('Bon mot', { ...fast, hash }), true);
  assert.equal(await passwordMatches('bon mot', { ...fast, hash }), false);
  assert.equal(await passwordMatches('', { ...fast, hash }), false);
});

test('chaque échec allonge le blocage jusqu’à un plafond d’une heure, jamais définitif', () => {
  let failures = null;
  const durations = [];
  for (let i = 0; i < 7; i += 1) {
    failures = recordFailure(failures, 1_000);
    durations.push(lockoutEnd(failures) - 1_000);
  }
  assert.deepEqual(durations, [MINUTE, 5 * MINUTE, 15 * MINUTE, 60 * MINUTE, 60 * MINUTE, 60 * MINUTE, 60 * MINUTE]);
  assert.equal(lockoutEnd(null), 0);
  assert.equal(isLockedOut(failures, 1_000 + 60 * MINUTE - 1), true);
  assert.equal(isLockedOut(failures, 1_000 + 60 * MINUTE), false);
});

test('recordFailure ne modifie pas l’état précédent', () => {
  const first = Object.freeze({ count: 1, last: 10 });
  assert.deepEqual(recordFailure(first, 20), { count: 2, last: 20 });
  assert.deepEqual(first, { count: 1, last: 10 });
});

test('le message annonce la durée et l’heure de réouverture, vide hors blocage', () => {
  const now = new Date(2026, 10, 6, 14, 30).getTime();
  const failures = { count: 2, last: now };
  assert.match(lockoutMessage(failures, now), /5 minutes/);
  assert.match(lockoutMessage(failures, now), /14 h 35/);
  assert.equal(lockoutMessage(failures, now + 5 * MINUTE), '');
  assert.equal(lockoutMessage(null, now), '');
});

test('les échecs relus du stockage sont nettoyés et le bon mot de passe les efface', () => {
  const storage = memoryStorage([[FAILURES_KEY, JSON.stringify({ count: 2, last: 50 })]]);
  assert.deepEqual(readFailures(storage), { count: 2, last: 50 });
  for (const damaged of ['{', JSON.stringify({ count: 0, last: 1 }), JSON.stringify({ count: 1.5, last: 1 }), JSON.stringify({ count: 1, last: 'x' })]) {
    storage.setItem(FAILURES_KEY, damaged);
    assert.equal(readFailures(storage), null);
  }
  clearFailures(storage);
  assert.equal(storage.values.has(FAILURES_KEY), false);
  assert.equal(readFailures({ getItem() { throw new Error('bloqué'); } }), null);
});
