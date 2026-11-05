/**
 * Porte d'accès de l'espace enseignant : un mot de passe est demandé avant de déposer le sujet.
 *
 * Seule l'empreinte PBKDF2-SHA-256 du mot de passe figure ici (`npm run mot-de-passe` la
 * calcule). Le déverrouillage n'est jamais retenu : la page sert sur des postes d'étudiants.
 * Chaque échec bloque la saisie 1 min, 5 min, 15 min puis 1 h, sans blocage définitif qu'un
 * étudiant pourrait provoquer pour écarter l'enseignant. Porte dissuasive : le site reste public.
 */
export const SALT = '284ebb77d9526d1b91143afc658a187b';
/** Empreinte, pas le mot de passe : la publier ne le révèle pas. */
export const HASH = '24c2ef4b388d8d476dec140c6fa2602781626e9a94d31dbf50436e994f0e0be7';
export const ITERATIONS = 600_000;
export const FAILURES_KEY = 'captif-teacher-failures';

const MINUTE = 60_000;
const LOCKOUTS = [
  { duration: MINUTE, label: '1 minute' },
  { duration: 5 * MINUTE, label: '5 minutes' },
  { duration: 15 * MINUTE, label: '15 minutes' },
  { duration: 60 * MINUTE, label: '1 heure' },
];

const bytesFromHex = hex => new Uint8Array(hex.match(/../g).map(pair => parseInt(pair, 16)));
const hexFromBytes = buffer => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');

export async function passwordHash(password, { salt = SALT, iterations = ITERATIONS } = {}) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('Chiffrement indisponible');
  const key = await subtle.importKey('raw', new TextEncoder().encode(String(password).normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytesFromHex(salt), iterations }, key, 256);
  return hexFromBytes(bits);
}

export async function passwordMatches(input, { salt = SALT, hash = HASH, iterations = ITERATIONS } = {}) {
  if (!input) return false;
  return (await passwordHash(input, { salt, iterations })) === hash;
}

export function readFailures(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(FAILURES_KEY) || 'null');
    if (!Number.isInteger(value?.count) || value.count < 1 || !Number.isFinite(value.last)) return null;
    return { count: value.count, last: value.last };
  } catch { return null; }
}

export function writeFailures(failures, storage = globalThis.localStorage) {
  try { storage.setItem(FAILURES_KEY, JSON.stringify(failures)); return true; } catch { return false; }
}

export function clearFailures(storage = globalThis.localStorage) {
  try { storage.removeItem(FAILURES_KEY); } catch { /* Le blocage expire de lui-même. */ }
}

export const recordFailure = (failures, now) => ({ count: (failures?.count ?? 0) + 1, last: now });

const lockoutFor = failures => LOCKOUTS[Math.min(failures.count, LOCKOUTS.length) - 1];

/** Fin du blocage en ms, 0 sans échec. */
export function lockoutEnd(failures) {
  return failures ? failures.last + lockoutFor(failures).duration : 0;
}

export const isLockedOut = (failures, now) => lockoutEnd(failures) > now;

export function lockoutMessage(failures, now) {
  if (!isLockedOut(failures, now)) return '';
  const end = new Date(Math.ceil(lockoutEnd(failures) / MINUTE) * MINUTE);
  const hour = `${end.getHours()} h ${String(end.getMinutes()).padStart(2, '0')}`;
  return `Mot de passe incorrect : saisie bloquée ${lockoutFor(failures).label}, jusqu’à ${hour}.`;
}

/**
 * Affiche la porte par-dessus `root` jusqu'au bon mot de passe. Le reste de la page est inert.
 * Résout la promesse une fois l'accès ouvert ; rien n'est mémorisé.
 */
export function requireTeacherAccess(root = document.body) {
  return new Promise(resolve => {
    const others = [...root.children];
    for (const node of others) node.inert = true;
    const gate = document.createElement('div');
    gate.className = 'teacher-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'teacher-gate-title');
    gate.innerHTML = `<form class="teacher-gate-card"><span class="eyebrow">ESPACE ENSEIGNANT</span><h1 id="teacher-gate-title">Accès réservé</h1><p>Saisissez le mot de passe enseignant pour déposer le sujet sur ce poste.</p><label class="field-label" for="teacher-password">Mot de passe</label><div class="teacher-gate-row"><input id="teacher-password" type="password" autocomplete="current-password" required aria-describedby="teacher-gate-error" /><button class="button primary" type="submit">Entrer</button></div><p id="teacher-gate-error" class="fullscreen-error" role="alert"></p><a class="text-button" href="./">Retour à la copie</a></form>`;
    const form = gate.querySelector('form');
    const input = gate.querySelector('input');
    const button = gate.querySelector('button');
    const error = gate.querySelector('#teacher-gate-error');
    let memoryFailures = null;
    let timer = null;
    const currentFailures = () => readFailures() ?? memoryFailures;
    const applyLockout = () => {
      clearTimeout(timer);
      const failures = currentFailures();
      const now = Date.now();
      const locked = isLockedOut(failures, now);
      input.disabled = locked; button.disabled = locked;
      error.textContent = lockoutMessage(failures, now);
      if (locked) timer = setTimeout(() => { if (!applyLockout()) input.focus(); }, lockoutEnd(failures) - now);
      return locked;
    };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (applyLockout()) return;
      button.disabled = true;
      let correct;
      try { correct = await passwordMatches(input.value); } catch {
        error.textContent = 'Vérification impossible ici : ouvrez Captif en https:// ou sur localhost.';
        button.disabled = false; return;
      }
      if (!correct) {
        const failures = recordFailure(currentFailures(), Date.now());
        if (!writeFailures(failures)) memoryFailures = failures;
        input.value = ''; applyLockout(); return;
      }
      clearFailures(); memoryFailures = null; clearTimeout(timer);
      gate.remove();
      for (const node of others) node.inert = false;
      resolve();
    });
    root.append(gate);
    if (!applyLockout()) input.focus();
  });
}
