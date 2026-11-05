/** Calculs purs du panneau Sujet : taille des pages, largeur du panneau, page courante. */
const MIN_PAGE_WIDTH = 160;
export const SUBJECT_MIN_WIDTH = 260;
export const DESK_MIN_WIDTH = 360;

/**
 * Taille d'une page pour une largeur disponible (hors marges et ascenseur). À 100 %, la page
 * occupe la largeur entière arrondie vers le bas : jamais d'ascenseur horizontal.
 */
export function pageBox(available, base, zoom) {
  const fit = Math.max(MIN_PAGE_WIDTH, Math.floor(available));
  const width = Math.floor(fit * zoom);
  const scale = width / base.width;
  return { scale, width, height: Math.floor(base.height * scale) };
}

/** Bornes de largeur du panneau : la feuille garde au moins DESK_MIN_WIDTH. */
export function subjectWidthBounds({ workspace, pages = 0, library = 0 }) {
  const max = Math.floor(workspace - pages - library - DESK_MIN_WIDTH);
  return { min: SUBJECT_MIN_WIDTH, max: Math.max(SUBJECT_MIN_WIDTH, max) };
}

export function clampSubjectWidth(value, { min, max }) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Numéro (à partir de 1) de la page dont le haut a passé le premier tiers de la zone visible. */
export function pageAt(tops, scrollTop, viewportHeight) {
  if (!tops.length) return 0;
  const line = scrollTop + viewportHeight / 3;
  let current = 1;
  tops.forEach((top, index) => { if (top <= line) current = index + 1; });
  return current;
}

export const nextZoomIndex = (index, step, count) => Math.max(0, Math.min(count - 1, index + step));
