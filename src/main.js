import './style.css';
import './code-editor.css';
import { createDocument, addPage, removePage, addElement, updateElement, removeElement, createHistory, commit, undo, redo, validateDocument, translateElement, elementBounds } from './model.js';
import { createMonitor } from './monitor.js';
import { loadCopy, saveCopy, saveSession, downloadJson } from './storage.js';
import { W, H, escape as esc, pageSvg, duration, time, textFits, resolvePageGeometry } from './render.js';
import { readEntity, updateEntity, readAssociation, updateAssociation, readRelation, updateRelation, CARDINALITIES } from './bdd.js';
import { isUmlNode, readUmlNode, updateUmlNode } from './uml-nodes.js';
import { isUmlRelation, readUmlRelation, updateUmlRelation } from './uml-relations.js';
import { umlPaletteMarkup, umlDialogMarkup, mountUmlUi, NODE_LABELS, RELATION_LABELS } from './uml-ui.js';
import { strokeMarkup, mountStrokeUi } from './stroke-ui.js';
import { createShape, resizeElement, duplicateElement } from './transforms.js';
import { enclosedElements, duplicateSelection, moveSelection } from './selection.js';
import { printDocument } from './print.js';
import { findAnchor,attachEndpoint,isConnector,moveBend } from './connectors.js';
import { DEFAULT_DRAWING_STYLE,applyDrawingStyle } from './drawing-style.js';
import { emptyBdd,emptyUml,isDiagram,editableDiagramText,editDiagramRows,diagramChoices } from './diagram-inline.js';
import { alignElements,autoLayout,isLayoutBox } from './layout.js';
import { editableConnector } from './diagram-connections.js';
import { TEXT_STYLES, textFormatMarkup, toggleTextFormat, textStyleIcon, alignmentIcon } from './editor-controls.js';
import { isEntityBox, updateEntityBox } from './entity-box.js';
import { isCodeBlock, createCodeBlock, updateCodeBlock, CODE_LANGUAGES } from './code-blocks.js';
import { highlightHtml } from './code-highlight.js';
import { directTextPlacement } from './direct-editing.js';
import { diagramTitleColor } from './diagram-presentation.js';
import './direct-editing.css';
import './atelier.css';
import { weakMemo, frameTask } from './performance.js';
import { makeDraft, loadDraft, saveDraft, clearDraft } from './drafts.js';
import { patchSvg } from './svg-patch.js';
import { TEXT_SIZE } from './geometry.js';
import { pageIndex } from './page-index.js';
import { normalizeCopy } from './document-data.js';
import { placeFloating, floatingBoxes } from './floating-placement.js';
import { DEFAULT_FAMILY } from './palette-groups.js';
import './neumorphism.css';
import { readPreferences,writePreferences,toolShortcut,TOOL_KEYS } from './workspace-preferences.js';

const loaded = loadCopy();
let history = createHistory(loaded.document || createDocument());
let activePage = history.present.pages[0].id;
let selected = null;
let multiSelection = [];
let editingGroup = null;
let editingText = null;
let tool = 'select';
let {color,thickness,dash}=DEFAULT_DRAWING_STYLE;
let patternChosen=false;
let umlUi;
let strokeUi;
let fontSize = 18;
let zoom = 85;
let fitZoom = true;
const visualPreferences=readPreferences();
let activeFamily=visualPreferences.family||DEFAULT_FAMILY;
let grid = visualPreferences.grid??true;
let gesture = null;
let hoveredAnchor = null;
let pendingDiagramEdit = null;
let ignoreOutsideClickUntil = 0;
let lastPointerClick = null;
let recoveryBlocked = Boolean(loaded.error);
let ownsWorkspace = !navigator.locks;
let notes = loaded.notes || [];
let monitor;
let startingSession = false;
let bddEditing = null;
const app = document.querySelector('#app');
const paths = {
  select: '<path d="m5 3 14 10-7 1-3 7z"/>', pen: '<path d="m16 3 5 5L8 21H3v-5zM14 5l5 5"/>',
  text: '<path d="M4 5h16M12 5v15M8 20h8"/>', rect: '<rect x="3" y="5" width="18" height="14" rx="2"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>', line: '<path d="m4 20 16-16"/>',
  arrow: '<path d="m4 20 16-16M9 4h11v11"/>', undo: '<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/>',
  redo: '<path d="m16 4 5 5-5 5M21 9H11a7 7 0 0 0 0 14"/>', trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  pages: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  settings: '<path d="M9 3h6l.6 2.4 2 .9 2.2-.7 3 5.2-1.7 1.8v2.3l1.7 1.8-3 5.2-2.2-.7-2 .9L15 24H9l-.6-2.4-2-.9-2.2.7-3-5.2 1.7-1.8v-2.3L1.2 10l3-5.2 2.2.7 2-.9z" transform="translate(1 0) scale(.9)"/><circle cx="12" cy="12" r="3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  align: '<path d="M4 3v18M8 6h12v4H8zM8 14h8v4H8z"/>',
  layout: '<rect x="8" y="2" width="8" height="5" rx="1"/><rect x="2" y="17" width="8" height="5" rx="1"/><rect x="14" y="17" width="8" height="5" rx="1"/><path d="M12 7v5M6 17v-5h12v5"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pages}</svg>`;
const icons = Object.fromEntries(['select','pen','text','rect','ellipse','line','arrow'].map(name => [name, icon(name)]));
const names = { select: 'Sélection', pen: 'Stylo', text: 'Texte', rect: 'Rectangle', ellipse: 'Ellipse', line: 'Ligne', arrow: 'Flèche' };
const doc = () => history.present;
const page = () => doc().pages.find(p => p.id === activePage) || doc().pages[0];
const resolvedPage = () => resolvePageGeometry(page());
const item = () => pageIndex(resolvedPage()).elements.get(selected);
const group = () => {const value=pageIndex(page()).elements.get(editingGroup);return value?.type==='group'?value:null;};
const parentGroup = elementId => pageIndex(page()).parents.get(elementId);
function selectionIds(){
  if(!selected){multiSelection=[];return [];}
  if(!multiSelection.includes(selected))multiSelection=[selected];
  const available=pageIndex(resolvedPage()).elements;
  multiSelection=multiSelection.filter(id=>available.has(id));
  return multiSelection;
}
function selectedElements(){const index=pageIndex(resolvedPage());return selectionIds().map(id=>index.elements.get(id)).filter(Boolean).sort((a,b)=>index.order.get(a.id)-index.order.get(b.id));}
function setSelection(ids){multiSelection=[...new Set(ids)];selected=multiSelection.at(-1)||null;}
function selectionCandidates(){return group()?resolvedPage().elements.find(e=>e.id===editingGroup)?.children||[]:resolvedPage().elements;}
const locked = () => !ownsWorkspace || monitor.snapshot().status === 'finished';
const id = () => crypto.randomUUID();

function persist() {
  saveEditingDraft();
  if (recoveryBlocked || !ownsWorkspace) return;
  try {
    const saved = saveCopy(doc(), monitor.snapshot(), notes);
    const label = document.querySelector('#save-state');
    if (label) label.textContent = `Enregistré à ${new Date(saved).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { document.querySelector('#save-state').textContent = '⚠ Non enregistré — exportez la copie'; toast('Sauvegarde impossible : stockage plein ou interdit. Gardez cette page ouverte et exportez votre copie après la session.', true); }
}

monitor = createMonitor({ restored: loaded.session, onChange: () => { if (monitor) { persist(); updateStats(); } } });

function change(next) {
  if (locked()) return;
  next=normalizeCopy(next,activePage);
  history = commit(history, next);
  if (!doc().pages.some(p => p.id === activePage)) activePage = doc().pages[0].id;
  if (!group()) editingGroup = null;
  if (selected && !item()) selected = null;
  persist(); renderPaper(); renderPages(); updateHistory();
}

app.innerHTML = `
  <header class="app-header flex items-center justify-between gap-4">
    <a href="#" class="brand" aria-label="Captif, espace de travail"><span class="brand-mark">${icon('pages')}</span><span class="brand-copy"><span class="brand-title">captif</span><small>VOTRE ATELIER D'ÉVALUATION</small></span></a>
    <div class="header-session"><span class="status-dot"></span><span id="session-label">Espace de préparation</span><span class="header-divider"></span><span id="session-time" class="tabular-nums">00:00:00</span></div>
    <div class="flex gap-2"><button id="journal-button" class="button subtle" aria-label="Journal — aucune absence observée"><span id="journal-indicator" class="status-dot" aria-hidden="true"></span><span>Journal</span></button><button id="print" class="button secondary">↗ <span>Imprimer / PDF</span></button><button id="session" class="button primary">Démarrer l'évaluation <span>→</span></button></div>
  </header>
  <div class="workspace">
    <aside class="left-sidebar">
      <div class="sidebar-heading"><span>VOTRE COPIE</span><span class="tag">A4</span></div>
      <label class="field-label" for="student-name">Nom de l'étudiant</label><input id="student-name" placeholder="Prénom et nom" maxlength="150" />
      <label class="field-label" for="exam-title">Évaluation</label><input id="exam-title" placeholder="Ex. Bases de données · UML" maxlength="200" />
      <div class="sidebar-heading pages-heading"><span>FEUILLES</span><span id="page-count"></span></div>
      <nav id="pages" aria-label="Feuilles de la copie"></nav>
      <button id="add-page" class="add-page">＋ Ajouter une feuille</button>
      <button id="remove-page" class="text-button danger">Supprimer cette feuille</button>
      <div class="sidebar-bottom"><div id="save-state" role="status">● Sauvegarde sur cet appareil</div><div class="flex gap-3 mt-3"><button id="export" class="text-button">Exporter .json</button><button id="import" class="text-button">Importer</button></div><button id="new-copy" class="text-button mt-3">Nouvelle copie</button><button id="settings-button" class="settings-button" type="button" aria-expanded="false" aria-controls="settings-popover">${icon('settings')} Paramètres</button></div>
    </aside>
    <main class="desk">
      <h1 class="sr-only">Votre atelier</h1>
      <div class="desk-controls">
      <div class="toolbar" role="toolbar" aria-label="Outils d'édition">
        <div class="tool-group">${Object.keys(icons).map(t => `<button class="tool ${t === tool ? 'active' : ''}" data-tool="${t}" aria-label="${names[t]}" aria-pressed="${t === tool}" title="${names[t]}">${icons[t]}</button>`).join('')}</div>
        <span class="toolbar-divider"></span><div class="tool-group"><button id="undo" class="tool" aria-label="Annuler" title="Annuler (Ctrl+Z)">${icon('undo')}</button><button id="redo" class="tool" aria-label="Rétablir" title="Rétablir (Ctrl+Maj+Z)">${icon('redo')}</button><button id="delete" class="tool" aria-label="Supprimer l'objet sélectionné" title="Supprimer la sélection">${icon('trash')}</button></div>
      </div>
      ${strokeMarkup()}
      </div>
      <div class="canvas-breadcrumb"><button id="toggle-pages" class="sidebar-toggle" aria-label="Réduire la colonne des feuilles" title="Afficher ou réduire les feuilles" aria-expanded="true">${icon('pages')}</button><span id="canvas-location">Feuille 01</span><span id="selection-summary" class="selection-summary" role="status" hidden></span><div class="group-context" id="group-context" hidden><span id="group-name"></span><button id="exit-group" class="text-button">Quitter le groupe <kbd class="shortcut-key">Échap</kbd></button></div><button id="toggle-library" class="sidebar-toggle" aria-label="Réduire la bibliothèque" title="Afficher ou réduire la bibliothèque" aria-expanded="true">${icon('layout')}</button></div>
      <div class="paper-scroll"><div id="paper-shell"><div class="paper-header"><span id="paper-identity">Votre nom · Votre évaluation</span><span id="paper-number">01</span></div><div id="paper"></div><div class="paper-footer"><span>CAPTIF / COPIE D'ÉVALUATION</span><span id="paper-pagination"></span></div></div></div>
      <div class="desk-footer"><span id="tool-hint">MAJ + clic : sélectionner · ALT + glisser : dupliquer</span><div class="zoom-control"><button id="zoom-fit" title="Adapter la feuille à l'espace disponible">Ajuster</button><button id="zoom-out" aria-label="Réduire le zoom">−</button><button id="zoom-label" type="button" title="Revenir à 100 %" aria-label="Revenir au zoom 100 %">85 %</button><button id="zoom-in" aria-label="Augmenter le zoom">＋</button></div></div>
    </main>
    <aside class="right-sidebar">
      <div class="diagram-layout-tools"><button id="align-button" class="button secondary" type="button" aria-expanded="false" aria-controls="align-popover">${icon('align')} Aligner</button><button id="auto-layout" class="button secondary" type="button">${icon('layout')} Réorganiser</button></div>
      <div class="sidebar-heading" id="selection-heading" hidden><span>PROPRIÉTÉS</span><span>⌘</span></div>
      <div class="selection-card" hidden><span class="selection-type" id="selection-type"></span><h2 id="selection-title"></h2><button id="edit-bdd" class="button secondary w-full mt-3" hidden>Options BDD</button><button id="edit-uml" class="button secondary w-full mt-3" hidden>Options UML</button><button id="enter-group" class="button secondary w-full mt-3" hidden>Entrer dans le groupe</button><button id="reset-route" class="button secondary w-full mt-3" hidden>Parcours automatique</button></div>
      ${umlPaletteMarkup()}
    </aside>
  </div>
  <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
  <dialog id="session-dialog" aria-labelledby="exam-rules-title"><form method="dialog"><span class="eyebrow">CONSIGNES D'ÉVALUATION</span><h2 id="exam-rules-title">Restez dans cette fenêtre et en plein écran.</h2><div class="exam-rules-warning"><strong>Quitter cette fenêtre ou le plein écran vous expose à une sanction : retrait de points.</strong><p>Ne changez pas d'onglet, ne réduisez pas la fenêtre et n'ouvrez pas d'autre application. Les sorties et leur durée sont enregistrées dans le journal de session.</p></div><p>L'évaluation démarrera en plein écran. Restez dans cet espace jusqu'à la fin de votre travail, puis cliquez sur « Terminer la session » pour préparer votre rendu.</p><label class="consent"><input type="checkbox" id="acknowledge" required /> J'ai compris les consignes et les sanctions encourues.</label><p id="fullscreen-error" class="fullscreen-error" role="alert" hidden></p><div class="dialog-actions"><button class="button secondary" value="cancel" formnovalidate>Retour</button><button class="button primary" value="start">Commencer en plein écran</button></div></form></dialog>
  <dialog id="journal-dialog" aria-labelledby="journal-title"><div class="flex items-center justify-between"><div><span class="eyebrow">SUIVI DE L'ÉVALUATION</span><h2 id="journal-title">Journal de session</h2></div><button id="close-journal" class="tool" aria-label="Fermer le journal">${icon('close')}</button></div><div id="journal-status" class="journal-status"><span id="journal-status-indicator" class="status-dot" aria-hidden="true"></span><span id="journal-status-text">Aucune absence observée</span></div><div class="journal-metrics"><div><strong id="absence-count">0</strong><span>Absences observées</span></div><div><strong id="away-time">00:00:00</strong><span>Durée hors de l'outil</span></div><div><strong id="fullscreen-count">0</strong><span>Sorties du plein écran</span></div></div><button id="fullscreen" class="button secondary">⛶ Passer en plein écran</button><div id="journal-content"></div></dialog>
  <section id="settings-popover" popover aria-labelledby="settings-title"><div class="settings-heading"><h2 id="settings-title">Paramètres</h2><button id="settings-close" class="tool" type="button" aria-label="Fermer les paramètres">${icon('close')}</button></div><label class="settings-grid-option" for="grid"><span><strong>Points de repère</strong><small>Afficher la grille sur la feuille</small></span><input id="grid" type="checkbox" checked /></label></section>
  <dialog id="confirm-dialog" aria-labelledby="confirm-title"><form method="dialog"><h2 id="confirm-title">Confirmer cette action</h2><p id="confirm-message"></p><div class="dialog-actions"><button class="button secondary" value="cancel" autofocus>Annuler</button><button class="button primary" value="confirm">Confirmer</button></div></form></dialog>
  <input type="file" id="file-input" accept="application/json,.json" hidden />
  <div id="text-context" class="text-context" role="toolbar" aria-label="Options du texte sélectionné" hidden><button id="context-edit" type="button" title="Modifier le texte">${icon('pen')} Modifier</button><span class="context-divider"></span><label><span class="sr-only">Taille du texte sélectionné</span><select id="context-size">${[12,14,16,18,20,24,28,32].map(size => `<option value="${size}">${size} px</option>`).join('')}</select></label><button id="context-bold" type="button" aria-label="Gras" aria-pressed="false" title="Gras">${textStyleIcon('bold')}</button><button id="context-italic" type="button" aria-label="Italique" aria-pressed="false" title="Italique">${textStyleIcon('italic')}</button><button id="context-underline" type="button" aria-label="Souligné" aria-pressed="false" title="Souligné">${textStyleIcon('underline')}</button><label class="context-color"><span class="sr-only">Couleur du texte sélectionné</span><input id="context-color" type="color" value="${color}" /></label><button id="context-delete" type="button" aria-label="Supprimer ce texte" title="Supprimer ce texte">${icon('trash')}</button></div>
  <dialog id="bdd-dialog" aria-labelledby="bdd-title"><form method="dialog" id="bdd-form"><span class="eyebrow">MODÉLISATION DE DONNÉES</span><h2 id="bdd-title">Configurer l'entité</h2><label class="field-label" for="bdd-name">Nom</label><input id="bdd-name" maxlength="60" required /><div id="bdd-attributes"><div class="attributes-heading"><strong>Attributs</strong><span>PK : clé primaire · FK : clé étrangère</span></div><div class="attributes-scroll"><table class="attribute-table"><thead><tr><th>Clé</th><th>Attribut</th><th>Type</th><th>NULL</th><th><span class="sr-only">Supprimer</span></th></tr></thead><tbody id="attribute-rows"></tbody></table></div><button id="add-attribute" type="button" class="button secondary mt-3">＋ Ajouter un attribut</button></div><div id="bdd-link-fields" hidden><div class="relation-endpoints"><div><label class="field-label" for="bdd-source">Élément de départ</label><select id="bdd-source"></select><label class="field-label" for="bdd-left">Cardinalité au départ</label><select id="bdd-left"></select></div><div><label class="field-label" for="bdd-target">Élément d'arrivée</label><select id="bdd-target"></select><label class="field-label" for="bdd-right">Cardinalité à l'arrivée</label><select id="bdd-right"></select></div></div><p class="palette-note">Choisissez deux éléments pour attacher le lien à leurs bords. Laissez les deux vides pour placer un lien libre.</p></div><p id="bdd-error" role="alert" class="fullscreen-error" hidden></p><div class="dialog-actions"><button value="cancel" formnovalidate class="button secondary">Annuler</button><button value="save" class="button primary">Insérer sur la feuille</button></div></form></dialog>
  <datalist id="sql-types">${['INT','BIGINT','VARCHAR(100)','VARCHAR(255)','TEXT','DATE','DATETIME','DECIMAL(10,2)','BOOLEAN','UUID'].map(value => `<option value="${value}"></option>`).join('')}</datalist>
  ${umlDialogMarkup()}
  <section id="align-popover" popover aria-label="Aligner et répartir"><span class="eyebrow">DISPOSITION DE LA SÉLECTION</span><div class="align-command-grid">${[['left','À gauche'],['center-x','Centre horizontal'],['right','À droite'],['top','En haut'],['center-y','Centre vertical'],['bottom','En bas'],['distribute-x','Répartir horizontalement'],['distribute-y','Répartir verticalement']].map(([value,label])=>`<button class="button subtle" type="button" data-align="${value}" title="${label}" aria-label="${label}">${alignmentIcon(value)}<span>${label}</span></button>`).join('')}</div></section>
`;

document.querySelector('.desk').append(document.querySelector('.selection-card'));
document.querySelector('.selection-card').setAttribute('role','region');

function saveUmlElement(element, existing) {
  if(locked())return;
  if(!existing)element=applyDrawingStyle(element,{color,thickness,dash},patternChosen);
  const container=['system','fragment','package','swimlane'].includes(element.umlKind);
  const attached=Boolean(element.sourceId||element.targetId);
  if(!existing&&!attached)element=container?(element.umlKind==='system'?translateElement(element,W-24-element.width-element.x,80-element.y):element):placeUmlElement(element);
  let next;
  if(existing)next=updateElement(doc(),activePage,existing.id,element);
  else if(container)next={...doc(),pages:doc().pages.map(p=>p.id===activePage?{...p,elements:[element,...p.elements]}:p)};
  else next=addElement(doc(),activePage,element);
  validateDocument(next);
  selected=element.id;editingGroup=null;change(next);setTool('select');
  if(!existing)focusDiagramName(element.id);
}
umlUi = mountUmlUi({ getPage:page, isLocked:locked, beforeOpen:()=>{if(!commitTextEdit())return false;document.querySelector('#text-context').hidden=true;strokeUi?.close();return true;}, onSave:saveUmlElement,onCreate(kind,relation){try{saveUmlElement(emptyUml(kind,{relation,elements:page().elements,preferred:selectionIds()}),null);}catch(error){toast(error.message,true);}} });
document.querySelector('#code-block').onclick=()=>{
  if(locked()||!commitTextEdit())return;
  try{const block=placeElement(createCodeBlock()),next=addElement(doc(),activePage,block);validateDocument(next);selected=block.id;editingGroup=null;change(next);setTool('select');beginTextEdit(block.children.find(c=>c.role==='code-content').id);}catch(error){toast(error.message,true);}
};
strokeUi = mountStrokeUi({ getCurrent:()=>({color,thickness,dash}), onChange(patch) {
  if(locked())return;
  if(patch.stroke)color=patch.stroke;
  if(patch.strokeWidth)thickness=patch.strokeWidth;
  if(Object.hasOwn(patch,'dash')){dash=patch.dash==='solid'?'':patch.dash||'';patternChosen=true;}
  styleSelected(patch);
}});
document.querySelector('#edit-uml').onclick=()=>{const target=item()?.type==='group'?item():parentGroup(selected);if(target)umlUi.edit(target);};
document.querySelector('#reset-route').onclick=()=>{if(locked()||!editableConnector(item()))return;change(updateElement(doc(),activePage,selected,{waypoints:undefined}));};
const alignPopover=document.querySelector('#align-popover');
document.querySelector('#align-button').onclick=()=>{
  alignPopover.togglePopover();
  if(!alignPopover.matches(':popover-open'))return;
  const anchor=document.querySelector('#align-button').getBoundingClientRect();
  alignPopover.style.left=`${Math.max(12,Math.min(innerWidth-alignPopover.offsetWidth-12,anchor.left))}px`;
  alignPopover.style.top=`${Math.max(12,Math.min(innerHeight-alignPopover.offsetHeight-12,anchor.bottom+8))}px`;
  const ids=new Set(selectionIds()),count=page().elements.filter(e=>ids.has(e.id)&&isLayoutBox(e)).length;
  alignPopover.querySelectorAll('[data-align]').forEach(button=>button.disabled=button.dataset.align.startsWith('distribute-')&&count<3);
};
alignPopover.addEventListener('toggle',()=>document.querySelector('#align-button').setAttribute('aria-expanded',alignPopover.matches(':popover-open')));
alignPopover.onclick=event=>{
  const command=event.target.closest('[data-align]');if(!command||locked()||!commitTextEdit())return;
  try{
    const ids=new Set(selectionIds()),arranged=new Map(alignElements(page().elements.filter(e=>ids.has(e.id)),command.dataset.align).map(e=>[e.id,e]));
    const next={...doc(),pages:doc().pages.map(p=>p.id===activePage?{...p,elements:p.elements.map(e=>arranged.get(e.id)||e)}:p)};
    validateDocument(next);change(next);alignPopover.hidePopover();
  }catch(error){toast(error.message,true);}
};
document.querySelector('#auto-layout').onclick=()=>{
  if(locked()||!commitTextEdit())return;
  try{
    const elements=autoLayout(page().elements).map(e=>{if(!editableConnector(e))return e;const {waypoints,...automatic}=e;return automatic;});
    const next={...doc(),pages:doc().pages.map(p=>p.id===activePage?{...p,elements}:p)};
    validateDocument(next);change(next);toast('Diagramme réorganisé. Ctrl + Z pour annuler.');
  }catch(error){toast(error.message,true);}
};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&alignPopover.matches(':popover-open')){event.stopPropagation();alignPopover.hidePopover();document.querySelector('#align-button').focus();}},true);

function toast(message, error = false) {
  const notice = document.querySelector('#notice');
  notice.hidden = false;
  notice.textContent = message;
  notice.classList.toggle('error', error);
  clearTimeout(toast.timer);
  if (!error) toast.timer = setTimeout(() => { notice.hidden = true; }, 6000);
}

function confirmAction(message) {
  const dialog = document.querySelector('#confirm-dialog');
  if (dialog.open) return Promise.resolve(false);
  document.querySelector('#confirm-message').textContent = message;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}

function exitGroup() {
  const parent = editingGroup;
  editingGroup = null;
  selected = parent && page().elements.some(e => e.id === parent) ? parent : null;
  gesture = null;
  renderPaper(); updateHistory();
}

function enterGroup(groupId) {
  if (locked()) return;
  const target = page().elements.find(e => e.id === groupId && e.type === 'group');
  if (!target) return;
  editingGroup = groupId; selected = null; gesture = null;
  tool = 'select';
  setTool('select');
  document.querySelector('#tool-hint').textContent = 'Groupe ouvert : cliquez sur un composant, double-cliquez sur un texte. Échap pour quitter.';
}
document.querySelector('#exit-group').onclick = exitGroup;
document.querySelector('#enter-group').onclick = () => enterGroup(selected);
document.querySelector('#edit-bdd').onclick = () => {
  const target = item()?.type === 'group' ? item() : parentGroup(selected);
  const kind = target?.label === 'Entité BDD' ? 'entity' : target?.label === 'Association BDD' ? 'association' : 'relation';
  if (target) openBddEditor(kind, target);
};

for(const [key,toolName] of Object.entries(TOOL_KEYS)){const button=document.querySelector(`[data-tool="${toolName}"]`);button.title=`${names[toolName]} (${key.toUpperCase()})`;button.setAttribute('aria-keyshortcuts',key);}

const shapeTooltip=document.createElement('div');shapeTooltip.id='shape-tooltip';shapeTooltip.role='tooltip';shapeTooltip.hidden=true;document.body.append(shapeTooltip);
const library=document.querySelector('#shape-library');
function hideShapeTooltip(){shapeTooltip.hidden=true;library.querySelectorAll('[aria-describedby="shape-tooltip"]').forEach(e=>e.removeAttribute('aria-describedby'));}
function showShapeTooltip(event){
  const button=event.target.closest('.shape-icon-button');if(!button||button.disabled)return;
  hideShapeTooltip();shapeTooltip.textContent=button.getAttribute('aria-label');shapeTooltip.hidden=false;button.setAttribute('aria-describedby','shape-tooltip');
  const rect=button.getBoundingClientRect();shapeTooltip.style.left=`${Math.max(8,rect.left-shapeTooltip.offsetWidth-10)}px`;shapeTooltip.style.top=`${Math.max(78,Math.min(innerHeight-shapeTooltip.offsetHeight-8,rect.top))}px`;
}
const families=[...library.querySelectorAll('[data-diagram-family]')];
for(const family of families)family.open=family.dataset.diagramFamily===activeFamily;
library.addEventListener('toggle',event=>{
  const family=event.target;if(!family.matches('[data-diagram-family]')||!family.open||family.dataset.diagramFamily===activeFamily)return;
  activeFamily=family.dataset.diagramFamily;
  for(const other of families)if(other!==family)other.open=false;
  hideShapeTooltip();saveVisualPreferences();
  requestAnimationFrame(()=>{const list=library.querySelector('.diagram-families'),header=family.querySelector('summary');list.scrollTo({top:list.scrollTop+header.getBoundingClientRect().top-list.getBoundingClientRect().top-4,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
},true);
library.querySelectorAll('.shape-icon-button').forEach(e=>e.removeAttribute('title'));
library.addEventListener('pointerover',showShapeTooltip);library.addEventListener('focusin',showShapeTooltip);
library.addEventListener('pointerout',hideShapeTooltip);library.addEventListener('focusout',hideShapeTooltip);library.addEventListener('click',hideShapeTooltip);library.addEventListener('scroll',hideShapeTooltip,true);
library.addEventListener('keydown',event=>{
  if(event.target.matches('summary')){
    const headers=families.map(f=>f.querySelector('summary')),index=headers.indexOf(event.target);
    const next=({ArrowDown:Math.min(headers.length-1,index+1),ArrowUp:Math.max(0,index-1),Home:0,End:headers.length-1})[event.key];
    if(next!==undefined){event.preventDefault();headers[next].focus();return;}
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();event.target.parentElement.open=event.key==='ArrowRight';return;}
  }
  const button=event.target.closest('.shape-icon-button');if(!button)return;
  if(event.key==='Escape'){hideShapeTooltip();return;}
  const buttons=[...button.parentElement.querySelectorAll('.shape-icon-button')],index=buttons.indexOf(button),columns=getComputedStyle(button.parentElement).gridTemplateColumns.split(' ').length;
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
  if(offset!==undefined){event.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,index+offset))].focus();}
});

document.querySelector('.workspace').classList.toggle('pages-collapsed',!(visualPreferences.pages??innerWidth>=1000));
document.querySelector('.workspace').classList.toggle('library-collapsed',!(visualPreferences.library??innerWidth>=760));
document.querySelector('#grid').checked=grid;
function saveVisualPreferences(){writePreferences({family:activeFamily,pages:!document.querySelector('.workspace').classList.contains('pages-collapsed'),library:!document.querySelector('.workspace').classList.contains('library-collapsed'),grid});}
for(const [id,className,name] of [['toggle-pages','pages-collapsed','la colonne des feuilles'],['toggle-library','library-collapsed','la bibliothèque']]){
  const collapsed=document.querySelector('.workspace').classList.contains(className);
  document.querySelector(`#${id}`).setAttribute('aria-expanded',String(!collapsed));
  document.querySelector(`#${id}`).setAttribute('aria-label',`${collapsed?'Afficher':'Réduire'} ${name}`);
  document.querySelector(`#${id}`).onclick=()=>{
    const collapsed=document.querySelector('.workspace').classList.toggle(className),button=document.querySelector(`#${id}`);
    button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',`${collapsed?'Afficher':'Réduire'} ${name}`);
    saveVisualPreferences();fitPaper();floatingFrame.schedule();
  };
}

let draftTimer=null,draftRestored=false;
function saveEditingDraft(){
  clearTimeout(draftTimer);
  if(!editingText||!ownsWorkspace||recoveryBlocked)return;
  const field=document.querySelector('#inline-text'),target=pageIndex(page()).elements.get(editingText.id);
  if(!field||!target)return;
  try{saveDraft(makeDraft(doc(),activePage,target,{text:field.value,format:editingText.format,language:editingText.language,fontSize:editingText.fontSize}));}
  catch{toast('Brouillon non enregistré : validez ou exportez votre saisie avant de fermer.',true);}
}
function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(saveEditingDraft,150);positionEditingControls();}
function restorePendingDraft(){
  if(draftRestored||!ownsWorkspace||recoveryBlocked)return;draftRestored=true;
  try{const draft=loadDraft(doc());if(draft&&!locked()){activePage=draft.pageId;renderPages();renderPaper();beginTextEdit(draft.elementId,draft);toast('Votre saisie en cours a été récupérée. Validez-la pour l’ajouter à la copie.');}}
  catch(error){toast(error.message,true);}
}
function positionEditingControls(){
  const editor=document.querySelector('#inline-editor');if(!editor)return;
  const area=document.querySelector('.paper-scroll').getBoundingClientRect(),field=editor.getBoundingClientRect();
  const format=editor.querySelector('.inline-format-toolbar'),actions=editor.querySelector('.inline-editor-actions');
  const controls=[format,actions].filter(Boolean),width=controls.reduce((sum,e)=>sum+e.offsetWidth+8,0);
  let left=Math.max(area.left+8,Math.min(area.right-width-8,field.left));
  const top=Math.max(area.top+6,Math.min(area.bottom-42,field.top-46));
  for(const control of controls){Object.assign(control.style,{position:'fixed',left:`${left}px`,right:'auto',top:`${top}px`,bottom:'auto'});left+=control.offsetWidth+8;}
}
const floatingFrame=frameTask(()=>{positionEditingControls();updateTextContext();positionSelectionCommands();});
window.addEventListener('scroll',()=>floatingFrame.schedule(),true);
window.addEventListener('resize',()=>floatingFrame.schedule());

function cancelTextEdit() {
  clearTimeout(draftTimer);
  if(editingText&&ownsWorkspace){try{clearDraft();}catch{toast('Impossible de retirer le brouillon local.',true);}}
  document.querySelector('#paper-shell').classList.remove('text-editing');
  document.querySelectorAll('#paper .editing-original').forEach(node=>node.classList.remove('editing-original'));
  document.querySelector('#inline-editor')?.remove();
  editingText = null;
}

function validatedUpdate(next){validateDocument(next);return next;}
function reframeGroup(next, parentId) {
  const parent = next.pages.find(p => p.id === activePage)?.elements.find(e => e.id === parentId);
  if (!parent) return next;
  if(isCodeBlock(parent)){try{return validatedUpdate(updateElement(next,activePage,parentId,updateCodeBlock(parent)));}catch{return null;}}
  if(isEntityBox(parent)){try{return validatedUpdate(updateElement(next,activePage,parentId,updateEntityBox(parent)));}catch{return null;}}
  if(isUmlNode(parent)) { try{return validatedUpdate(updateElement(next,activePage,parentId,{...updateUmlNode(parent,readUmlNode(parent)),...(parent.sourceId?{sourceId:parent.sourceId,offset:parent.offset}:{})}));}catch{return null;} }
  if(isUmlRelation(parent)) { try{return validatedUpdate(updateElement(next,activePage,parentId,updateUmlRelation(parent,readUmlRelation(parent))));}catch{return null;} }
  if (parent.label === 'Entité BDD' && parent.children.some(e => e.role === 'entity-name')) {
    try { return validatedUpdate(updateElement(next, activePage, parentId, updateEntity(parent, readEntity(parent)))); }
    catch { return null; }
  }
  if (parent.label === 'Association BDD') {
    try { return validatedUpdate(updateElement(next, activePage, parentId, updateAssociation(parent, readAssociation(parent)))); }
    catch { return null; }
  }
  if (parent.label === 'Relation BDD') return next;
  const frame = parent.children.find(e => e.type === 'rect');
  if (!frame) return next;
  const content = parent.children.filter(e => e.id !== frame.id).map(elementBounds);
  const right = Math.max(frame.x + frame.width, ...content.map(b => b.x + b.width + 16));
  const bottom = Math.max(frame.y + frame.height, ...content.map(b => b.y + b.height + 16));
  if (right > W - 16 || bottom > H - 16) return null;
  const width = right - frame.x, height = bottom - frame.y;
  next = updateElement(next, activePage, frame.id, { width, height });
  const updated = next.pages.find(p => p.id === activePage).elements.find(e => e.id === parentId);
  return updateElement(next, activePage, parentId, { width, height, children: updated.children });
}

function placeElement(element) {
  const bounds = elementBounds(element);
  const occupied = resolvedPage().elements.filter(e => !isConnector(e)&&!['Relation BDD','Relation UML'].includes(e.label)&&!['system','fragment','package','swimlane','activation','destruction'].includes(e.umlKind)).map(elementBounds);
  for (let y = 80; y + bounds.height <= H - 24; y += 28) {
    for (let x = 28; x + bounds.width <= W - 24; x += 24) {
      if (occupied.every(b => x + bounds.width + 52 <= b.x || x >= b.x + b.width + 52 || y + bounds.height + 52 <= b.y || y >= b.y + b.height + 52)) return translateElement(element, x - bounds.x, y - bounds.y);
    }
  }
  throw new Error("Cette feuille manque d'espace pour cet élément. Ajoutez une feuille ou libérez de la place.");
}

function placeUmlElement(element) {
  const system=page().elements.find(e=>e.umlKind==='system');
  if(system&&element.umlKind==='usecase') {
    const bounds=elementBounds(element),occupied=page().elements.filter(e=>e.umlKind==='usecase').map(elementBounds);
    const x=system.x+(system.width-bounds.width)/2;
    for(let y=system.y+64;y+bounds.height<=system.y+system.height-20;y+=bounds.height+24){
      if(x>=system.x+16&&x+bounds.width<=system.x+system.width-16&&occupied.every(b=>y+bounds.height+16<=b.y||y>=b.y+b.height+16))return translateElement(element,x-bounds.x,y-bounds.y);
    }
    throw new Error('La frontière du système manque de place. Augmentez sa hauteur ou sa largeur avant d’ajouter un cas.');
  }
  if(system&&element.umlKind==='actor'&&system.x-element.width-36>=24){
    const x=system.x-element.width-36,occupied=page().elements.filter(e=>e.umlKind==='actor').map(elementBounds);
    for(let y=system.y+80;y+element.height<=H-24;y+=element.height+28){if(occupied.every(b=>y+element.height+18<=b.y||y>=b.y+b.height+18))return translateElement(element,x-element.x,y-element.y);}
  }
  return placeElement(element);
}

function commitTextEdit() {
  if (!editingText) return true;
  if (locked()) { cancelTextEdit(); return true; }
  const editor = document.querySelector('#inline-text');
  const target = pageIndex(page()).elements.get(editingText.id);
  if (!target) { cancelTextEdit(); return true; }
  const patch = { text: editor.value, ...editingText.format,...(!target.role?{fontSize:editingText.fontSize}:{}) };
  if(target.width!==undefined)patch.height=elementBounds({...target,...patch}).height;
  if (!textFits({ ...target, ...patch })) {
    toast('Le texte dépasse la feuille. Réduisez-le ou répartissez la réponse sur une autre feuille.', true);
    editor.focus(); return false;
  }
  let next = updateElement(doc(), activePage, target.id, patch);
  const parent = parentGroup(target.id);
  if(isCodeBlock(parent))next=updateElement(next,activePage,parent.id,{codeLanguage:editingText.language});
  if (parent) next = reframeGroup(next, parent.id);
  if (!next) { toast('Le texte agrandirait le groupe au-delà de la feuille. Raccourcissez-le ou déplacez le groupe.', true); editor.focus(); return false; }
  const unchanged = target.text === patch.text && (!patch.fontSize||target.fontSize===patch.fontSize) && TEXT_STYLES.every(style => Boolean(target[style]) === Boolean(patch[style])) && (!isCodeBlock(parent)||parent.codeLanguage===editingText.language);
  try{validateDocument(next);}catch(error){toast(`Saisie non enregistrée : ${error.message}`,true);editor.focus();return false;}
  cancelTextEdit();
  if (!unchanged) change(next);
  selectElement(target.id);
  return true;
}

function beginTextEdit(elementId,recovered=null) {
  if (locked()) return;
  if (editingText && !commitTextEdit()) return;
  // The click completing a pointer gesture must not immediately close its editor.
  ignoreOutsideClickUntil=Date.now()+150;
  const target = pageIndex(page()).elements.get(elementId);
  if (!target||target.type!=='text') return;
  if(target.role==='code-language'){const content=parentGroup(target.id)?.children.find(c=>c.role==='code-content');if(content)beginTextEdit(content.id);return;}
  const parent = parentGroup(elementId);
  if (parent&&!isDiagram(parent)) editingGroup = parent.id;
  selected = elementId;
  selectElement(elementId);
  editingText = { id: elementId, fontSize:recovered?.fontSize||target.fontSize, format: recovered?.format||Object.fromEntries(TEXT_STYLES.map(style=>[style,Boolean(target[style])])) };
  const codeField=target.role==='code-content'&&isCodeBlock(parent);
  if(codeField)editingText.language=recovered?.language||parent.codeLanguage||'plaintext';
  document.querySelector('#text-context').hidden = true;
  const displayed=pageIndex(resolvedPage()).elements.get(target.id)||target;
  const scale = zoom / 100;
  const editor = document.createElement('div');
  editor.id = 'inline-editor'; editor.className = 'inline-editor';
  const placement=directTextPlacement({...displayed,fontSize:editingText.fontSize},parent,scale);
  Object.assign(editor.style,{left:`${placement.left}px`,top:`${placement.top}px`,width:`${placement.width}px`});
  const choices=diagramChoices(target,parent),single=Boolean(target.role)&&!['uml-attributes','uml-operations','box-body','code-content'].includes(target.role);
  editor.classList.add('direct-editor');
  editor.classList.toggle('diagram-cell-editor',Boolean(target.role));
  editor.classList.toggle('code-editor',codeField);
  const control=choices?`<select id="inline-text">${choices.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('')}</select>`:single?'<input id="inline-text" type="text" maxlength="80" autocomplete="off" spellcheck="false" />':'<textarea id="inline-text" maxlength="10000" spellcheck="false"></textarea>';
  editor.innerHTML = `${choices?'':textFormatMarkup(editingText.format)}<label class="sr-only" for="inline-text">Modifier le texte sur la feuille</label>${control}<div class="inline-editor-actions"><button id="cancel-inline" class="button secondary" type="button" aria-label="Annuler la saisie" title="Annuler (Échap)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><button id="save-inline" class="button primary" type="button" aria-label="Valider la saisie" title="Valider (Ctrl + Entrée)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button></div>`;
  if(codeField){
    editor.innerHTML=`<div class="code-editor-toolbar"><span aria-hidden="true">&lt;/&gt;</span><label class="sr-only" for="code-language">Coloration syntaxique</label><select id="code-language">${Object.entries(CODE_LANGUAGES).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></div><label class="sr-only" for="inline-text">Modifier le texte sur la feuille</label><div class="code-input-wrap"><pre class="code-editor-preview" aria-hidden="true"><code></code></pre><textarea id="inline-text" maxlength="10000" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="soft"></textarea></div><div class="inline-editor-actions"><button id="cancel-inline" class="button secondary" type="button" aria-label="Annuler la saisie" title="Annuler (Échap)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><button id="save-inline" class="button primary" type="button" aria-label="Valider la saisie" title="Valider (Ctrl + Entrée)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button></div>`;
  }
  document.querySelector('#paper-shell').append(editor);
  document.querySelector('#paper-shell').classList.add('text-editing');
  if(codeField){const badge=parent.children.find(c=>c.role==='code-language');document.querySelectorAll('#paper [data-element]').forEach(node=>{if(node.dataset.element===badge?.id)node.classList.add('editing-original');});}
  const field = editor.querySelector('#inline-text');
  field.style.textAlign=placement.align;
  field.style.fontFamily=target.role&& !codeField?'Arial, Helvetica, sans-serif':'ui-monospace, monospace';
  document.querySelectorAll('#paper [data-element]').forEach(node=>{if(node.dataset.element===target.id)node.classList.add('editing-original');});
  field.value = recovered?.text??target.text;
  field.style.fontSize = `${placement.fontSize}px`;
  field.style.fontWeight=editingText.format.bold?'700':'400';field.style.fontStyle=editingText.format.italic?'italic':'normal';
  field.style.textDecoration=editingText.format.underline?'underline':'none';
  const fitTextColumns=()=>{
    if(single||target.role&&!codeField)return;
    const columns=Math.max(1,Math.floor(placement.width/scale/(editingText.fontSize*.62)));
    (codeField?editor.querySelector('.code-input-wrap'):field).style.width=`min(100%, ${columns}ch)`;
    if(codeField){editor.querySelector('.code-input-wrap').style.fontSize=field.style.fontSize;editor.querySelector('.code-input-wrap').style.fontFamily=field.style.fontFamily;}
  };
  fitTextColumns();
  const toggleFormat=style=>{
    editingText.format=toggleTextFormat(editingText.format,style);
    editor.querySelector(`[data-text-format="${style}"]`).setAttribute('aria-pressed',editingText.format[style]);
    field.style.fontWeight=editingText.format.bold?'700':'400';field.style.fontStyle=editingText.format.italic?'italic':'normal';field.style.textDecoration=editingText.format.underline?'underline':'none';scheduleDraft();field.focus();
  };
  editor.querySelectorAll('[data-text-format]').forEach(button=>button.onclick=()=>toggleFormat(button.dataset.textFormat));
  field.style.lineHeight = '1.5';
  field.style.minHeight=`${placement.fontSize*1.5}px`;
  field.style.height=`${placement.height}px`;
  field.style.color=parent?diagramTitleColor(parent,target):target.stroke||'#263246';
  if(codeField)editor.querySelector('.code-editor-toolbar').style.top=`${(parent.y-displayed.y+target.fontSize)*scale}px`;
  if(codeField){
    const language=editor.querySelector('#code-language'),preview=editor.querySelector('.code-editor-preview');
    language.value=editingText.language;preview.style.fontSize=field.style.fontSize;
    const refresh=()=>{preview.querySelector('code').innerHTML=highlightHtml(field.value,editingText.language)+'\n';};
    language.onchange=()=>{editingText.language=language.value;refresh();scheduleDraft();};
    field.addEventListener('input',refresh);field.addEventListener('scroll',()=>{preview.scrollTop=field.scrollTop;preview.scrollLeft=field.scrollLeft;});refresh();
  }
  if(!single){const resizeField=()=>{field.style.height='auto';field.style.height=`${Math.max(placement.height,field.scrollHeight)}px`;positionEditingControls();};field.addEventListener('input',resizeField);resizeField();}
  field.addEventListener('input',scheduleDraft);field.addEventListener('change',scheduleDraft);
  if(!target.role){
    const label=document.createElement('label');label.className='inline-size';label.innerHTML=`<span class="sr-only">Taille du texte</span><input type="number" min="${TEXT_SIZE.min}" max="${TEXT_SIZE.max}" step="1" aria-label="Taille du texte en pixels" />`;
    const size=label.querySelector('input');size.value=editingText.fontSize;
    size.oninput=()=>{const value=Number(size.value);if(value>=TEXT_SIZE.min&&value<=TEXT_SIZE.max){editingText.fontSize=value;field.style.fontSize=`${value*scale}px`;fitTextColumns();field.dispatchEvent(new Event('input'));scheduleDraft();}};
    editor.querySelector('.inline-format-toolbar').append(label);
  }
  field.addEventListener('keydown', event => {
    if(!choices&&!codeField&&(event.ctrlKey||event.metaKey)&&['b','i','u'].includes(event.key.toLowerCase())){event.preventDefault();event.stopPropagation();toggleFormat(({b:'bold',i:'italic',u:'underline'})[event.key.toLowerCase()]);return;}
    if(codeField&&event.key==='Tab'){event.preventDefault();event.stopPropagation();const start=field.selectionStart,end=field.selectionEnd;field.setRangeText('  ',start,end,'end');field.dispatchEvent(new Event('input'));return;}
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelTextEdit(); renderPaper(); }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); commitTextEdit(); }
    else if(target.role&&(event.key==='Tab'||single&&event.key==='Enter')){event.preventDefault();event.stopPropagation();if(commitTextEdit())focusNextDiagramField(target.id,event.shiftKey);}
  });
  editor.querySelector('#cancel-inline').onclick = () => { cancelTextEdit(); renderPaper(); };
  editor.querySelector('#save-inline').onclick = commitTextEdit;
  field.focus(); if(!choices)field.setSelectionRange(field.value.length, field.value.length);
  editor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  positionEditingControls();
}

function focusDiagramName(groupId){
  const owner=page().elements.find(e=>e.id===groupId),field=owner?.children?.find(e=>['box-title','entity-name','association-name','uml-name','relation-name','uml-relation-name'].includes(e.role));
  if(field)beginTextEdit(field.id);
}
function focusNextDiagramField(fieldId,backwards=false){
  const owner=parentGroup(fieldId);if(!owner)return;
  const fields=owner.children.filter(editableDiagramText),index=fields.findIndex(e=>e.id===fieldId);
  if(index>=0&&fields.length)beginTextEdit(fields[(index+(backwards?-1:1)+fields.length)%fields.length].id);
}
function insertBddDirect(kind){
  if(locked()||!commitTextEdit())return;
  try{
    let element=applyDrawingStyle(emptyBdd(kind,page().elements,selectionIds()),{color,thickness,dash},patternChosen);
    if(!element.sourceId)element=placeElement(element);
    const next=addElement(doc(),activePage,element);validateDocument(next);
    selected=element.id;editingGroup=null;change(next);setTool('select');focusDiagramName(element.id);
  }catch(error){toast(error.message,true);}
}
function performDiagramAction(ownerId,action){
  if(locked()||!commitTextEdit())return;
  const owner=page().elements.find(e=>e.id===ownerId);if(!owner)return;
  try{
    const rowId=owner.children.find(c=>c.id===selected)?.rowId;
    const updated=editDiagramRows(owner,action,rowId),next=updateElement(doc(),activePage,owner.id,updated);validateDocument(next);
    change(next);
    const field=updated.children.filter(c=>c.role===(action==='add-operation'?'uml-operations':owner.label==='Entité BDD'||owner.label==='Association BDD'?'attribute-name':'uml-attributes')).at(-1);
    if(field)beginTextEdit(field.id);
  }catch(error){toast(error.message,true);}
}

document.addEventListener('click', event => {
  if(Date.now()<ignoreOutsideClickUntil)return;
  if (editingText && !event.target.closest('#inline-editor') && !commitTextEdit()) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);

function renderPaper() {
  const p = page(); activePage = p.id;
  patchSvg(document.querySelector('#paper'),pageSvg(p, { selected, selectedIds:selectionIds(), editingGroup, grid, draft: gesture?.draft, drafts:gesture?.drafts, marquee:gesture?.marquee?{start:gesture.start,end:gesture.end||gesture.start}:null, handleSize:1000/zoom,connectionMode:['line','arrow'].includes(tool)||Boolean(gesture?.resizing&&(gesture.originalWire||['line','arrow'].includes(gesture.original.type))),snapAnchor:gesture?.snapAnchor||hoveredAnchor,editHints:!locked() }));
  const index = doc().pages.findIndex(p => p.id === activePage) + 1;
  document.querySelector('#paper-identity').textContent = `${doc().student.name || 'Votre nom'} · ${doc().exam || 'Votre évaluation'}`;
  document.querySelector('#paper-number').textContent = String(index).padStart(2, '0');
  document.querySelector('#paper-pagination').textContent = `${index} / ${doc().pages.length}`;
  document.querySelector('#canvas-location').textContent = `Feuille ${String(index).padStart(2, '0')}`;
  document.querySelector('#group-context').hidden = !group();
  document.querySelector('#group-name').textContent = group()?.label || '';
  document.querySelector('#paper-shell').style.width = `${W * zoom / 100}px`;
  document.querySelector('#zoom-label').textContent = `${zoom} %`;
  document.querySelector('#zoom-label').setAttribute('aria-label',`Zoom ${zoom} %, revenir à 100 %`);
  document.querySelector('#paper').style.cursor = tool === 'select' ? 'default' : 'crosshair';
  strokeUi?.sync();
  updateInspector();
  updateTextContext();
}

function updateInspector() {
  const e = item();
  const count=selectionIds().length;
  const summary=document.querySelector('#selection-summary');summary.hidden=count===0;setText('#selection-summary',count>1?`${count} éléments sélectionnés`:e?.type==='group'?(NODE_LABELS[e.umlKind]?.[0]||RELATION_LABELS[e.relationKind]?.[0]||e.label||'Groupe'):names[e?.type]||'Élément');
  document.querySelector('.selection-card').hidden = !e||count>1||e.type!=='group'&&!editableConnector(e);
  document.querySelector('#selection-heading').hidden = !e;
  document.querySelector('#selection-type').textContent = e ? e.type === 'group' ? 'GROUPE SÉLECTIONNÉ' : group() ? 'DANS LE GROUPE' : 'OBJET SÉLECTIONNÉ' : '';
  document.querySelector('#selection-title').textContent = e ? e.label || names[e.type] || 'Objet' : '';
  document.querySelector('#enter-group').hidden = e?.type !== 'group';
  document.querySelector('#enter-group').disabled = locked();
  const bdd = e?.type === 'group' ? e : parentGroup(selected);
  const hasBdd = ['Entité BDD', 'Association BDD', 'Relation BDD'].includes(bdd?.label)&&!isEntityBox(bdd);
  document.querySelector('#edit-bdd').hidden = !hasBdd;
  document.querySelector('#edit-bdd').disabled = locked();
  const uml=Boolean(isUmlNode(bdd)||isUmlRelation(bdd));
  document.querySelector('#edit-uml').hidden=!uml;document.querySelector('#edit-uml').disabled=locked();
  if(isUmlNode(e)){const values=readUmlNode(e);document.querySelector('#selection-title').textContent=values.name||NODE_LABELS[values.kind][0];}
  if(isUmlRelation(e))document.querySelector('#selection-title').textContent=RELATION_LABELS[e.relationKind][0];
  if(count>1){
    document.querySelector('#selection-type').textContent='SÉLECTION MULTIPLE';
    document.querySelector('#selection-title').textContent=`${count} éléments sélectionnés`;
    for(const selector of ['#enter-group','#edit-bdd','#edit-uml'])document.querySelector(selector).hidden=true;
  }
  document.querySelector('#reset-route').hidden=!editableConnector(e)||count>1;
  document.querySelector('#reset-route').disabled=locked()||!e?.waypoints?.length;
  const chosen=new Set(selectionIds());
  document.querySelector('#align-button').disabled=locked()||page().elements.filter(e=>chosen.has(e.id)&&isLayoutBox(e)).length<2;
  document.querySelector('#auto-layout').disabled=locked()||!page().elements.some(isLayoutBox);
  positionSelectionCommands();
}

const thumbnailSvg=weakMemo(p=>pageSvg(p));
const pageButtons=new Map();
function renderPages() {
  const nav=document.querySelector('#pages'),ids=new Set(doc().pages.map(p=>p.id));
  for(const [id,entry] of pageButtons)if(!ids.has(id)){entry.node.remove();pageButtons.delete(id);}
  doc().pages.forEach((p,i)=>{
    let entry=pageButtons.get(p.id);
    if(!entry){const node=document.createElement('button');node.className='page-link';node.dataset.page=p.id;entry={node};pageButtons.set(p.id,entry);}
    if(entry.page!==p||entry.index!==i){entry.node.innerHTML=`<div class="thumbnail">${thumbnailSvg(p)}<span>${String(i+1).padStart(2,'0')}</span></div><span>Feuille ${String(i+1).padStart(2,'0')}</span><small>${p.elements.length?`${p.elements.length} élément(s)`:'Page blanche'}</small>`;entry.page=p;entry.index=i;}
    entry.node.classList.toggle('current',p.id===activePage);entry.node.setAttribute('aria-current',p.id===activePage?'page':'false');
    if(nav.children[i]!==entry.node)nav.insertBefore(entry.node,nav.children[i]||null);
  });
  document.querySelector('#page-count').textContent=String(doc().pages.length).padStart(2,'0');
  document.querySelector('#remove-page').disabled=doc().pages.length===1||locked();
}

function updateHistory() {
  document.querySelector('#undo').disabled = !history.past.length || locked();
  document.querySelector('#redo').disabled = !history.future.length || locked();
  document.querySelector('#delete').disabled = !selected || locked();
}

let journalMarkup=null;
function setText(selector,value){const node=document.querySelector(selector),text=String(value);if(node.textContent!==text)node.textContent=text;}
function updateStats() {
  const s = monitor.snapshot();
  setText('#session-time',duration(s.startedAt == null ? 0 : (s.endedAt ?? Date.now()) - s.startedAt));
  setText('#absence-count',s.absenceCount);
  setText('#away-time',duration(s.totalAwayMs));
  setText('#fullscreen-count',s.fullscreenExits);
  const observed=s.absenceCount>0;
  const absenceLabel=observed?`${s.absenceCount} absence${s.absenceCount>1?'s':''} observée${s.absenceCount>1?'s':''}`:'Aucune absence observée';
  for(const selector of ['#journal-indicator','#journal-status-indicator'])document.querySelector(selector).classList.toggle('has-absence',observed);
  document.querySelector('#journal-status').classList.toggle('has-absence',observed);
  setText('#journal-status-text',absenceLabel);
  document.querySelector('#journal-button').setAttribute('aria-label',`Journal — ${absenceLabel.toLowerCase()}`);
  document.querySelector('#journal-button').title=absenceLabel;
  if(document.querySelector('#journal-dialog').open){
    const content=document.querySelector('#journal-content'),scroll=content.querySelector('.journal-table')?.scrollTop||0;
    const markup=journalHtml(false);
    if(markup!==journalMarkup){content.innerHTML=markup;journalMarkup=markup;const table=content.querySelector('.journal-table');if(table)table.scrollTop=scroll;}
  }
  setText('#session-label',{ idle: 'Espace de préparation', active: 'Évaluation en cours', finished: 'Évaluation terminée' }[s.status]);
  setText('#session', { idle: "Démarrer l'évaluation →", active: 'Terminer la session ✓', finished: 'Session terminée ✓' }[s.status]);
  document.querySelector('#session').disabled = s.status === 'finished' || !ownsWorkspace;
  const fullscreenButton = document.querySelector('#fullscreen');
  fullscreenButton.disabled = s.status === 'active' && Boolean(document.fullscreenElement);
  fullscreenButton.textContent = document.fullscreenElement ? s.status === 'active' ? '⛶ Plein écran actif' : '⛶ Quitter le plein écran' : s.status === 'active' ? '⛶ Revenir en plein écran' : '⛶ Passer en plein écran';
  for (const selector of ['#import', '#export', '#new-copy', '#print']) document.querySelector(selector).disabled = s.status === 'active' || !ownsWorkspace;
  document.querySelector('#print').title = s.status === 'active' ? 'Terminez la session pour imprimer la copie et son bilan.' : 'Imprimer les feuilles A4 et le bilan';
  for (const selector of ['#student-name', '#exam-title']) document.querySelector(selector).disabled = s.status !== 'idle' || !ownsWorkspace;
  for (const selector of ['#add-page', '#entity', '#association', '#relation', '#code-block','#stroke-trigger']) document.querySelector(selector).disabled = locked();
  document.querySelector('#auto-layout').disabled=locked()||!page().elements.some(isLayoutBox);
  umlUi?.syncLocked();
  if (locked()) {document.querySelector('#text-context').hidden = true;strokeUi?.close();}
  updateHistory();
}

function selectElement(elementId, preserveMultiple=false) {
  if(!preserveMultiple)multiSelection=[];
  selected = elementId;
  const e = item();
  if (e?.type === 'text') {
    fontSize = e.fontSize;
  }
  renderPaper(); updateHistory();
}

function setTool(value) {
  tool = value; gesture = null;hoveredAnchor=null;
  if (tool !== 'select') selected = null;
  document.querySelectorAll('[data-tool]').forEach(b => { b.classList.toggle('active', b.dataset.tool === tool); b.setAttribute('aria-pressed', b.dataset.tool === tool); });
  document.querySelector('#tool-hint').textContent = { select: 'MAJ + clic : sélectionner · ALT + glisser : dupliquer', text: 'Cliquez sur la feuille et commencez à écrire.', pen: 'Tracez librement à la souris ou au stylet.',line:'Reliez les points violets : les connexions suivront les formes.',arrow:'Reliez les points violets : les connexions suivront les formes.' }[tool] || 'Glisser : tracer · MAJ : proportions · ALT : depuis le centre';
  renderPaper(); updateHistory();
}

document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
for (const [selector, key] of [['#student-name', 'name']]) {
  const input = document.querySelector(selector); input.value = doc().student[key];
  input.oninput = () => { history = { ...history, present: { ...doc(), student: { ...doc().student, [key]: input.value } } }; persist(); renderPaper(); };
}
document.querySelector('#exam-title').value = doc().exam;
document.querySelector('#exam-title').oninput = e => { history = { ...history, present: { ...doc(), exam: e.target.value } }; persist(); renderPaper(); };
document.querySelector('#pages').onclick = e => { const button = e.target.closest('[data-page]'); if (button) { activePage = button.dataset.page; selected = null; editingGroup = null; renderPages(); renderPaper(); updateHistory(); document.querySelector('.paper-scroll').scrollTo(0,0); } };
document.querySelector('#add-page').onclick = () => { const next = addPage(doc()); activePage = next.pages.at(-1).id; selected = null; editingGroup = null; change(next); document.querySelector('.paper-scroll').scrollTo(0,0); };
document.querySelector('#remove-page').onclick = async () => { if (page().elements.length && !await confirmAction('Supprimer cette feuille et son contenu ?')) return; selected = null; change(removePage(doc(), activePage)); };
function travel(fn) { if (locked()) return; const { student, exam } = doc(); history = fn(history); history = { ...history, present: { ...doc(), student, exam } }; selected = null; if (!group()) editingGroup = null; persist(); renderPaper(); renderPages(); updateHistory(); }
document.querySelector('#undo').onclick = () => travel(undo);
document.querySelector('#redo').onclick = () => travel(redo);
function deleteSelected() { if (selected&&!locked()) { let next=doc();for(const elementId of selectionIds())next=removeElement(next,activePage,elementId);setSelection([]);change(next); } }
document.querySelector('#delete').onclick = deleteSelected;
function styleSelected(patch) {
  if (!selected || locked()) return;
  let next=doc();
  for(const e of selectedElements()){
    const changes=e.type==='group'?{...patch,children:e.children.map(child=>({...child,...patch,...(patch.stroke&&child.role==='uml-marker'&&child.fill!=='none'&&child.fill!=='#ffffff'?{fill:patch.stroke}:{})}))}:patch;
    next=updateElement(next,activePage,e.id,changes);
  }
  change(next);
}
function insertText(p, autoPlace = false) {
  if (locked()) return;
  const text = '';
  let element = { id: id(), type: 'text', ...p, text, fontSize, width:Math.min(320,W-32-p.x), height:fontSize*1.3, stroke: color, strokeWidth: thickness };
  if (autoPlace) { try { element = placeElement(element); } catch (error) { toast(error.message, true); return; } }
  if (!textFits(element)) { toast('Le texte ne tient pas à cet endroit. Cliquez plus haut ou plus à gauche, ou répartissez le texte sur plusieurs feuilles.', true); return; }
  editingGroup = null; selected = element.id; change(addElement(doc(), activePage, element)); setTool('select');
  beginTextEdit(element.id);
  document.querySelector('#inline-text')?.select();
}
document.querySelector('#context-edit').onclick = () => beginTextEdit(selected);
document.querySelector('#context-delete').onclick = deleteSelected;
document.querySelector('#context-color').oninput = e => styleSelected({ stroke: e.target.value });
for(const style of TEXT_STYLES)document.querySelector(`#context-${style}`).onclick=()=>{const text=item();if(text?.type==='text')styleSelected({[style]:!text[style]});};
document.querySelector('#context-size').onchange = e => {
  if (item()?.type !== 'text' || locked()) return;
  fontSize = Number(e.target.value);
  const patch = { fontSize };
  if (!textFits({ ...item(), ...patch })) { toast('Ce texte dépasse la feuille. Réduisez sa taille, déplacez-le ou répartissez-le sur plusieurs feuilles.', true); return; }
  let next = updateElement(doc(), activePage, selected, patch);
  const parent = parentGroup(selected);
  if (parent) next = reframeGroup(next, parent.id);
  if (!next) { toast('Ce texte ferait dépasser le groupe de la feuille. Raccourcissez-le ou déplacez le groupe.', true); return; }
  change(next);
};

function workspaceArea(){const rect=document.querySelector('.paper-scroll').getBoundingClientRect();return {left:rect.left+8,right:rect.right-8,top:Math.max(78,rect.top+8),bottom:rect.bottom-8};}
function positionFloating(node,target){
  const area=workspaceArea();node.style.maxWidth=`${Math.max(0,area.right-area.left)}px`;node.style.maxHeight=`${Math.max(0,area.bottom-area.top)}px`;
  const paperRect=document.querySelector('#paper svg').getBoundingClientRect(),scale=paperRect.width/W;
  const exclude=new Set([selected,parentGroup(selected)?.id]);
  const obstacles=floatingBoxes(resolvedPage().elements).filter(e=>!exclude.has(e.id)).map(({box})=>({left:paperRect.left+box.x*scale,top:paperRect.top+box.y*scale,right:paperRect.left+(box.x+box.width)*scale,bottom:paperRect.top+(box.y+box.height)*scale}));
  const position=placeFloating(target,{width:node.offsetWidth,height:node.offsetHeight},area,10,obstacles);
  Object.assign(node.style,{left:`${position.left}px`,top:`${position.top}px`,right:'auto',bottom:'auto'});
}
function canvasElementNode(id){return document.querySelector(`#paper [data-element="${CSS.escape(id)}"]`);}
function positionSelectionCommands(){
  const card=document.querySelector('.selection-card'),element=item();
  if(!element||selectionIds().length!==1||editingText||gesture?.changed||element.type!=='group'&&!editableConnector(element)){card.hidden=true;return;}
  if(![...card.querySelectorAll('button')].some(button=>!button.hidden&&!button.disabled)){card.hidden=true;return;}
  const node=canvasElementNode(element.id);if(!node){card.hidden=true;return;}
  const target=node.getBoundingClientRect(),area=workspaceArea();
  if(target.bottom<area.top||target.top>area.bottom||target.right<area.left||target.left>area.right){card.hidden=true;return;}
  card.hidden=false;card.setAttribute('aria-label',`Options : ${document.querySelector('#selection-title').textContent}`);positionFloating(card,target);
}

function updateTextContext() {
  const menu = document.querySelector('#text-context');
  const e = item();
  if (!e || selectionIds().length>1 || e.type !== 'text' || editingText || gesture?.changed || locked() || document.querySelector('dialog[open]')) { menu.hidden = true; return; }
  const node = canvasElementNode(e.id);
  if (!node) { menu.hidden = true; return; }
  const bounds = node.getBoundingClientRect();
  const viewport = document.querySelector('.paper-scroll').getBoundingClientRect();
  if (bounds.bottom < viewport.top || bounds.top > viewport.bottom || bounds.right < viewport.left || bounds.left > viewport.right) { menu.hidden = true; return; }
  menu.hidden = false;
  document.querySelector('#context-size').value = e.fontSize;
  const sizeControl = document.querySelector('#context-size');
  if (![...sizeControl.options].some(option => Number(option.value) === e.fontSize)) sizeControl.add(new Option(`${Number(e.fontSize.toFixed(1))} px`, e.fontSize));
  sizeControl.value = e.fontSize;
  for(const style of TEXT_STYLES)document.querySelector(`#context-${style}`).hidden=e.role==='code-content';
  document.querySelector('.context-color').hidden=e.role==='code-content';
  sizeControl.disabled = Boolean(e.role);
  sizeControl.title = e.role ? 'Taille adaptée automatiquement au composant du diagramme' : 'Taille du texte';
  document.querySelector('#context-color').value = e.stroke;
  for(const style of TEXT_STYLES)document.querySelector(`#context-${style}`).setAttribute('aria-pressed',Boolean(e[style]));
  positionFloating(menu,bounds);
}

function readAttributeInputs() {
  return [...document.querySelectorAll('#attribute-rows tr')].map(row => ({
    name: row.querySelector('[data-field="name"]').value.trim(),
    type: row.querySelector('[data-field="type"]').value.trim(),
    key: row.querySelector('[data-field="key"]').value,
    nullable: row.querySelector('[data-field="nullable"]').checked,
  }));
}
function renderAttributeRows(attributes) {
  document.querySelector('#attribute-rows').innerHTML = attributes.map((attribute, index) => `<tr><td><select data-field="key" aria-label="Clé de l'attribut ${index + 1}">${['','PK','FK','PK,FK'].map(key => `<option value="${key}"${key === attribute.key ? ' selected' : ''}>${key || '—'}</option>`).join('')}</select></td><td><input data-field="name" aria-label="Nom de l'attribut ${index + 1}" value="${esc(attribute.name)}" maxlength="40" required placeholder="nom_attribut" /></td><td><input data-field="type" aria-label="Type de l'attribut ${index + 1}" value="${esc(attribute.type)}" list="sql-types" maxlength="30" required /></td><td><input data-field="nullable" aria-label="Valeur NULL autorisée pour l'attribut ${index + 1}" type="checkbox"${attribute.nullable ? ' checked' : ''} /></td><td><button data-remove-row="${index}" type="button" class="attribute-remove" aria-label="Supprimer l'attribut ${index + 1}">×</button></td></tr>`).join('');
  document.querySelector('#add-attribute').disabled = attributes.length >= 12;
}
document.querySelector('#add-attribute').onclick = () => { const attributes = readAttributeInputs(); if (attributes.length < 12) { attributes.push({ name: '', type: 'VARCHAR(100)', key: '', nullable: true }); renderAttributeRows(attributes); document.querySelector('#attribute-rows tr:last-child [data-field="name"]').focus(); } };
document.querySelector('#attribute-rows').onclick = event => { const button = event.target.closest('[data-remove-row]'); if (button) renderAttributeRows(readAttributeInputs().filter((_, index) => index !== Number(button.dataset.removeRow))); };

function openBddEditor(kind, existing) {
  if (locked()) return;
  bddEditing = { kind, existing };
  const values = kind === 'entity' ? readEntity(existing) : kind === 'association' ? readAssociation(existing) : readRelation(existing);
  document.querySelector('#bdd-title').textContent = `Configurer ${kind === 'entity' ? "l'entité" : kind === 'association' ? "l'association" : 'le lien'}`;
  document.querySelector('#bdd-name').value = values.name;
  document.querySelector('#bdd-error').hidden = true;
  document.querySelector('#bdd-attributes').hidden = kind === 'relation';
  document.querySelector('#bdd-link-fields').hidden = kind !== 'relation';
  // Hidden required fields must not prevent a relation form from submitting.
  renderAttributeRows(kind === 'relation' ? [] : values.attributes);
  const targets = page().elements.filter(e => e.type === 'group' && ['Entité BDD','Association BDD'].includes(e.label));
  const options = '<option value="">Lien libre</option>' + targets.map(e => `<option value="${esc(e.id)}">${esc(e.label === 'Entité BDD' ? readEntity(e).name : readAssociation(e).name)}</option>`).join('');
  document.querySelector('#bdd-source').innerHTML = options; document.querySelector('#bdd-target').innerHTML = options;
  document.querySelector('#bdd-source').value = values.sourceId || '';
  document.querySelector('#bdd-target').value = values.targetId || '';
  for (const selector of ['#bdd-left','#bdd-right']) document.querySelector(selector).innerHTML = CARDINALITIES.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
  document.querySelector('#bdd-left').value = values.left || '1,1'; document.querySelector('#bdd-right').value = values.right || '0,N';
  document.querySelector('#bdd-form button[value="save"]').textContent = 'Enregistrer les modifications';
  document.querySelector('#text-context').hidden = true;
  document.querySelector('#bdd-dialog').showModal();
}

document.querySelector('#bdd-form').onsubmit = event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  if (locked() || !bddEditing) return;
  try {
    const { kind, existing } = bddEditing;
    const name = document.querySelector('#bdd-name').value.trim();
    if (!name) throw new Error('Donnez un nom à cet élément.');
    const attributes = readAttributeInputs();
    if (kind === 'entity' && !attributes.length) throw new Error('Ajoutez au moins un attribut à votre entité.');
    if (new Set(attributes.map(a => a.name.toLowerCase())).size !== attributes.length) throw new Error("Chaque attribut doit avoir un nom distinct.");
    const sourceId = document.querySelector('#bdd-source').value || null;
    const targetId = document.querySelector('#bdd-target').value || null;
    if (kind === 'relation' && Boolean(sourceId) !== Boolean(targetId)) throw new Error('Choisissez les deux éléments à relier, ou laissez les deux vides.');
    if (kind === 'relation' && sourceId && sourceId === targetId) throw new Error('Choisissez deux éléments distincts pour ce lien.');
    const values = { name, attributes, sourceId, targetId, left: document.querySelector('#bdd-left').value, right: document.querySelector('#bdd-right').value };
    const element = kind === 'entity' ? updateEntity(existing, values) : kind === 'association' ? updateAssociation(existing, values) : updateRelation(existing, values);
    const next = updateElement(doc(), activePage, existing.id, element);
    validateDocument(next);
    selected = element.id; editingGroup = null;
    change(next); setTool('select');
    document.querySelector('#bdd-dialog').close('save');
    bddEditing = null;
  } catch (error) {
    const message = document.querySelector('#bdd-error'); message.textContent = error.message || 'Cet élément ne tient pas sur la feuille.'; message.hidden = false;
  }
};
document.querySelector('#bdd-dialog').addEventListener('close', () => { bddEditing = null; updateTextContext(); });
document.querySelector('#grid').onchange = e => { grid = e.target.checked; saveVisualPreferences();renderPaper(); };
const settingsPopover=document.querySelector('#settings-popover');
function positionSettings(){
  if(!settingsPopover.matches(':popover-open'))return;
  const anchor=document.querySelector('#settings-button').getBoundingClientRect();
  settingsPopover.style.left=`${Math.max(12,Math.min(innerWidth-settingsPopover.offsetWidth-12,anchor.left))}px`;
  settingsPopover.style.top=`${Math.max(12,Math.min(innerHeight-settingsPopover.offsetHeight-12,anchor.top-settingsPopover.offsetHeight-10))}px`;
}
document.querySelector('#settings-button').onclick=()=>{settingsPopover.togglePopover();positionSettings();};
document.querySelector('#settings-close').onclick=()=>settingsPopover.hidePopover();
settingsPopover.addEventListener('toggle',()=>document.querySelector('#settings-button').setAttribute('aria-expanded',settingsPopover.matches(':popover-open')));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&settingsPopover.matches(':popover-open')){e.stopPropagation();settingsPopover.hidePopover();document.querySelector('#settings-button').focus();}},true);
window.addEventListener('resize',positionSettings);
document.querySelector('#zoom-out').onclick = () => { fitZoom = false; zoom = Math.max(30, zoom - 10); renderPaper(); };
document.querySelector('#zoom-in').onclick = () => { fitZoom = false; zoom = Math.min(130, zoom + 10); renderPaper(); };
function fitPaper() {
  if (!fitZoom || editingText) return;
  const nextZoom = Math.min(100, Math.max(30, Math.floor((document.querySelector('.paper-scroll').clientWidth - 36) / W * 100)));
  if (nextZoom !== zoom) { zoom = nextZoom; renderPaper(); }
}
document.querySelector('#zoom-label').onclick = () => {fitZoom=false;zoom=100;renderPaper();};
document.querySelector('#zoom-fit').onclick = () => { fitZoom = true; fitPaper(); };
new ResizeObserver(()=>{fitPaper();floatingFrame.schedule();}).observe(document.querySelector('.paper-scroll'));

let pointerBounds=null;
window.addEventListener('scroll',()=>{pointerBounds=null;},true);
window.addEventListener('resize',()=>{pointerBounds=null;});
function point(event) {
  const bounds = gesture?(pointerBounds??=document.querySelector('#paper svg').getBoundingClientRect()):document.querySelector('#paper svg').getBoundingClientRect();
  return { x: Math.max(24, Math.min(W - 24, (event.clientX - bounds.left) * W / bounds.width)), y: Math.max(24, Math.min(H - 24, (event.clientY - bounds.top) * H / bounds.height)) };
}
function connectorDraft(owner,wire){
  if(owner.type!=='group')return wire;
  return {...owner,sourceId:wire.sourceId,targetId:wire.targetId,sourceAnchor:wire.sourceAnchor,targetAnchor:wire.targetAnchor,waypoints:wire.waypoints,startPoint:wire.sourceId?undefined:{x:wire.x,y:wire.y},endPoint:wire.targetId?undefined:{x:wire.x2,y:wire.y2}};
}
const paperNode = document.querySelector('#paper');
paperNode.addEventListener('click',event=>{
  const action=event.target.closest('[data-diagram-action]');
  if(action){performDiagramAction(action.closest('[data-diagram-owner]').dataset.diagramOwner,action.dataset.diagramAction);return;}
  if(pendingDiagramEdit){const fieldId=pendingDiagramEdit;pendingDiagramEdit=null;beginTextEdit(fieldId);}
});
paperNode.addEventListener('keydown',event=>{const action=event.target.closest('[data-diagram-action]');if(action&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();performDiagramAction(action.closest('[data-diagram-owner]').dataset.diagramOwner,action.dataset.diagramAction);}});
paperNode.onpointerdown = e => {
  pointerBounds=null;
  if (locked() || e.button !== 0 || !e.target.closest('svg')) return;
  if (editingText && !commitTextEdit()) return;
  if (gesture) return;
  e.preventDefault();
  pendingDiagramEdit=null;
  if(e.target.closest('[data-diagram-action]'))return;
  const p = point(e);
  if (tool === 'select') {
    const bend=e.target.closest('[data-bend-index]');
    if(bend&&editableConnector(item())){lastPointerClick=null;paperNode.setPointerCapture(e.pointerId);gesture={pointerId:e.pointerId,start:p,original:structuredClone(item()),originalWire:structuredClone(editableConnector(item())),originalRaw:structuredClone(page().elements.find(e=>e.id===selected)||item()),draft:item(),bendIndex:Number(bend.dataset.bendIndex)};document.querySelector('#text-context').hidden=true;return;}
    const handle=e.target.closest('[data-resize]')?.dataset.resize;
    if(handle&&item()){
      lastPointerClick=null;
      paperNode.setPointerCapture(e.pointerId);
      gesture={pointerId:e.pointerId,start:p,original:structuredClone(item()),originalWire:editableConnector(item())?structuredClone(editableConnector(item())):null,originalRaw:structuredClone(page().elements.find(e=>e.id===selected)||item()),draft:item(),resizing:handle};
      document.querySelector('#text-context').hidden=true;
      renderPaper();
      return;
    }
    const target = e.target.closest('[data-element]');
    const parentId = target?.closest('[data-group]')?.dataset.group;
    const diagram=page().elements.find(e=>e.id===parentId&&isDiagram(e));
    const directField=diagram?.children.find(c=>c.id===target?.dataset.element&&editableDiagramText(c));
    const beforeLeavingGroup=[...selectionIds()];
    const leavingGroup=Boolean(target&&editingGroup&&parentId!==editingGroup);
    if (leavingGroup) {editingGroup = null;if(!e.shiftKey)setSelection([]);}
    const hit=parentId && parentId !== editingGroup ? parentId : target?.dataset.element || null;
    const previous=[...new Set((leavingGroup&&e.shiftKey?beforeLeavingGroup:selectionIds()).map(id=>!editingGroup?parentGroup(id)?.id||id:id))];
    if(!hit){
      lastPointerClick=null;
      setSelection(e.shiftKey?previous:[]);
      paperNode.setPointerCapture(e.pointerId);
      gesture={pointerId:e.pointerId,start:p,end:p,marquee:true,base:e.shiftKey?previous:[],candidates:selectionCandidates()};
      renderPaper();return;
    }
    if(e.shiftKey&&!e.altKey){
      setSelection(previous.includes(hit)?previous.filter(id=>id!==hit):[...previous,hit]);
      lastPointerClick=null;renderPaper();updateHistory();return;
    }
    if(!previous.includes(hit))setSelection([hit]);
    else selected=hit;
    const element = item();
    const repeated = selected && lastPointerClick?.id === selected && e.timeStamp - lastPointerClick.at < 450 && Math.hypot(p.x - lastPointerClick.x, p.y - lastPointerClick.y) < 10;
    lastPointerClick = { id: selected, at: e.timeStamp, ...p };
    if (repeated && !directField && selectionIds().length===1 && !e.altKey && (element?.type === 'group' || element?.type === 'text')) {
      lastPointerClick = null;
      if (element.type === 'group') enterGroup(element.id);
      else beginTextEdit(element.id);
      return;
    }
    paperNode.setPointerCapture(e.pointerId);
    const parent = page().elements.find(group => group.id === parentId);
    const attached = parent?.sourceId;
    if(selectionIds().length>1&&!group()?.sourceId&&selectedElements().some(e=>!e.sourceId&&!e.targetId)){
      gesture={pointerId:e.pointerId,start:p,originals:structuredClone(selectedElements()),available:selectionCandidates(),batchMoving:true,duplicate:e.altKey};
      lastPointerClick=null;renderPaper();return;
    }
    if (element && !attached && !element.sourceId&&!element.targetId) gesture = { pointerId: e.pointerId, start: p, original: structuredClone(element), draft: element, moving: true, duplicate:e.altKey,editOnClick:directField?.id };
    else if(directField)pendingDiagramEdit=directField.id;
    selectElement(selected,true); return;
  }
  lastPointerClick = null;
  paperNode.setPointerCapture(e.pointerId);
  editingGroup = null;
  if (tool === 'text') {
    insertText(p); return;
  }
  let element = { id: id(), type: tool, ...p, stroke: color, strokeWidth: thickness, ...(dash?{dash}:{}) };
  const sourceAnchor=['line','arrow'].includes(tool)?findAnchor(resolvedPage().elements,p,16*100/zoom):null;
  if (tool === 'pen') element.points = [p];
  else if (tool === 'line' || tool === 'arrow') {Object.assign(element, { x2: p.x, y2: p.y,routing:'orthogonal' });element=attachEndpoint(element,'start',p,sourceAnchor);element.x2=element.x;element.y2=element.y;}
  else Object.assign(element, { width: 0, height: 0 });
  gesture = { pointerId: e.pointerId, start: sourceAnchor||p, draft: element,sourceAnchor,snapAnchor:sourceAnchor };
  renderPaper();
};
const gestureFrame=frameTask(()=>{if(gesture?.marquee||!gesture){renderPaper();return;}const g=gesture;paintGesture(g);});
function paintGesture(g){
  patchSvg(document.querySelector('#paper'),pageSvg(page(), { selected, selectedIds:g.copies?.map(e=>e.id)||selectionIds(), editingGroup, grid, draft: g.draft, drafts:g.drafts, handleSize:1000/zoom,connectionMode:['line','arrow'].includes(tool)||Boolean(g.resizing&&(g.originalWire||['line','arrow'].includes(g.original.type))),snapAnchor:g.snapAnchor,editHints:!locked() }));
}
paperNode.onpointermove = e => {
  if(!gesture){
    if(['line','arrow'].includes(tool)){
      const anchor=findAnchor(resolvedPage().elements,point(e),16*100/zoom);
      if(anchor?.shapeId!==hoveredAnchor?.shapeId||anchor?.side!==hoveredAnchor?.side){hoveredAnchor=anchor;gestureFrame.schedule();}
    }
    return;
  }
  if (gesture.pointerId !== e.pointerId) return;
  const p = point(e); const g = gesture; const el = g.draft;
  g.lastClient={clientX:e.clientX,clientY:e.clientY};
  if(g.marquee){
    g.end=p;
    if(Math.hypot(p.x-g.start.x,p.y-g.start.y)>3){g.changed=true;setSelection([...g.base,...enclosedElements(g.candidates,g.start,p)]);}
    gestureFrame.schedule();return;
  } else if(g.batchMoving){
    if(!g.changed&&Math.hypot(p.x-g.start.x,p.y-g.start.y)<3)return;
    if(!g.changed&&g.duplicate)g.copies=duplicateSelection(g.originals,g.available);
    g.changed=true;
    let dx=p.x-g.start.x,dy=p.y-g.start.y;
    if(e.shiftKey){if(Math.abs(dx)>=Math.abs(dy))dy=0;else dx=0;}
    g.drafts=moveSelection(g.copies||g.originals,dx,dy);
  } else if(g.bendIndex!==undefined){
    try{g.draft=connectorDraft(g.originalRaw||g.original,moveBend(g.originalWire||g.original,g.bendIndex,p));g.changed=true;}catch(error){toast(error.message,true);}
  } else if (g.resizing) {
    g.changed=true;
    if(g.originalWire||['line','arrow'].includes(g.original.type)){
      g.snapAnchor=findAnchor(resolvedPage().elements,p,16*100/zoom);
      g.draft=connectorDraft(g.originalRaw||g.original,attachEndpoint(g.originalWire||g.original,g.resizing,p,g.snapAnchor));
    }else g.draft=resizeElement(g.original,g.resizing,p,{shift:e.shiftKey,alt:e.altKey});
  } else if (g.moving) {
    const original = g.original;
    const bounds = elementBounds(original);
    let moveX=p.x-g.start.x,moveY=p.y-g.start.y;
    if(e.shiftKey){if(Math.abs(moveX)>=Math.abs(moveY))moveY=0;else moveX=0;}
    const dx = Math.max(24 - bounds.x, Math.min(W - 24 - bounds.x - bounds.width, moveX));
    const dy = Math.max(24 - bounds.y, Math.min(H - 24 - bounds.y - bounds.height, moveY));
    if (!g.changed && Math.hypot(p.x - g.start.x, p.y - g.start.y) < 3) return;
    if(!g.changed&&g.duplicate)g.copy=duplicateElement(original);
    g.changed = true;
    lastPointerClick = null;
    g.draft = translateElement(g.copy||original, dx, dy);
  } else if (el.type === 'pen') { if (el.points.length < 20000) el.points.push(p); }
  else if(isConnector(el)){
    g.snapAnchor=findAnchor(resolvedPage().elements,p,16*100/zoom,g.sourceAnchor);
    const drawn=createShape(el,g.start,p,{shift:e.shiftKey,alt:e.altKey&&!g.sourceAnchor});
    g.draft=attachEndpoint(drawn,'end',{x:drawn.x2,y:drawn.y2},g.snapAnchor);
  }else g.draft=createShape(el,g.start,p,{shift:e.shiftKey,alt:e.altKey});
  document.querySelector('#text-context').hidden=true;document.querySelector('.selection-card').hidden=true;gestureFrame.schedule();
};
paperNode.onpointerup = e => {
  gestureFrame.flush();
  if (paperNode.hasPointerCapture(e.pointerId)) paperNode.releasePointerCapture(e.pointerId);
  if (!gesture || gesture.pointerId !== e.pointerId) {if(pendingDiagramEdit){const fieldId=pendingDiagramEdit;pendingDiagramEdit=null;ignoreOutsideClickUntil=Date.now()+150;beginTextEdit(fieldId);}return;}
  const g = gesture; gesture = null;hoveredAnchor=null;
  if(g.marquee){renderPaper();updateHistory();return;}
  if(g.batchMoving){
    if(!g.changed){renderPaper();return;}
    let next=doc();
    if(g.copies&&group())next=updateElement(next,activePage,editingGroup,{children:[...group().children,...g.drafts]});
    else for(const element of g.drafts)next=g.copies?addElement(next,activePage,element):updateElement(next,activePage,element.id,element);
    try{
      validateDocument(next);
      if(g.drafts.flatMap(e=>[e,...(e.children||[])]).some(e=>e.type==='text'&&!textFits(e)))throw new Error();
    }catch{toast('Modification annulée : la sélection dépasserait les limites de la feuille.',true);renderPaper();return;}
    setSelection(g.drafts.map(e=>e.id));change(next);return;
  }
  if (g.moving||g.resizing||g.bendIndex!==undefined) {
    if (!g.changed) {if(g.editOnClick&&!g.duplicate){ignoreOutsideClickUntil=Date.now()+150;beginTextEdit(g.editOnClick);}else renderPaper();return;}
    if (g.draft.type === 'text' && !textFits(g.draft)) { toast('Modification annulée : le texte dépasserait la feuille.', true); renderPaper(); return; }
    const next=g.copy?addElement(doc(),activePage,g.draft):updateElement(doc(),activePage,selected,g.draft);
    try{validateDocument(next);}catch{toast('Modification annulée : cet objet dépasserait les limites autorisées.',true);renderPaper();return;}
    selected=g.draft.id;change(next);return;
  }
  if ((g.draft.width !== undefined && (g.draft.width < 3 || g.draft.height < 3)) || (g.draft.points && g.draft.points.length < 2)) { renderPaper(); return; }
  if(isConnector(g.draft)&&Math.hypot(g.draft.x2-g.draft.x,g.draft.y2-g.draft.y)<3){renderPaper();return;}
  selected = g.draft.id; change(addElement(doc(), activePage, g.draft));
};
paperNode.onpointercancel = e => { gestureFrame.cancel(); pendingDiagramEdit=null;if (gesture?.pointerId === e.pointerId) { gesture = null; renderPaper(); } };
for(const eventName of ['keydown','keyup'])window.addEventListener(eventName,e=>{
  if(!['Shift','Alt'].includes(e.key)||!gesture?.lastClient||gesture.moving||gesture.batchMoving||gesture.marquee)return;
  e.preventDefault();
  paperNode.onpointermove({...gesture.lastClient,pointerId:gesture.pointerId,shiftKey:e.shiftKey,altKey:e.altKey});
});
// Detect the second pointer press above: SVG redraws can replace the original
// click target before a browser-generated dblclick reaches it.
paperNode.ondblclick = event => event.preventDefault();
window.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select,[contenteditable]') || document.querySelector('dialog[open]')) return;
  const shortcut=toolShortcut(e,Boolean(editingText)||e.repeat);
  if(shortcut&&!gesture&&!locked()){e.preventDefault();setTool(shortcut);return;}
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); travel(e.shiftKey ? redo : undo); }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
  if(e.key==='Enter'&&e.target.closest('button,a,summary,[role="button"]'))return;
  if (e.key === 'Enter' && selectionIds().length===1 && item()?.type === 'group') { e.preventDefault(); enterGroup(selected); }
  else if (e.key === 'Enter' && selectionIds().length===1 && item()?.type === 'text') { e.preventDefault(); beginTextEdit(selected); }
  if (e.key === 'Escape') { if (editingGroup) exitGroup(); else { gesture = null; selected = null; setTool('select'); } }
});

document.querySelector('#entity').onclick = () => insertBddDirect('entity');
document.querySelector('#association').onclick = () => insertBddDirect('association');
document.querySelector('#relation').onclick = () => insertBddDirect('relation');

document.querySelector('#session').onclick = async () => {
  if (monitor.snapshot().status === 'idle') {
    if (!doc().student.name.trim() || !doc().exam.trim()) { toast("Renseignez votre nom et l'évaluation avant de commencer.", true); return; }
    document.querySelector('#fullscreen-error').hidden = true;
    document.querySelector('#session-dialog').showModal();
  } else if (await confirmAction('Terminer la session ? Votre copie sera figée et prête à imprimer.')) {
    gesture = null; monitor.finish(); persist(); renderPaper(); renderPages(); updateStats(); toast('Session terminée. Vous pouvez maintenant imprimer votre copie et son bilan en PDF.');
  }
};
document.querySelector('#session-dialog').addEventListener('cancel', event => { if (startingSession) event.preventDefault(); });
document.querySelector('#session-dialog form').addEventListener('submit', async event => {
  if (event.submitter?.value !== 'start') return;
  event.preventDefault();
  if (startingSession || !ownsWorkspace || monitor.snapshot().status !== 'idle') return;
  const button = event.submitter;
  const error = document.querySelector('#fullscreen-error');
  const backButton = document.querySelector('#session-dialog button[value="cancel"]');
  startingSession = true;
  error.hidden = true; button.disabled = true; backButton.disabled = true;
  try {
    // Request directly from the user's submit gesture; a dialog close event
    // can run after transient browser activation has expired.
    if (!document.fullscreenElement) {
      if (!document.documentElement.requestFullscreen) throw new Error('unsupported');
      await document.documentElement.requestFullscreen();
    }
    if (!document.fullscreenElement) throw new Error('denied');
    document.querySelector('#session-dialog').close('start');
    monitor.start();
    monitor.signal('fullscreen', true);
    monitor.signal('visibility', !document.hidden);
    monitor.signal('focus', document.hasFocus());
    persist(); updateStats(); toast('Évaluation démarrée. Restez dans cette fenêtre et en plein écran.');
  } catch {
    error.textContent = "Le plein écran n'a pas pu être activé. Autorisez-le dans votre navigateur, puis réessayez. La session n'a pas démarré.";
    error.hidden = false;
  } finally { startingSession = false; button.disabled = false; backButton.disabled = false; }
});
window.addEventListener('blur', () => monitor.signal('focus', false));
window.addEventListener('focus', () => monitor.signal('focus', true));
document.addEventListener('visibilitychange', () => { monitor.signal('visibility', !document.hidden); if (!document.hidden) monitor.signal('focus', document.hasFocus()); persist(); });
document.addEventListener('fullscreenchange', () => { monitor.signal('fullscreen', Boolean(document.fullscreenElement)); updateStats(); });
document.querySelector('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('Le plein écran est indisponible dans ce navigateur.', true); } };
window.addEventListener('pagehide', persist);
window.addEventListener('beforeunload', e => { persist(); if (monitor.snapshot().status === 'active') { e.preventDefault(); e.returnValue = ''; } });

function journalHtml(showCounters=true) {
  const s = monitor.snapshot();
  const counters=`<p><b>${s.absenceCount}</b> absence(s) · <b>${duration(s.totalAwayMs)}</b> cumulées · <b>${s.fullscreenExits}</b> sortie(s) du plein écran</p>`;
  const reasons = { focus: 'Perte de focus', visibility: 'Page masquée', reload: 'Interruption / rechargement' };
  return `<div class="journal-summary">${showCounters ? counters : ""}<p>Début : ${s.status === 'idle' ? 'Non démarrée' : time(s.startedAt)}<br>Fin : ${s.status === 'idle' ? 'Non démarrée' : time(s.endedAt)}</p></div>${s.incidents.length ? `<div class="journal-table"><table><thead><tr><th>Début / fin</th><th>Durée</th><th>Signaux observés</th></tr></thead><tbody>${s.incidents.map(i => `<tr><td>${time(i.start)}<br>${time(i.end)}</td><td>${duration(i.durationMs)}</td><td>${i.reasons.map(r => reasons[r] || esc(r)).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-journal">Aucune absence observée.</p>'}${s.fullscreenEvents?.map(e => `<p>Sortie du plein écran : ${time(e.at)}</p>`).join('') || ''}<p class="privacy-note">Une page masquée peut correspondre à un changement d'onglet ou à une fenêtre réduite. Le navigateur ne distingue pas ces causes avec certitude.</p>${notes.map(n => `<p>${esc(n)}</p>`).join('')}`;
}
document.querySelector('#journal-button').onclick = () => { document.querySelector('#journal-content').innerHTML = journalHtml(false); document.querySelector('#journal-dialog').showModal();updateStats(); };
document.querySelector('#close-journal').onclick = () => document.querySelector('#journal-dialog').close();

function preparePrint() {
  document.querySelector('#print-root').innerHTML = printDocument(doc(),monitor.snapshot(),journalHtml());
}
document.querySelector('#print').onclick = () => { notes.push(`Impression demandée le ${time(Date.now())}.`); persist(); preparePrint(); window.print(); };
window.addEventListener('beforeprint', () => { if (monitor.snapshot().status === 'active') notes.push(`Impression navigateur pendant la session le ${time(Date.now())}.`); persist(); preparePrint(); });
document.querySelector('#export').onclick = () => downloadJson(doc(), monitor.snapshot(), notes);
document.querySelector('#import').onclick = () => document.querySelector('#file-input').click();
document.querySelector('#file-input').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 10_000_000) throw new Error('Fichier trop volumineux (10 Mo maximum).');
    const data = JSON.parse(await file.text()); const next = validateDocument(data.document || data);
    if (!await confirmAction('Remplacer la copie courante par ce fichier ? Exportez votre copie actuelle si vous souhaitez la conserver. Le document sera ouvert en préparation, sans importer le suivi de session.')) return;
    recoveryBlocked = false; history = createHistory(next); activePage = next.pages[0].id; selected = null; editingGroup = null; notes = [];
    monitor = createMonitor({ onChange: () => { persist(); updateStats(); } });
    document.querySelector('#student-name').value = doc().student.name; document.querySelector('#exam-title').value = doc().exam;
    persist(); renderPaper(); renderPages(); updateStats(); toast('Copie importée. Une nouvelle session peut commencer.');
  } catch (err) { toast(`Import refusé : ${err.message}`, true); } finally { e.target.value = ''; }
};
document.querySelector('#new-copy').onclick = async () => {
  if (!await confirmAction('Créer une copie vide ? Exportez votre copie actuelle avant de continuer.')) return;
  recoveryBlocked = false; history = createHistory(createDocument()); activePage = doc().pages[0].id; selected = null; editingGroup = null; notes = [];
  monitor = createMonitor({ onChange: () => { persist(); updateStats(); } });
  for (const selector of ['#student-name', '#exam-title']) document.querySelector(selector).value = '';
  persist(); renderPaper(); renderPages(); updateStats(); toast('Nouvelle copie prête.');
};

renderPaper(); renderPages(); updateStats();
if (loaded.error) { document.querySelector('#save-state').textContent = '⚠ Sauvegarde d’origine conservée — exportez cette copie'; toast(loaded.error, true); }
else if (loaded.document) toast('Votre copie a été restaurée depuis cet appareil.');
if (monitor.snapshot().status === 'active') {
  monitor.signal('visibility', !document.hidden); monitor.signal('focus', document.hasFocus()); persist();
}
setInterval(() => { updateStats(); if (ownsWorkspace&&!recoveryBlocked&&monitor.snapshot().status === 'active') {try{saveSession(doc().id,monitor.snapshot());}catch{toast('Suivi de session non enregistré : exportez votre copie.',true);}} }, 1000);

if(ownsWorkspace)restorePendingDraft();

// One editor per origin prevents another tab from overwriting an exam copy.
// The browser releases this lock automatically when this document is destroyed.
if (navigator.locks) {
  navigator.locks.request('captif-workspace-v1', { ifAvailable: true }, lock => {
    if (!lock) {
      document.querySelector('#save-state').textContent = 'Lecture seule : copie ouverte ailleurs';
      toast('Cette copie est déjà ouverte dans un autre onglet. Fermez cet onglet en double, ou fermez l’autre puis rechargez cette page.', true);
      return;
    }
    ownsWorkspace = true; updateStats(); renderPages(); restorePendingDraft();
    return new Promise(() => {});
  }).catch(() => { toast('Impossible de réserver la copie. Rechargez cette page dans un navigateur classique.', true); });
}
