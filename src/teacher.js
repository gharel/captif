import './teacher-page.css';
import { requireTeacherAccess } from './teacher-access.js';
import { createSubjectStore, prepareSubject, announceSubjectChange, MAX_SUBJECT_BYTES } from './subject.js';
import { countPdfPages, createSubjectViewer } from './subject-viewer.js';

const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const root = document.querySelector('#teacher');
root.innerHTML = `
  <header class="app-header teacher-header">
    <a href="./" class="brand" aria-label="Captif, retour à la copie"><span class="brand-copy"><span class="brand-title">Captif</span><small>ESPACE ENSEIGNANT</small></span></a>
    <div class="flex gap-2"><a class="button secondary" href="./">Retour à la copie</a><button id="lock" class="button secondary" type="button">Verrouiller</button></div>
  </header>
  <main class="teacher-main">
    <section class="teacher-card" aria-labelledby="teacher-title">
      <div><span class="eyebrow">SUJET DE L'ÉVALUATION</span><h1 id="teacher-title">Sujet sur ce poste</h1></div>
      <p>Le PDF déposé ici sert de consignes. L'étudiant le lit dès le démarrage de l'évaluation, sans pouvoir le remplacer ni le retirer. Un seul sujet est conservé : un nouveau dépôt remplace l'ancien.</p>
      <div id="subject-summary"></div>
      <div class="teacher-actions"><button id="deposit" class="button primary" type="button">Déposer un sujet PDF</button><button id="remove" class="button secondary danger-button" type="button" hidden>Retirer le sujet</button></div>
      <p id="teacher-status" class="teacher-status" role="status" aria-live="polite"></p>
      <p class="teacher-limits">Le sujet reste dans ce navigateur : déposez-le sur chaque poste. Effacer les données du site l'efface aussi. PDF de 20 Mo au plus.</p>
    </section>
    <section class="teacher-preview" aria-label="Aperçu du sujet">
      <div class="subject-panel"><div class="subject-panel-heading"><div><span class="eyebrow">APERÇU</span><h2 id="preview-title">Aucun sujet</h2></div><div class="subject-zoom"><button id="zoom-out" class="tool" type="button" aria-label="Réduire l'aperçu">−</button><output id="zoom-level">100 %</output><button id="zoom-in" class="tool" type="button" aria-label="Agrandir l'aperçu">＋</button></div></div><div id="preview" class="subject-scroll" tabindex="0" aria-label="Pages du sujet"></div></div>
    </section>
  </main>
  <input id="pdf-input" type="file" accept="application/pdf,.pdf" hidden />
  <dialog id="teacher-confirm" aria-labelledby="teacher-confirm-title"><form method="dialog"><h2 id="teacher-confirm-title">Confirmer</h2><p id="teacher-confirm-message"></p><div class="dialog-actions"><button class="button secondary" value="cancel" autofocus>Annuler</button><button class="button primary" value="confirm">Confirmer</button></div></form></dialog>`;

const store = createSubjectStore();
const $ = selector => root.querySelector(selector);
const status = (message, error = false) => { $('#teacher-status').textContent = message; $('#teacher-status').classList.toggle('is-error', error); };
const viewer = createSubjectViewer($('#preview'), { onError: message => status(message, true), onZoom: level => { $('#zoom-level').textContent = `${Math.round(level * 100)} %`; } });
let current = {};

const sizeLabel = bytes => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} ko` : `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
const dateLabel = at => new Date(at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

function confirmAction(message) {
  const dialog = $('#teacher-confirm');
  $('#teacher-confirm-message').textContent = message;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}

async function refresh() {
  current = await store.read();
  const { subject, error } = current;
  $('#remove').hidden = !subject && !error;
  $('#deposit').textContent = subject || error ? 'Remplacer le sujet PDF' : 'Déposer un sujet PDF';
  if (subject) {
    $('#subject-summary').innerHTML = `<dl class="teacher-facts"><dt>Fichier</dt><dd>${esc(subject.name)}</dd><dt>Pages</dt><dd>${subject.pages}</dd><dt>Taille</dt><dd>${sizeLabel(subject.size)}</dd><dt>Déposé le</dt><dd>${esc(dateLabel(subject.addedAt))}</dd><dt>Empreinte</dt><dd><code>${subject.sha256.slice(0, 12)}</code></dd></dl>`;
    $('#preview-title').textContent = subject.name;
    await viewer.show(subject);
  } else {
    $('#subject-summary').innerHTML = error ? `<p class="teacher-status is-error">${esc(error)} Retirez-le puis déposez de nouveau le PDF.</p>` : '<p>Aucun sujet déposé sur ce poste.</p>';
    $('#preview-title').textContent = 'Aucun sujet';
    viewer.clear();
  }
}

$('#deposit').onclick = () => $('#pdf-input').click();
$('#pdf-input').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > MAX_SUBJECT_BYTES) throw new Error('Fichier trop volumineux (20 Mo maximum).');
    status('Vérification du PDF…');
    const record = await prepareSubject({ name: file.name, size: file.size, bytes: new Uint8Array(await file.arrayBuffer()) }, { countPages: countPdfPages });
    if ((current.subject || current.error) && !await confirmAction(`Remplacer le sujet actuel par « ${record.name} » ? L'ancien sujet ne sera pas conservé.`)) { status(''); return; }
    await store.replace(record);
    announceSubjectChange();
    await refresh();
    status(`Sujet déposé : ${record.name}, ${record.pages} page${record.pages > 1 ? 's' : ''}.`);
  } catch (error) { status(`Dépôt refusé : ${error.message} Le sujet actuel est inchangé.`, true); }
};
$('#remove').onclick = async () => {
  if (!await confirmAction('Retirer le sujet de ce poste ? Les étudiants ne verront plus de consignes.')) return;
  try { await store.remove(); announceSubjectChange(); await refresh(); status('Sujet retiré de ce poste.'); }
  catch { status('Le sujet n’a pas pu être retiré.', true); }
};
$('#zoom-out').onclick = () => viewer.zoom(-1);
$('#zoom-in').onclick = () => viewer.zoom(1);
$('#lock').onclick = () => location.reload();

await requireTeacherAccess(document.body);
await refresh().catch(() => status('Sujet indisponible sur ce navigateur.', true));
