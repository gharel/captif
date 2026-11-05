/**
 * Lecture du sujet PDF avec pdf.js, chargé à la demande et servi par l'application.
 * Rendu en canvas dans le document : pas de lecteur natif (barre Imprimer / Télécharger),
 * pas de liens actifs, et cliquer dans le sujet ne fait pas perdre le focus de la fenêtre.
 */
import { pageBox, pageAt, nextZoomIndex } from './subject-layout.js';

let loading = null;
function loadPdfjs() {
  loading ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return loading;
}

/** Ouvre une copie des octets : pdf.js transfère le tampon qu'on lui donne au worker. */
async function openPdf(buffer) {
  const lib = await loadPdfjs();
  return lib.getDocument({ data: new Uint8Array(buffer.slice(0)), enableXfa: false, stopAtErrors: true }).promise;
}

export async function countPdfPages(buffer) {
  const pdf = await openPdf(buffer);
  try { return pdf.numPages; } finally { pdf.loadingTask.destroy(); }
}

export const ZOOM_STEPS = [0.6, 0.8, 1, 1.25, 1.5, 2];
const FIT = ZOOM_STEPS.indexOf(1);

/**
 * Affiche le sujet dans `host` (conteneur défilant). À 100 %, chaque page occupe la largeur
 * disponible sans ascenseur horizontal. Les pages sont rendues quand elles deviennent visibles ;
 * un changement de largeur ou de zoom les redessine en gardant la position de lecture.
 */
export function createSubjectViewer(host, { onError = () => {}, onZoom = () => {}, onPage = () => {} } = {}) {
  let pdf = null, sha = null, zoomIndex = FIT, available = 0, generation = 0, slots = [], resizeTimer = null, pageFrame = 0;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); renderPage(entry.target, generation); }
  }, { root: host, rootMargin: '600px 0px' });
  // Largeur utile : sans marges intérieures ni ascenseur (réservé par scrollbar-gutter).
  const measure = () => {
    const style = getComputedStyle(host);
    return host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  };
  const resize = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (pdf && Math.abs(measure() - available) >= 2) layout(); }, 120);
  });
  resize.observe(host);
  const reportPage = () => {
    cancelAnimationFrame(pageFrame);
    pageFrame = requestAnimationFrame(() => onPage(pageAt(slots.map(slot => slot.offsetTop), host.scrollTop, host.clientHeight), slots.length));
  };
  host.addEventListener('scroll', reportPage, { passive: true });

  async function renderPage(slot, token) {
    try {
      const page = await pdf.getPage(Number(slot.dataset.page));
      if (token !== generation) return;
      const viewport = page.getViewport({ scale: Number(slot.dataset.scale) });
      const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = slot.style.width; canvas.style.height = slot.style.height;
      await page.render({ canvas, viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0], annotationMode: 0 }).promise;
      if (token === generation) slot.replaceChildren(canvas);
    } catch { if (token === generation) slot.textContent = 'Page illisible.'; }
  }

  async function layout() {
    const token = ++generation;
    const ratioY = host.scrollHeight > host.clientHeight ? host.scrollTop / host.scrollHeight : 0;
    const ratioX = host.scrollWidth > host.clientWidth ? host.scrollLeft / host.scrollWidth : 0;
    available = measure();
    const next = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      if (token !== generation) return;
      const box = pageBox(available, page.getViewport({ scale: 1 }), ZOOM_STEPS[zoomIndex]);
      const slot = document.createElement('div');
      slot.className = 'subject-page';
      slot.dataset.page = String(number); slot.dataset.scale = String(box.scale);
      slot.style.width = `${box.width}px`; slot.style.height = `${box.height}px`;
      slot.setAttribute('role', 'img');
      slot.setAttribute('aria-label', `Page ${number} sur ${pdf.numPages} du sujet`);
      next.push(slot);
    }
    observer.disconnect();
    slots = next;
    host.replaceChildren(...slots);
    host.scrollTop = ratioY * host.scrollHeight;
    host.scrollLeft = ratioX * host.scrollWidth;
    for (const slot of slots) observer.observe(slot);
    reportPage();
  }

  const setZoom = index => {
    zoomIndex = index;
    onZoom(ZOOM_STEPS[zoomIndex]);
    if (pdf) layout();
  };

  return {
    async show(record) {
      if (record.sha256 === sha && pdf) return;
      this.clear();
      const token = generation;
      try {
        const next = await openPdf(record.bytes);
        if (token !== generation) { next.loadingTask.destroy(); return; }
        pdf = next; sha = record.sha256; host.scrollTop = 0; await layout();
      } catch { onError('Le sujet n’a pas pu être affiché.'); }
    },
    clear() {
      generation += 1; observer.disconnect(); host.replaceChildren(); slots = [];
      pdf?.loadingTask.destroy(); pdf = null; sha = null;
      onPage(0, 0);
    },
    zoom(step) { setZoom(nextZoomIndex(zoomIndex, step, ZOOM_STEPS.length)); },
    /** Revient à la largeur du panneau (100 %). */
    fit() { setZoom(FIT); },
    get zoomLevel() { return ZOOM_STEPS[zoomIndex]; },
  };
}
