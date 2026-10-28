import { readUmlNode, updateUmlNode, isUmlNode, UML_NODE_KINDS } from './uml-nodes.js';
import { readUmlRelation, updateUmlRelation, isUmlRelation } from './uml-relations.js';
import { escape as esc } from './render.js';
import { shapeIcon } from './shape-icon.js';
import { DIAGRAM_GROUPS, DEFAULT_FAMILY } from './palette-groups.js';

export const NODE_LABELS = {
  class: ['Classe', 'Attributs et opérations'], 'abstract-class': ['Classe abstraite', 'Nom en italique'], interface: ['Interface', 'Contrat «interface»'],
  object: ['Objet / instance', 'Instance, classe et valeurs'], actor: ['Acteur', 'Rôle externe au système'], usecase: ["Cas d’utilisation", 'Objectif ou service rendu'],
  system: ['Frontière du système', 'Cadre des cas d’utilisation'], participant: ['Participant', 'En-tête et ligne de vie'], activation: ['Activation', "Période d'exécution"],
  fragment: ['Fragment combiné', 'alt, opt, loop ou par'], destruction: ['Destruction', 'Fin de la ligne de vie'], note: ['Note', 'Commentaire du diagramme'],
  package:['Paquetage','Conteneur à onglet'],state:['État','État et compartiment'],action:['Action / activité','Action à bords arrondis'],
  initial:['État initial','Point plein'],final:['État final','Cible'], 'flow-final':['Fin de flux','Cercle barré'],decision:['Décision / fusion','Losange'],
  fork:['Fourche de parallélisme','Barre horizontale'],join:['Jonction de parallélisme','Barre verticale'],history:['Historique','Historique simple'],
  'deep-history':['Historique profond','Historique profond'],swimlane:['Couloir d’activité','Partition'],component:['Composant','Composant UML'],artifact:['Artefact','Document'],database:['Base de données','Cylindre'],
  'deployment-node':['Nœud de déploiement','Cube'],port:['Port','Port de composant'],'provided-interface':['Interface fournie','Interface graphique'],'required-interface':['Interface requise','Interface graphique'],
  'entry-point':['Point d’entrée','Événement'],'exit-point':['Point de sortie','Événement'],terminate:['Terminaison','Fin'],junction:['Jonction','Point'],
  'send-signal':['Envoi de signal','Signal'],'receive-signal':['Réception de signal','Signal'],'time-event':['Événement temporel','Sablier'],
  'data-object':['Objet de données','Document'],process:['Processus','Bloc'],subprocess:['Sous-processus','Bloc à doubles bords'],'input-output':['Entrée / sortie','Parallélogramme'],
  document:['Document','Document'], 'manual-input':['Saisie manuelle','Bloc incliné'],preparation:['Préparation','Hexagone'],'weak-entity':['Entité faible','Double cadre'],'identifying-relationship':['Relation identifiante','Double losange'],
};
export const RELATION_LABELS = {
  association: ['Association', 'Lien simple entre éléments'], 'directed-association': ['Association orientée', 'Navigabilité vers l’arrivée'],
  aggregation: ['Agrégation', 'Losange creux côté ensemble'], composition: ['Composition', 'Losange plein côté ensemble'],
  generalization: ['Généralisation', 'Triangle creux vers le parent'], realization: ['Réalisation', 'Contrat implémenté, trait en tirets'], dependency: ['Dépendance', 'Flèche ouverte en tirets'],
  'object-link': ["Lien d’objets", 'Association entre instances'], include: ['«include»', 'Du cas incluant vers le cas inclus'], extend: ['«extend»', 'Du cas d’extension vers le cas étendu'],
  'message-sync': ['Message synchrone', 'Flèche pleine vers le destinataire'], 'message-async': ['Message asynchrone', 'Flèche ouverte'],
  'message-return': ['Retour', 'Flèche ouverte en tirets'], 'message-self': ['Auto-message', 'Appel sur la même ligne de vie'],
  exclude:['«exclude» — exclusion (convention)','Exclusion graphique'],transition:['Transition','Transition entre états'],flow:['Flux de contrôle','Flux entre activités'],
  'message-simple':['Message simple','Flèche ouverte'],'message-timed':['Message minuté (convention)','Message avec horloge'],
  'message-found':['Message trouvé','Origine inconnue'],'message-lost':['Message perdu','Destination inconnue'],
  'message-create':['Message de création','Création d’une instance'],'message-delete':['Message de destruction','Destruction d’une instance'],
  'message-balking':['Message dérobant (convention)','Message non bloquant'],'message-timeout':['Message avec délai (convention)','Délai dépassé'],
  'erd-one-one':['Lien ERD : un à un','Patte d’oie'],'erd-one-many':['Lien ERD : un à plusieurs','Patte d’oie'],'erd-zero-one':['Lien ERD : un à zéro ou un','Patte d’oie'],
  'erd-zero-many':['Lien ERD : un à zéro ou plusieurs','Patte d’oie'],'erd-many-many':['Lien ERD : plusieurs à plusieurs','Patte d’oie'],
};
export const UML_DIAGRAMS = {
  classes: { label: 'Diagramme de classes', description: 'Structure, contrats et relations entre classes.', nodes: ['class','abstract-class','interface','note'], relations: ['association','directed-association','aggregation','composition','generalization','realization','dependency'] },
  objects: { label: "Diagramme d’objets", description: 'Instances et valeurs à un instant donné.', nodes: ['object','note'], relations: ['object-link','dependency'] },
  usecases: { label: "Cas d’utilisation", description: 'Acteurs, objectifs et périmètre du système.', nodes: ['actor','usecase','system','note'], relations: ['association','include','extend','generalization'] },
  sequence: { label: 'Diagramme de séquence', description: 'Participants et échanges dans l’ordre du temps.', nodes: ['participant','activation','fragment','destruction','note'], relations: ['message-simple','message-sync','message-async','message-return','message-self','message-timed','message-found','message-lost','message-create','message-delete','message-balking','message-timeout'] },
  states: {label:'États-transitions',description:'États et transitions.',nodes:['state','initial','final','decision','history','deep-history'],relations:['transition']},
  activity: {label:'Activité',description:'Actions et flux.',nodes:['action','initial','final','flow-final','decision','fork','join','swimlane'],relations:['flow']},
  structure: {label:'Structure et paquetages',description:'Conteneurs et composants.',nodes:['package','component','artifact','database'],relations:['dependency']},
  deployment:{label:'Déploiement et composants',description:'Nœuds et interfaces.',nodes:['deployment-node','port','provided-interface','required-interface'],relations:['dependency']},
  flowchart:{label:'Processus',description:'Processus et événements.',nodes:['entry-point','exit-point','terminate','junction','send-signal','receive-signal','time-event','data-object','process','subprocess','input-output','document','manual-input','preparation','weak-entity','identifying-relationship'],relations:['flow','erd-one-one','erd-one-many','erd-zero-one','erd-zero-many','erd-many-many']},
};
export const PALETTE_NODE_KINDS=UML_NODE_KINDS.filter(kind=>!['abstract-class','interface','weak-entity','identifying-relationship'].includes(kind));
export function umlPaletteMarkup() {
  const button=(attrs,name,svg)=>`<button type="button" class="shape-icon-button" ${attrs} aria-label="${esc(name)}" title="${esc(name)}">${svg}</button>`;
  const node=kind=>kind==='entity'?button('id="entity"','Entité',shapeIcon('entity')):kind==='bdd-association'?button('id="association"','Association — MCD',shapeIcon('association')):kind==='code-block'?button('id="code-block"','Bloc de code',shapeIcon(kind)):button(`data-uml-node="${kind}"`,NODE_LABELS[kind][0],shapeIcon(kind));
  const relation=kind=>kind==='bdd-relation'?button('id="relation"','Lien avec cardinalités',shapeIcon('relation')):button(`data-uml-relation="${kind}"`,RELATION_LABELS[kind][0],relationPreview(kind));
  const chevron='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m8 5 7 7-7 7"/></svg>';
  return `<section id="shape-library" aria-label="Bibliothèque de diagrammes"><h2 class="library-title">Diagrammes <span>${DIAGRAM_GROUPS.length} familles</span></h2><div class="diagram-families">${DIAGRAM_GROUPS.map(group=>`<details class="diagram-family" data-diagram-family="${group.id}"${group.id===DEFAULT_FAMILY?' open':''}><summary><span class="family-symbol" aria-hidden="true">${shapeIcon(group.icon)}</span><span class="family-label">${esc(group.label)}</span><span class="family-count" aria-label="${group.nodes.length+group.relations.length} éléments">${group.nodes.length+group.relations.length}</span><span class="family-chevron">${chevron}</span></summary><div class="family-content"><h3>Formes</h3><div class="shape-icon-grid" role="group" aria-label="Formes — ${esc(group.label)}">${group.nodes.map(node).join('')}</div>${group.relations.length?`<h3>Connexions</h3><div class="shape-icon-grid connection-icon-grid" role="group" aria-label="Connexions — ${esc(group.label)}">${group.relations.map(relation).join('')}</div>`:''}</div></details>`).join('')}</div></section>`;
}

export function umlDialogMarkup() {
  return `<dialog id="uml-dialog" aria-labelledby="uml-dialog-title"><form method="dialog" id="uml-form"><span class="eyebrow">ATELIER UML</span><h2 id="uml-dialog-title">Configurer l’élément</h2><p id="uml-form-hint" class="palette-note"></p>
  <div id="uml-kind-field" hidden><label class="field-label" for="uml-relation-kind">Type de relation</label><select id="uml-relation-kind">${Object.entries(RELATION_LABELS).map(([kind,[name]])=>`<option value="${kind}">${name}</option>`).join('')}</select></div>
  <label class="field-label" id="uml-name-label" for="uml-name-input">Nom</label><input id="uml-name-input" maxlength="50" />
  <div id="uml-stereotype-field"><label class="field-label" for="uml-stereotype-input">Stéréotype facultatif</label><input id="uml-stereotype-input" maxlength="40" placeholder="Ex. service, entity…" /></div>
  <div id="uml-class-field" hidden><label class="field-label" for="uml-class-input">Classe de l’instance</label><input id="uml-class-input" maxlength="50" placeholder="Classe" /></div>
  <div class="uml-member-columns"><div id="uml-attributes-field"><label class="field-label" id="uml-attributes-label" for="uml-attributes-input">Attributs — une ligne par attribut</label><textarea id="uml-attributes-input" rows="6" placeholder="- id : int&#10;- nom : String"></textarea><small>10 lignes maximum · 80 caractères par ligne</small></div><div id="uml-operations-field"><label class="field-label" for="uml-operations-input">Opérations — une ligne par opération</label><textarea id="uml-operations-input" rows="6" placeholder="+ enregistrer() : void"></textarea><small>Visibilité : + public · − privé · # protégé · ~ paquet</small></div></div>
  <div id="uml-fragment-fields" hidden><div class="uml-form-columns"><div><label class="field-label" for="uml-fragment-kind">Opérateur</label><select id="uml-fragment-kind"><option value="alt">alt — alternatives</option><option value="opt">opt — option</option><option value="loop">loop — répétition</option><option value="par">par — parallèle</option></select></div><div><label class="field-label" for="uml-condition-input">Condition / garde</label><input id="uml-condition-input" maxlength="80" placeholder="condition" /></div></div></div>
  <div id="uml-dimensions" class="uml-form-columns"><div id="uml-width-field"><label class="field-label" for="uml-width-input">Largeur</label><input id="uml-width-input" type="number" min="280" max="746" /></div><div id="uml-height-field"><label class="field-label" id="uml-height-label" for="uml-height-input">Hauteur</label><input id="uml-height-input" type="number" min="40" max="1000" /></div></div>
  <div id="uml-endpoints" hidden class="uml-form-columns"><div><label class="field-label" for="uml-source">Départ</label><select id="uml-source"></select></div><div id="uml-target-field"><label class="field-label" for="uml-target">Arrivée</label><select id="uml-target"></select></div></div>
  <div id="uml-anchor-field" hidden><label class="field-label" for="uml-anchor">Ligne de vie associée</label><select id="uml-anchor"></select></div>
  <div id="uml-multiplicities" class="uml-form-columns" hidden><div><label class="field-label" for="uml-left">Multiplicité / rôle au départ</label><input id="uml-left" maxlength="30" placeholder="1" /></div><div><label class="field-label" for="uml-right">Multiplicité / rôle à l’arrivée</label><input id="uml-right" maxlength="30" placeholder="0..*" /></div></div>
  <div id="uml-offset-field" hidden><label class="field-label" for="uml-offset">Position verticale sur les lignes de vie</label><input id="uml-offset" type="number" min="80" max="800" step="1" /><small>En unités de feuille à partir des en-têtes. Les messages se lisent de haut en bas.</small></div>
  <p id="uml-error" class="fullscreen-error" role="alert" hidden></p><div class="dialog-actions"><button class="button secondary" value="cancel" formnovalidate>Annuler</button><button id="uml-save" class="button primary" value="save">Insérer sur la feuille</button></div></form></dialog>`;
}

export function mountUmlUi({ getPage, isLocked, onSave, onCreate, beforeOpen = ()=>true }) {
  let state = null;
  const $ = id => document.getElementById(id);
  const show = (id, visible) => { $(id).hidden = !visible; $(id).querySelectorAll('input,textarea,select').forEach(el=>{el.disabled=!visible;}); };
  const members = value => value.split('\n').map(line=>line.trim()).filter(Boolean);
  function syncLocked() { document.querySelectorAll('[data-uml-node],[data-uml-relation]').forEach(button=>{button.disabled=isLocked();}); }
  $('shape-library').onclick=event=>{const node=event.target.closest('[data-uml-node]'),rel=event.target.closest('[data-uml-relation]');if(!node&&!rel)return;if(!isLocked()&&beforeOpen())onCreate(node?.dataset.umlNode||rel.dataset.umlRelation,Boolean(rel));};
  function nodeOptions(filter = ()=>true) {
    return getPage().elements.filter(e=>isUmlNode(e)&&filter(e)).map(e=>({id:e.id,name:readUmlNode(e).name||NODE_LABELS[e.umlKind]?.[0]||'Élément'}));
  }
  function choices(select, items, selected, fallback='') {
    select.innerHTML='<option value="">Placement libre</option>'+items.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
    select.value=items.some(e=>e.id===selected)?selected:fallback;
  }
  function relationFields(kind, values = {}) {
    $('uml-source').disabled=false;
    const sequence=kind.startsWith('message-');
    const targets=kind.startsWith('erd-')?getPage().elements.filter(e=>['Entité BDD','Association BDD'].includes(e.label)||['weak-entity','identifying-relationship'].includes(e.umlKind)).map(e=>({id:e.id,name:e.children.find(c=>['box-title','entity-name','association-name','uml-name'].includes(c.role))?.text||'Entité'})):nodeOptions(e=>sequence?e.umlKind==='participant':['include','extend','exclude'].includes(kind)?e.umlKind==='usecase':kind==='object-link'?e.umlKind==='object':!['system','fragment','activation','destruction','note'].includes(e.umlKind));
    choices($('uml-source'),targets,values.sourceId,targets[kind==='message-return'?1:0]?.id||'');
    choices($('uml-target'),targets,values.targetId,kind==='message-return'||kind==='message-self'?targets[0]?.id||'':targets[1]?.id||'');
    if(!values.sourceId&&!values.targetId&&targets.length<2&&kind!=='message-self'){$('uml-source').value='';$('uml-target').value='';}
    if(kind==='message-found'){$('uml-source').value='';$('uml-source').disabled=true;$('uml-target').value=values.targetId||targets[0]?.id||'';}
    if(kind==='message-lost'){$('uml-target').value='';$('uml-source').value=values.sourceId||targets[0]?.id||'';}
    show('uml-multiplicities',['association','directed-association','aggregation','composition'].includes(kind));
    show('uml-offset-field',sequence);
    $('uml-target').disabled=['message-self','message-lost'].includes(kind);
    if(kind==='message-self')$('uml-target').value=$('uml-source').value;
    $('uml-form-hint').textContent=RELATION_LABELS[kind][1]+(['aggregation','composition'].includes(kind)?'. Le départ représente le tout, l’arrivée la partie.':sequence?'. Choisissez les participants puis la position verticale du message.':'. La pointe de flèche est du côté de l’arrivée.');
  }
  function open(kind, existing, relation = false) {
    if(isLocked()||!beforeOpen())return;
    state={kind,existing,relation};
    const lastMessage=Math.max(90,...getPage().elements.filter(e=>e.relationKind?.startsWith('message-')).map(e=>e.offset??160));
    const values=relation?readUmlRelation(existing):readUmlNode(existing);
    if(!relation)kind=state.kind=values.kind;
    $('uml-error').hidden=true;
    $('uml-dialog-title').textContent=`Configurer : ${(relation?RELATION_LABELS[kind]:NODE_LABELS[kind])[0]}`;
    $('uml-save').textContent='Enregistrer les modifications';
    $('uml-name-label').textContent=relation?'Libellé de la relation (facultatif)':kind==='object'?"Nom de l’instance":'Nom';
    $('uml-name-input').value=values.name||''; $('uml-name-input').required=!relation&&!['activation','destruction'].includes(kind);
    $('uml-stereotype-input').value=values.stereotype||''; $('uml-class-input').value=values.className||'Classe';
    $('uml-attributes-input').value=(values.attributes||[]).join('\n'); $('uml-operations-input').value=(values.operations||[]).join('\n');
    $('uml-condition-input').value=values.condition||''; $('uml-fragment-kind').value=values.fragmentKind||'alt';
    $('uml-width-input').value=values.width||500; $('uml-height-input').value=values.height||240;
    $('uml-offset').value=existing?.offset??values.offset??Math.min(800,Math.max(160,lastMessage+(kind==='destruction'?100:0)));
    $('uml-left').value=values.left||''; $('uml-right').value=values.right||'';
    const classLike=['class','abstract-class','interface'].includes(kind);
    show('uml-kind-field',relation); show('uml-stereotype-field',!relation&&classLike); show('uml-class-field',!relation&&kind==='object');
    show('uml-attributes-field',!relation&&(classLike||['object','note'].includes(kind))); show('uml-operations-field',!relation&&classLike);
    $('uml-attributes-label').textContent=kind==='object'?"Valeurs — attribut = valeur, une par ligne":kind==='note'?'Contenu de la note — une ligne par idée':'Attributs — une ligne par attribut';
    $('uml-attributes-input').placeholder=kind==='object'?'id = 1\nnom = "Nom"':kind==='note'?'Votre commentaire':'- id : int\n- nom : String';
    show('uml-fragment-fields',!relation&&kind==='fragment'); show('uml-width-field',!relation&&['system','fragment'].includes(kind));
    show('uml-height-field',!relation&&['system','participant','activation','fragment'].includes(kind));
    $('uml-height-label').textContent=kind==='participant'?'Hauteur de la ligne de vie':kind==='activation'?'Durée visuelle de l’activation':'Hauteur';
    show('uml-endpoints',relation); show('uml-anchor-field',!relation&&['activation','destruction'].includes(kind));
    show('uml-multiplicities',false);show('uml-offset-field',!relation&&['activation','destruction'].includes(kind));
    $('uml-form-hint').textContent=relation?RELATION_LABELS[kind][1]:NODE_LABELS[kind][1]+'. Les textes restent éditables directement sur la feuille.';
    if(relation){$('uml-relation-kind').value=kind;relationFields(kind,values);}
    else if(['activation','destruction'].includes(kind))choices($('uml-anchor'),nodeOptions(e=>e.umlKind==='participant'),existing?.sourceId,nodeOptions(e=>e.umlKind==='participant')[0]?.id||'');
    $('uml-dialog').showModal();
  }
  $('uml-relation-kind').onchange=()=>{state.kind=$('uml-relation-kind').value;relationFields(state.kind,{sourceId:$('uml-source').value,targetId:$('uml-target').value});};
  $('uml-source').onchange=()=>{if(state?.kind==='message-self')$('uml-target').value=$('uml-source').value;};
  $('uml-form').onsubmit=event=>{
    if(event.submitter?.value!=='save')return;event.preventDefault();if(isLocked()||!state)return;
    try {
      const {kind,existing,relation}=state;
      let element;
      if(relation){
        const sourceId=$('uml-source').value||null,targetId=kind==='message-self'?sourceId:$('uml-target').value||null;
        if(!['message-found','message-lost'].includes(kind)&&Boolean(sourceId)!==Boolean(targetId))throw new Error('Choisissez les deux extrémités, ou laissez les deux en placement libre.');
        if(sourceId===targetId&&sourceId&&kind!=='message-self')throw new Error('Choisissez deux éléments distincts. Utilisez Auto-message pour un appel à soi-même.');
        const values={kind,name:$('uml-name-input').value,left:$('uml-left').disabled?'':$('uml-left').value,right:$('uml-right').disabled?'':$('uml-right').value,sourceId,targetId,offset:Number($('uml-offset').value)};
        element=updateUmlRelation(existing,values);
      }else{
        const values={name:$('uml-name-input').value,stereotype:$('uml-stereotype-input').value,className:$('uml-class-input').value,attributes:members($('uml-attributes-input').value),operations:members($('uml-operations-input').value),condition:$('uml-condition-input').value,fragmentKind:$('uml-fragment-kind').value};
        if(!$('uml-width-input').disabled)values.width=Number($('uml-width-input').value);if(!$('uml-height-input').disabled)values.height=Number($('uml-height-input').value);
        element=updateUmlNode(existing,values);
        if(['activation','destruction'].includes(kind)&&$('uml-anchor').value){element.sourceId=$('uml-anchor').value;element.offset=Number($('uml-offset').value);}
      }
      onSave(element,existing);$('uml-dialog').close('save');state=null;
    }catch(error){$('uml-error').textContent=error.message;$('uml-error').hidden=false;}
  };
  $('uml-dialog').addEventListener('close',()=>{state=null;});
  syncLocked();
  return {syncLocked,edit(group){if(isUmlRelation(group))open(readUmlRelation(group).kind,group,true);else if(isUmlNode(group))open(readUmlNode(group).kind,group);}};
}

function relationPreview(kind) {
  if(kind.startsWith('erd-')){
    const many=kind.endsWith('many'),optional=kind.includes('zero'),both=kind==='erd-many-many';
    const source=both?'<path d="m3 5 12 7-12 7"/>':'<path d="M8 5v14"/>';
    const target=many?'<path d="m45 5-12 7 12 7"/>':'<path d="M40 5v14"/>';
    return `<svg viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 12h42"/>${source}${target}${optional?'<circle cx="27" cy="12" r="4" fill="white"/>':''}</svg>`;
  }
  if(kind==='message-self')return '<svg viewBox="0 0 48 24" aria-hidden="true"><path d="M8 4h26v16H8m6-5-6 5 6 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const extra={
    'message-found':'<circle cx="5" cy="12" r="3" fill="currentColor"/>',
    'message-lost':'<circle cx="42" cy="12" r="3" fill="currentColor"/>',
    'message-delete':'<path d="m36 6 10 12m0-12L36 18" stroke="currentColor" stroke-width="1.5"/>',
    'message-create':'<path d="M22 2v6m-3-3h6" stroke="currentColor" stroke-width="1.2"/>',
    'message-timed':'<circle cx="22" cy="5" r="4" fill="white" stroke="currentColor"/><path d="M22 2v3h2" fill="none" stroke="currentColor"/>',
    'message-balking':'<path d="M31 7v10" stroke="currentColor" stroke-width="1.5"/>',
    'message-timeout':'<path d="M19 1h7l-7 7h7z" fill="none" stroke="currentColor"/>',
    exclude:'<path d="m21 4 6 5m0-5-6 5" stroke="currentColor"/>',
  }[kind]||'';
  const dashed=['realization','dependency','include','extend','exclude','message-return','message-create','message-timeout'].includes(kind);
  const triangle=['generalization','realization','message-sync','transition','flow'].includes(kind);
  const diamond=['aggregation','composition'].includes(kind);
  return `<svg viewBox="0 0 48 24" aria-hidden="true"><path d="M4 12H42" fill="none" stroke="currentColor" stroke-width="1.5"${dashed?' stroke-dasharray="4 3"':''}/>${extra}${diamond?`<path d="m4 12 8-5 8 5-8 5z" stroke="currentColor" fill="${kind==='composition'?'currentColor':'white'}"/>`:triangle?`<path d="m42 12-10-6v12z" stroke="currentColor" fill="${['message-sync','transition','flow'].includes(kind)?'currentColor':'white'}"/>`:['association','object-link','message-lost','message-delete'].includes(kind)?'':'<path d="m34 6 8 6-8 6" fill="none" stroke="currentColor" stroke-width="1.5"/>'}</svg>`;
}
