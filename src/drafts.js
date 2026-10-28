import { CODE_LANGUAGES } from './code-languages.js';
import { TEXT_SIZE } from './geometry.js';
export const DRAFT_KEY='captif-draft-v1';
const styles=['bold','italic','underline'];
export function makeDraft(doc,pageId,field,{text,format={},language,fontSize=field.fontSize}){
  const parent=doc.pages.find(p=>p.id===pageId)?.elements.find(e=>e.children?.some(c=>c.id===field.id));
  return {documentId:doc.id,pageId,elementId:field.id,baseText:field.text,baseFontSize:field.fontSize,baseFormat:Object.fromEntries(styles.map(k=>[k,Boolean(field[k])])),baseLanguage:parent?.codeLanguage,text,format:Object.fromEntries(styles.map(k=>[k,Boolean(format[k])])),language,fontSize};
}
export function recoverDraft(doc,value){
  if(value==null)return null;
  if(typeof value!=='object'||typeof value.text!=='string'||value.text.length>10000||typeof value.baseText!=='string'||!value.format||styles.some(k=>typeof value.format[k]!=='boolean')||!Number.isFinite(value.fontSize)||value.fontSize<8||value.fontSize>TEXT_SIZE.max||value.language!==undefined&&!Object.hasOwn(CODE_LANGUAGES,value.language))throw new Error('Le brouillon local est illisible ; il a été conservé.');
  if(value.documentId!==doc.id)return null;
  const page=doc.pages.find(p=>p.id===value.pageId),field=page?.elements.flatMap(e=>[e,...(e.children||[])]).find(e=>e.id===value.elementId&&e.type==='text');
  const parent=page?.elements.find(e=>e.children?.some(c=>c.id===field?.id));
  if(!field||field.text!==value.baseText||field.fontSize!==value.baseFontSize||styles.some(k=>Boolean(field[k])!==value.baseFormat?.[k])||parent?.codeLanguage!==value.baseLanguage)return null;
  if(!field.role&&value.fontSize<TEXT_SIZE.min)throw new Error('Taille de texte du brouillon invalide.');
  if(parent?.codeLanguage!==undefined&&!Object.hasOwn(CODE_LANGUAGES,value.language))throw new Error('Langage du brouillon invalide.');
  return {documentId:doc.id,pageId:page.id,elementId:field.id,baseText:field.text,baseLanguage:parent?.codeLanguage,text:value.text,format:Object.fromEntries(styles.map(k=>[k,value.format[k]])),language:value.language,fontSize:field.role?field.fontSize:value.fontSize};
}
export function loadDraft(doc){return recoverDraft(doc,JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'));}
export function saveDraft(draft){localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));}
export function clearDraft(){localStorage.removeItem(DRAFT_KEY);}
