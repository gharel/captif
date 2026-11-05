/**
 * Lecture du sujet PDF avec pdf.js, chargé à la demande et servi par l'application.
 * Rendu en canvas dans le document : pas de lecteur natif (barre Imprimer / Télécharger),
 * pas de liens actifs, et cliquer dans le sujet ne fait pas perdre le focus de la fenêtre.
 */
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

/**
 * Affiche le sujet dans `host` (conteneur défilant). Les pages sont rendues quand elles
 * deviennent visibles ; un changement de largeur ou de zoom les redessine.
 */
export function createSubjectViewer(host, { onError = () => {}, onZoom = () => {} } = {}) {
  let pdf = null, sha = null, zoomIndex = ZOOM_STEPS.indexOf(1), width = 0, generation = 0;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); renderPage(entry.target, generation); }
  }, { root: host, rootMargin: '600px 0px' });
  const resize = new ResizeObserver(() => {
    const next = host.clientWidth;
    if (pdf && Math.abs(next - width) > 24) layout();
  });
  resize.observe(host);

  async function renderPage(slot, token) {
    try {
      const page = await pdf.getPage(Number(slot.dataset.page));
      if (token !== generation) return;
      const viewport = page.getViewport({ scale: Number(slot.dataset.scale) });
      const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      await page.render({ canvas, viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0], annotationMode: 0 }).promise;
      if (token === generation) slot.replaceChildren(canvas);
    } catch { if (token === generation) slot.textContent = 'Page illisible.'; }
  }

  async function layout() {
    const token = ++generation;
    observer.disconnect();
    width = host.clientWidth;
    const fit = Math.max(160, width - 24);
    const slots = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      if (token !== generation) return;
      const base = page.getViewport({ scale: 1 });
      const scale = (fit / base.width) * ZOOM_STEPS[zoomIndex];
      const slot = document.createElement('div');
      slot.className = 'subject-page';
      slot.dataset.page = String(number); slot.dataset.scale = String(scale);
      slot.style.width = `${base.width * scale}px`; slot.style.height = `${base.height * scale}px`;
      slot.setAttribute('role', 'img');
      slot.setAttribute('aria-label', `Page ${number} sur ${pdf.numPages} du sujet`);
      slots.push(slot);
    }
    host.replaceChildren(...slots);
    for (const slot of slots) observer.observe(slot);
  }

  return {
    async show(record) {
      if (record.sha256 === sha && pdf) return;
      this.clear();
      const token = generation;
      try {
        const next = await openPdf(record.bytes);
        if (token !== generation) { next.loadingTask.destroy(); return; }
        pdf = next; sha = record.sha256; await layout();
      } catch { onError('Le sujet n’a pas pu être affiché.'); }
    },
    clear() {
      generation += 1; observer.disconnect(); host.replaceChildren();
      pdf?.loadingTask.destroy(); pdf = null; sha = null;
    },
    zoom(step) {
      zoomIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, zoomIndex + step));
      onZoom(ZOOM_STEPS[zoomIndex]);
      if (pdf) layout();
    },
    get zoomLevel() { return ZOOM_STEPS[zoomIndex]; },
  };
}
