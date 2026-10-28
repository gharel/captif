import { W,H,elementBounds } from './geometry.js';
import { DEFAULT_STROKE } from './stroke.js';
import { CODE_LANGUAGES } from './code-languages.js';
export { CODE_LANGUAGES } from './code-languages.js';
export const isCodeBlock=group=>group?.type==='group'&&group.label==='Bloc de code';
export const codeText=group=>group.children.find(c=>c.role==='code-content')?.text||'';
export function createCodeBlock({text='',language='plaintext'}={}){
  const x=70,y=100,width=420,height=180;
  const child=(type,role,props)=>({id:crypto.randomUUID(),type,role,stroke:DEFAULT_STROKE,strokeWidth:1,...props});
  const group={id:crypto.randomUUID(),type:'group',label:'Bloc de code',codeLanguage:language,x,y,width,height,stroke:DEFAULT_STROKE,strokeWidth:1,children:[
    child('rect','frame',{x,y,width,height,fill:'#f8faff'}),
    child('rect','code-header',{x,y,width,height:36,fill:'#1e293b'}),
    ...['#fb7185','#fbbf24','#34d399'].map((fill,i)=>child('ellipse','code-decoration',{x:x+14+i*15,y:y+14,width:7,height:7,fill,stroke:fill})),
    child('text','code-language',{x:x+width-110,y:y+23,text:'',fontSize:12,stroke:'#e2e8f0'}),
    child('text','code-content',{x:x+20,y:y+62,width:width-40,height:100,text,fontSize:13,stroke:'#334155'}),
  ]};
  return updateCodeBlock(group,{text,language});
}
export function updateCodeBlock(group,{text=codeText(group),language=group.codeLanguage}={}){
  if(!Object.hasOwn(CODE_LANGUAGES,language)||typeof text!=='string'||text.length>10000)throw new Error('Bloc de code invalide.');
  const old=group.children.find(c=>c.role==='code-content'),width=Math.max(160,group.width);
  const content={...old,x:group.x+20,y:group.y+62,width:width-40,text};
  content.height=elementBounds({...content,height:undefined}).height;
  const height=Math.max(group.height,content.height+76);
  if(group.x+width>W-16||group.y+height>H-16)throw new Error('Ce bloc de code dépasse la feuille. Répartissez-le sur plusieurs blocs.');
  return {...group,width,height,codeLanguage:language,children:group.children.map(c=>c.role==='frame'?{...c,x:group.x,y:group.y,width,height}:c.role==='code-header'?{...c,x:group.x,y:group.y,width}:c.role==='code-content'?{...content,height:height-76}:c.role==='code-language'?{...c,x:group.x+width-110,y:group.y+23,text:CODE_LANGUAGES[language]}:c)};
}
