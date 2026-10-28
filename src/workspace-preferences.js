const KEY='captif-workspace-v1';
const clean=value=>Object.fromEntries(['pages','library','grid'].filter(k=>typeof value?.[k]==='boolean').map(k=>[k,value[k]]));
export function readPreferences(storage){try{return clean(JSON.parse((storage??globalThis.localStorage).getItem(KEY)||'{}'));}catch{return {};}}
export function writePreferences(value,storage){try{(storage??globalThis.localStorage).setItem(KEY,JSON.stringify(clean(value)));}catch{ /* Visual preferences must never block the document. */ }}
export const TOOL_KEYS=Object.freeze({v:'select',p:'pen',t:'text',r:'rect',o:'ellipse',l:'line',a:'arrow'});
export function toolShortcut(event,editing=false){const key=String(event.key).toLowerCase();return editing||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||!Object.hasOwn(TOOL_KEYS,key)?null:TOOL_KEYS[key];}
