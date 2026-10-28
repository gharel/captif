export const TEXT_STYLES = ['bold', 'italic', 'underline'];
const labels = { bold: 'Gras', italic: 'Italique', underline: 'Souligné' };
export function toggleTextFormat(format, style) {
  if (!TEXT_STYLES.includes(style)) throw new Error('Format de texte inconnu.');
  return { ...format, [style]: !format[style] };
}
const svg = body => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const formatIcons = {
  bold: '<path d="M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z"/>',
  italic: '<path d="M10 4h8M6 20h8M14 4l-4 16"/>',
  underline: '<path d="M6 4v7a6 6 0 0 0 12 0V4M4 21h16"/>',
};
export const textStyleIcon = style => svg(formatIcons[style] || '');
export function textFormatMarkup(format = {}) {
  return `<div class="inline-format-toolbar" role="toolbar" aria-label="Mise en forme du texte">${TEXT_STYLES.map(style => `<button type="button" data-text-format="${style}" aria-label="${labels[style]}" title="${labels[style]}" aria-pressed="${Boolean(format[style])}">${textStyleIcon(style)}</button>`).join('')}</div>`;
}
export function alignmentIcon(mode) {
  const paths = {
    left:'M4 3v18M8 6h12v4H8zM8 14h8v4H8z',
    right:'M20 3v18M4 6h12v4H4zM8 14h8v4H8z',
    'center-x':'M12 3v18M4 6h16v4H4zM7 14h10v4H7z',
    top:'M3 4h18M6 8h4v12H6zM14 8h4v8h-4z',
    bottom:'M3 20h18M6 4h4v12H6zM14 8h4v8h-4z',
    'center-y':'M3 12h18M6 4h4v16H6zM14 7h4v10h-4z',
    'distribute-x':'M3 3v18M21 3v18M7 7h3v10H7zM14 5h3v14h-3z',
    'distribute-y':'M3 3h18M3 21h18M7 7h10v3H7zM5 14h14v3H5z',
  };
  return svg(`<path d="${paths[mode] || paths.left}"/>`);
}
