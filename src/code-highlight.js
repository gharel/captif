import { boundedMemo } from './performance.js';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import php from 'highlight.js/lib/languages/php';
import java from 'highlight.js/lib/languages/java';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import { CODE_LANGUAGES } from './code-languages.js';
for(const [key,grammar] of Object.entries({sql,javascript,typescript,css,xml,php,java,markdown,python,json,bash}))hljs.registerLanguage(key,grammar);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function computeHighlight(text,language){
  if(!Object.hasOwn(CODE_LANGUAGES,language))throw new Error('Langage de code inconnu.');
  return language==='plaintext'?esc(text):hljs.highlight(text,{language:language==='html'?'xml':language,ignoreIllegals:true}).value;
}
const cachedHtml=boundedMemo(key=>{const [text,language]=JSON.parse(key);return computeHighlight(text,language);},32);
export const highlightHtml=(text,language)=>cachedHtml(JSON.stringify([text,language]));
const colors={keyword:'#7c3aed',literal:'#7c3aed',built_in:'#be185d',type:'#be185d',number:'#b45309',string:'#0e7490',regexp:'#0e7490',comment:'#64748b',quote:'#64748b',title:'#2563eb',section:'#7c3aed',name:'#be185d',tag:'#475569',attr:'#b45309',attribute:'#b45309',variable:'#be185d',symbol:'#0e7490',meta:'#64748b',bullet:'#7c3aed'};
const decode=value=>value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,(_,key)=>key[0]==='#'?String.fromCodePoint(parseInt(key.slice(key[1]?.toLowerCase()==='x'?2:1),key[1]?.toLowerCase()==='x'?16:10)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[key]);
function computeLines(text,language,columns=80){
  const html=highlightHtml(String(text).replace(/\r\n?/g,'\n').replace(/\t/g,'    '),language),stack=['#334155'],lines=[[]];
  let count=0;const limit=Math.max(1,Math.floor(columns));
  for(const part of html.match(/<span\b[^>]*>|<\/span>|[^<]+/g)||[]){
    if(part==='</span>'){if(stack.length>1)stack.pop();continue;}
    if(part.startsWith('<span')){const types=(part.match(/class="([^"]*)"/)?.[1]||'').split(/\s+/).map(c=>c.replace(/^hljs-/,''));stack.push(types.map(c=>colors[c]).find(Boolean)||stack.at(-1));continue;}
    for(const char of decode(part)){
      if(char==='\n'){lines.push([]);count=0;continue;}
      if(count>=limit){lines.push([]);count=0;}
      const line=lines.at(-1),color=stack.at(-1),last=line.at(-1);
      if(last?.color===color)last.text+=char;else line.push({text:char,color});count++;
    }
  }
  return lines;
}
const cachedLines=boundedMemo(key=>{const [text,language,columns]=JSON.parse(key);return Object.freeze(computeLines(text,language,columns).map(line=>Object.freeze(line.map(Object.freeze))));},32);
export const highlightLines=(text,language,columns=80)=>cachedLines(JSON.stringify([text,language,columns]));
export function codeSvg(field,language){
  const size=field.fontSize||13,columns=Math.max(1,Math.floor((field.width||360)/(size*.62)));
  return `<text x="${field.x}" y="${field.y}" font-size="${size}" font-family="ui-monospace,Consolas,monospace" xml:space="preserve">${highlightLines(field.text,language,columns).map((line,i)=>`<tspan x="${field.x}" dy="${i?size*1.5:0}">${line.map(t=>`<tspan fill="${t.color}">${esc(t.text)}</tspan>`).join('')||' '}</tspan>`).join('')}</text>`;
}
