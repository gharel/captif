import { W, H, elementBounds } from './geometry.js';
import { DEFAULT_STROKE,DEFAULT_TEXT } from './stroke.js';

export const isEntityBox = group => group?.label==='Entité BDD' && group.children?.some(c=>c.role==='box-body');
export const readEntityBox = group => ({ title:group.children.find(c=>c.role==='box-title')?.text||'',body:group.children.find(c=>c.role==='box-body')?.text||'' });

/** A paper-like card: no column schema or supplied notation. */
export function createEntityBox() {
  const x=70,y=100,width=260,height=150;
  const child=(type,role,props)=>({id:crypto.randomUUID(),type,role,stroke:type==='text'?DEFAULT_TEXT:DEFAULT_STROKE,strokeWidth:1,...props});
  return {id:crypto.randomUUID(),type:'group',label:'Entité BDD',x,y,width,height,stroke:DEFAULT_STROKE,strokeWidth:1,children:[
    child('rect','frame',{x,y,width,height,fill:'#ffffff'}),
    child('rect','header',{x,y,width,height:34,fill:'#fff6d5'}),
    child('line','separator',{x,y:y+34,x2:x+width,y2:y+34}),
    child('text','box-title',{x:x+14,y:y+24,width:width-28,text:'',fontSize:15,bold:true}),
    child('text','box-body',{x:x+14,y:y+57,width:width-28,height:96,text:'',fontSize:13}),
  ]};
}

/** Reflow edited text without discarding identity, formatting or a resized frame. */
export function updateEntityBox(group) {
  const title=group.children.find(c=>c.role==='box-title'),body=group.children.find(c=>c.role==='box-body');
  const width=Math.max(80,group.width),textWidth=width-28;
  const nextTitle={...title,x:group.x+14,y:group.y+title.fontSize+9,width:textWidth};
  const headerHeight=Math.max(34,elementBounds(nextTitle).height+14);
  const nextBody={...body,x:group.x+14,y:group.y+headerHeight+body.fontSize+10,width:textWidth};
  nextBody.height=Math.max(60,elementBounds({...nextBody,height:undefined}).height);
  const height=Math.max(group.height,headerHeight+nextBody.height+26);
  if(group.x+width>W-16||group.y+height>H-16)throw new Error('Cette boîte dépasse la feuille. Raccourcissez le texte ou déplacez la boîte.');
  return {...group,width,height,children:group.children.map(c=>{
    if(c.role==='box-title')return nextTitle;
    if(c.role==='box-body')return {...nextBody,height:height-headerHeight-20};
    if(c.role==='frame')return {...c,x:group.x,y:group.y,width,height};
    if(c.role==='header')return {...c,x:group.x,y:group.y,width,height:headerHeight};
    if(c.role==='separator')return {...c,x:group.x,y:group.y+headerHeight,x2:group.x+width,y2:group.y+headerHeight};
    return c;
  })};
}
