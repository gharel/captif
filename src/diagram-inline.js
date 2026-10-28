import { createEntity,createAssociation,createRelation,readEntity,readAssociation,updateEntity,updateAssociation } from './bdd.js';
import { createUmlNode,readUmlNode,updateUmlNode,isUmlNode } from './uml-nodes.js';
import { createUmlRelation } from './uml-relations.js';

const blankAttribute=()=>({name:'',type:'',key:'',nullable:false});
export const isDiagram=e=>e?.type==='group'&&['Entité BDD','Association BDD','Relation BDD','Classe UML','Élément UML','Relation UML'].includes(e.label);
export const editableDiagramText=e=>e?.type==='text'&&Boolean(e.role)&&!['column-label','empty-label'].includes(e.role);
export function diagramPlaceholder(e){return ({'entity-name':'Nom de l’entité','association-name':'Nom de l’association','attribute-name':'attribut','attribute-type':'type','attribute-key':'—','uml-name':'Nom','uml-attributes':'Ajouter des attributs','uml-operations':'Ajouter des méthodes','uml-condition':'[condition]','relation-name':'Relation','uml-relation-name':'Libellé','uml-source-label':'Rôle / multiplicité','uml-target-label':'Rôle / multiplicité'})[e.role]||'';}
export function emptyBdd(kind,elements=[],preferred=[]){
  if(kind==='entity')return createEntity({name:'',attributes:[blankAttribute()]});
  if(kind==='association')return createAssociation({name:'',attributes:[]});
  const nodes=elements.filter(e=>['Entité BDD','Association BDD'].includes(e.label));
  const chosen=nodes.filter(e=>preferred.includes(e.id));const ends=chosen.length>=2?chosen:nodes;
  return createRelation({name:'',...(ends.length>=2?{sourceId:ends[0].id,targetId:ends[1].id}:{})});
}
export function emptyUml(kind,{relation=false,elements=[],preferred=[]}={}){
  const participants=elements.filter(e=>e.umlKind==='participant');
  const offset=Math.min(800,Math.max(90,...elements.filter(e=>e.relationKind?.startsWith('message-')).map(e=>e.offset||160))+70);
  if(relation){
    if(['message-found','message-lost'].includes(kind)){
      const participant=participants.find(e=>preferred.includes(e.id))||participants[0];
      return createUmlRelation({kind,name:'',left:'',right:'',offset,...(participant?{[kind==='message-found'?'targetId':'sourceId']:participant.id}:{})});
    }
    const sequence=kind.startsWith('message-');
    const nodes=elements.filter(e=>isUmlNode(e)&&(sequence?e.umlKind==='participant':kind==='object-link'?e.umlKind==='object':['include','extend','exclude'].includes(kind)?e.umlKind==='usecase':!['system','fragment','activation','destruction','note'].includes(e.umlKind)));
    const picked=nodes.filter(e=>preferred.includes(e.id)),ends=picked.length>=2?picked:nodes;
    const attached=kind==='message-self'?ends.length>0:ends.length>=2;
    const reverse=kind==='message-return';
    return createUmlRelation({kind,name:'',left:'',right:'',offset,...(attached?{sourceId:ends[reverse?1:0].id,targetId:ends[kind==='message-self'?0:reverse?0:1].id}:{})});
  }
  const node=createUmlNode(kind,{name:'',className:'',stereotype:'',attributes:[],operations:[],condition:''});
  if(['activation','destruction'].includes(kind)&&participants.length){node.sourceId=(participants.find(e=>preferred.includes(e.id))||participants[0]).id;node.offset=offset;}
  return node;
}
export function diagramActions(group,selected){
  const actions=[];
  if(['Entité BDD','Association BDD'].includes(group?.label)){
    actions.push({action:'add-attribute',label:'＋ Attribut'});
    if(group.children.some(c=>c.id===selected&&c.rowId))actions.push({action:'remove-row',label:'− Ligne'});
  }else if(isUmlNode(group)&&['class','abstract-class','interface','object','state','note'].includes(group.umlKind)){
    actions.push({action:'add-attribute',label:group.umlKind==='note'?'＋ Ligne':'＋ Attribut'});
    if(['class','abstract-class','interface'].includes(group.umlKind))actions.push({action:'add-operation',label:'＋ Méthode'});
  }
  return actions;
}
export function editDiagramRows(group,action,rowId){
  if(['Entité BDD','Association BDD'].includes(group.label)){
    const entity=group.label==='Entité BDD',values=entity?readEntity(group):readAssociation(group);
    const rows=group.children.filter(c=>c.role==='attribute-name');
    const attributes=action==='remove-row'?values.attributes.filter((_,i)=>rows[i].rowId!==rowId):[...values.attributes,blankAttribute()];
    return (entity?updateEntity:updateAssociation)(group,{...values,attributes});
  }
  const values=readUmlNode(group),key=action==='add-operation'?'operations':'attributes';
  return updateUmlNode(group,{[key]:[...values[key],'']});
}
export function diagramChoices(text,parent){
  if(text.role==='attribute-key')return [['','Aucune'],['PK','PK'],['FK','FK'],['PK,FK','PK,FK']];
  if(text.role==='attribute-nullable')return [['NN','Non nullable'],['NULL','Nullable']];
  if(['cardinality-left','cardinality-right'].includes(text.role))return ['0,1','1,1','0,N','1,N'].map(value=>[value,value]);
  if(text.role==='uml-stereotype'&&parent?.umlKind==='fragment')return ['alt','opt','loop','par'].map(value=>[value,value]);
  return null;
}
