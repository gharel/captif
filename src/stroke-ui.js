import { scaledDash } from './stroke.js';
export const STROKE_PATTERNS = [
  { value: '', label: 'Plein' }, { value: '8 5', label: 'Tirets' }, { value: '1 5', label: 'Pointillés' }, { value: '8 4 1 4', label: 'Mixte' },
];
const colors = ['#263833','#334155','#635bff','#2563eb','#059669','#dc2626','#d97706','#9333ea'];
const sample = (pattern, width=2) => `<svg viewBox="0 0 76 14" aria-hidden="true"><path d="M4 7H72" stroke="currentColor" stroke-width="${width}" stroke-linecap="round"${pattern?` stroke-dasharray="${pattern}"`:''}/></svg>`;
const controlIcon = path => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
export function strokeMarkup() {
  return `<div class="drawing-style-row"><span>STYLE DU TRACÉ</span><button id="stroke-trigger" type="button" aria-expanded="false" aria-controls="stroke-popover" title="Couleur, épaisseur et type de trait"><i id="stroke-chip"></i><span class="stroke-trigger-preview">${sample('')}</span><strong id="stroke-summary">1 px · Plein</strong><span class="stroke-chevron">${controlIcon('M6 9l6 6 6-6')}</span></button></div>
  <section id="stroke-popover" class="stroke-popover" aria-label="Style du tracé" hidden><div class="stroke-popover-heading"><div><strong>Style du tracé</strong><small>Pour la sélection et les prochains tracés</small></div><button id="stroke-close" type="button" aria-label="Fermer le style du tracé">${controlIcon('M6 6l12 12M18 6L6 18')}</button></div>
  <div class="stroke-section"><label class="stroke-label" for="color">Couleur <span id="stroke-hex">#263833</span></label><div class="stroke-swatches">${colors.map(color=>`<button type="button" data-stroke-color="${color}" style="--swatch:${color}" aria-label="Couleur ${color}" title="${color}"></button>`).join('')}<label class="custom-swatch" title="Couleur personnalisée"><input id="color" type="color" value="#263833" aria-label="Couleur personnalisée du tracé" /><span>＋</span></label></div></div>
  <div class="stroke-section"><label class="stroke-label" for="thickness">Épaisseur <output id="thickness-value">1 px</output></label><input type="range" id="thickness" min="1" max="10" step="1" value="1" aria-label="Épaisseur du tracé" /></div>
  <div class="stroke-section"><span class="stroke-label">Type de trait</span><div class="stroke-patterns">${STROKE_PATTERNS.map(pattern=>`<button type="button" data-stroke-pattern="${pattern.value}" aria-pressed="${!pattern.value}">${sample(pattern.value)}<span>${pattern.label}</span></button>`).join('')}</div></div><div class="stroke-live-preview"><span>APERÇU</span><svg viewBox="0 0 240 38" aria-label="Aperçu du trait"><path id="stroke-preview-path" d="M12 19H228" fill="none" stroke="#263833" stroke-width="1" stroke-linecap="round"/></svg></div></section>`;
}

export function mountStrokeUi({onChange,getCurrent}) {
  const $=id=>document.getElementById(id);
  function sync() {
    const {color,thickness,dash=''}=getCurrent();
    $('color').value=color;$('thickness').value=thickness;
    $('stroke-chip').style.background=color;$('stroke-hex').textContent=color.toUpperCase();
    $('thickness-value').textContent=`${thickness} px`;
    const pattern=STROKE_PATTERNS.find(p=>p.value===dash);
    $('stroke-summary').textContent=`${thickness} px · ${pattern?.label||'Tirets UML'}`;
    const path=$('stroke-preview-path');path.setAttribute('stroke',color);path.setAttribute('stroke-width',thickness);path.setAttribute('stroke-dasharray',scaledDash(dash,thickness)||'none');
    const mini=$('stroke-trigger').querySelector('.stroke-trigger-preview path'),miniWidth=Math.min(4,thickness);mini.setAttribute('stroke-width',miniWidth);mini.setAttribute('stroke-dasharray',scaledDash(dash,miniWidth)||'none');
    document.querySelectorAll('[data-stroke-color]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.strokeColor.toLowerCase()===color.toLowerCase()));
    document.querySelectorAll('[data-stroke-pattern]').forEach(button=>{button.setAttribute('aria-pressed',button.dataset.strokePattern===dash);const preview=button.querySelector('path'),size=Math.min(3,thickness);preview.setAttribute('stroke-width',size);preview.setAttribute('stroke-dasharray',scaledDash(button.dataset.strokePattern,size)||'none');});
  }
  function close(){ $('stroke-popover').hidden=true;$('stroke-trigger').setAttribute('aria-expanded','false'); }
  function position(){if($('stroke-popover').hidden)return;const box=$('stroke-trigger').getBoundingClientRect();$('stroke-popover').style.left=`${Math.max(10,Math.min(innerWidth-330,box.right-320))}px`;$('stroke-popover').style.top=`${Math.max(78,Math.min(innerHeight-$('stroke-popover').offsetHeight-12,box.bottom+10))}px`;}
  $('stroke-trigger').onclick=()=>{const opening=$('stroke-popover').hidden;$('stroke-popover').hidden=!opening;$('stroke-trigger').setAttribute('aria-expanded',opening);if(opening){sync();position();}};
  $('stroke-close').onclick=close;
  function apply(patch){onChange(patch);sync();}
  $('color').oninput=e=>apply({stroke:e.target.value});$('thickness').oninput=e=>apply({strokeWidth:Number(e.target.value)});
  $('stroke-popover').onclick=event=>{const color=event.target.closest('[data-stroke-color]'),pattern=event.target.closest('[data-stroke-pattern]');if(color)apply({stroke:color.dataset.strokeColor});if(pattern)apply({dash:pattern.dataset.strokePattern||'solid'});};
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('#stroke-popover,#stroke-trigger'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('stroke-popover').hidden){event.stopPropagation();close();$('stroke-trigger').focus();}},true);
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  sync();return {sync,close};
}
