/**
 * Calcule l'empreinte d'un nouveau mot de passe enseignant (npm run mot-de-passe).
 * Le mot de passe est lu au clavier, jamais passé en argument : il ne reste ni dans
 * l'historique du terminal ni dans le code. Seuls le sel et l'empreinte sont à recopier
 * dans src/teacher-access.js.
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITERATIONS = 600_000;

function readPassword() {
  return new Promise(resolve => {
    const input = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Masque la saisie : rien ne s'affiche pendant la frappe.
    input._writeToOutput = () => {};
    process.stdout.write('Nouveau mot de passe : ');
    input.question('', answer => { input.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const password = (await readPassword()).normalize('NFC');
if (!password) {
  console.error('Mot de passe vide : rien à faire.');
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), ITERATIONS, 32, 'sha256').toString('hex');
console.log('À recopier dans src/teacher-access.js :');
console.log(`export const SALT = '${salt}';`);
console.log(`export const HASH = '${hash}';`);
