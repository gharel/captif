export const DEFAULT_FAMILY='data';
export const DIAGRAM_GROUPS=Object.freeze([
  {id:'annotations',label:'Annotations',icon:'note',nodes:['note','code-block'],relations:[]},
  {id:'data',label:'MCD · MLD',icon:'entity',nodes:['entity','bdd-association'],relations:['bdd-relation','erd-one-one','erd-one-many','erd-zero-one','erd-zero-many','erd-many-many']},
  {id:'classes',label:'Classes',icon:'class',nodes:['class'],relations:['association','directed-association','aggregation','composition','generalization','realization','dependency']},
  {id:'objects',label:'Objets',icon:'object',nodes:['object'],relations:['object-link','dependency']},
  {id:'usecases',label:'Cas d’utilisation',icon:'usecase',nodes:['actor','usecase','system'],relations:['association','include','extend','exclude','generalization']},
  {id:'sequence',label:'Séquence',icon:'participant',nodes:['participant','activation','fragment','destruction'],relations:['message-simple','message-sync','message-async','message-return','message-self','message-timed','message-found','message-lost','message-create','message-delete','message-balking','message-timeout']},
  {id:'states',label:'États-transitions',icon:'state',nodes:['state','initial','final','decision','history','deep-history','entry-point','exit-point','terminate','junction'],relations:['transition']},
  {id:'activity',label:'Activités',icon:'action',nodes:['action','initial','final','flow-final','decision','fork','join','swimlane','send-signal','receive-signal','time-event','data-object'],relations:['flow']},
  {id:'components',label:'Composants · Déploiement',icon:'component',nodes:['package','component','artifact','deployment-node','port','provided-interface','required-interface','database'],relations:['dependency','realization','association']},
  {id:'process',label:'Processus',icon:'process',nodes:['process','subprocess','input-output','document','manual-input','preparation'],relations:['flow']},
].map(group=>Object.freeze({...group,nodes:Object.freeze(group.nodes),relations:Object.freeze(group.relations)})));
