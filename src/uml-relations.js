import { W, H, elementBounds, translateElement } from './geometry.js';

export const UML_RELATION_KINDS = ['association','directed-association','aggregation','composition','generalization','realization','dependency','object-link','include','extend','exclude','transition','flow','message-simple','message-sync','message-async','message-return','message-self','message-timed','message-found','message-lost','message-create','message-delete','message-balking','message-timeout','erd-one-one','erd-one-many','erd-zero-one','erd-zero-many','erd-many-many'];
const uid = () => crypto.randomUUID();
const ink = '#334155';
const dashed = new Set(['realization','dependency','include','extend','exclude','message-return','message-create','message-timeout']);
const sequence = kind => kind.startsWith('message-');
const value = (text, limit = 60) => {
  text = String(text ?? '').trim();
  if (text.length > limit || /[\r\n]/.test(text)) throw new Error(`Libellé UML limité à ${limit} caractères sur une ligne.`);
  return text;
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const child = (type, role, props) => ({id:uid(),type,role,stroke:ink,strokeWidth:1.4,...props});
const label = (role, x, y, text) => child('text',role,{x,y,text,fontSize:13});
const line = (x,y,x2,y2,dash) => child('line','uml-relation-line',{x,y,x2,y2,...(dash ? {dash} : {})});

function checkedKind(kind) {
  if (!UML_RELATION_KINDS.includes(kind)) throw new Error('Type de relation UML inconnu.');
  return kind;
}
function checkedOffset(offset) {
  if (!Number.isFinite(offset) || offset < 80 || offset > 800) throw new Error('La hauteur du message doit être comprise entre 80 et 800.');
  return offset;
}

function decoration(kind,p,q) {
  const length = Math.hypot(q.x-p.x,q.y-p.y) || 1;
  const ux=(q.x-p.x)/length,uy=(q.y-p.y)/length,nx=-uy,ny=ux;
  const at=(origin,along,across)=>({x:clamp(origin.x+ux*along+nx*across,16,W-16),y:clamp(origin.y+uy*along+ny*across,20,H-20)});
  if (kind==='aggregation'||kind==='composition') return child('pen','uml-marker',{...p,fill:kind==='aggregation'?'#ffffff':ink,points:[p,at(p,12,7),at(p,24,0),at(p,12,-7),p]});
  if (['generalization','realization','message-sync','transition','flow'].includes(kind)) return child('pen','uml-marker',{...q,fill:['message-sync','transition','flow'].includes(kind)?ink:'#ffffff',points:[q,at(q,-16,7),at(q,-16,-7),q]});
  if (['directed-association','dependency','include','extend','exclude','message-simple','message-async','message-return','message-self','message-timed','message-found','message-create','message-balking','message-timeout'].includes(kind)) return child('pen','uml-marker',{...q,fill:'none',points:[at(q,-12,6),q,at(q,-12,-6)]});
  return null;
}

/** Optional message notation; graphical conventions, never a timing engine. */
function messageSymbols(kind,p,q) {
  const length=Math.hypot(q.x-p.x,q.y-p.y)||1,ux=(q.x-p.x)/length,uy=(q.y-p.y)/length;
  const at=(along,across=0)=>({x:clamp(p.x+ux*along-uy*across,16,W-16),y:clamp(p.y+uy*along+ux*across,20,H-20)});
  const pen=points=>child('pen','uml-marker',{...points[0],points,fill:'none'});
  const circle=(point,size,fill)=>child('ellipse','uml-marker',{x:point.x-size/2,y:point.y-size/2,width:size,height:size,fill});
  if(kind==='message-found')return [circle(p,10,ink)];
  if(kind==='message-lost')return [circle(q,10,ink)];
  if(kind==='message-delete')return [pen([at(length-8,-8),at(length+8,8)]),pen([at(length-8,8),at(length+8,-8)])];
  if(kind==='message-timed'){
    const c=at(Math.min(length/2,48),-18);
    return [circle(c,14,'#ffffff'),pen([{x:c.x,y:c.y-4},c,{x:c.x+4,y:c.y}])];
  }
  if(kind==='message-balking')return [pen([at(length-23,-7),at(length-23,7)])];
  if(kind==='message-timeout'){
    const along=Math.min(length/2,48);
    return [pen([at(along-6,-24),at(along+6,-24),at(along-6,-10),at(along+6,-10),at(along-6,-24)])];
  }
  return [];
}

/** ERD endpoint marks, with explicit ownership for the orthogonal route adapter. */
function erdSymbols(kind,p,q) {
  const variants={
    'erd-one-one':['one','one'], 'erd-one-many':['one','many'],
    'erd-zero-one':['one','zero-one'], 'erd-zero-many':['one','zero-many'],
    'erd-many-many':['many','many'],
  };
  if(!variants[kind])return [];
  const endpoint=(notation,origin,towards,rowId)=>{
    const length=Math.hypot(towards.x-origin.x,towards.y-origin.y)||1;
    const ux=(towards.x-origin.x)/length,uy=(towards.y-origin.y)/length;
    const at=(distance,across=0)=>({x:clamp(origin.x+ux*distance-uy*across,16,W-16),y:clamp(origin.y+uy*distance+ux*across,20,H-20)});
    const pen=points=>child('pen','uml-marker',{...points[0],points,rowId,fill:'none'});
    const bar=distance=>pen([at(distance,-7),at(distance,7)]);
    const circle=distance=>{const center=at(distance);return child('ellipse','uml-marker',{x:center.x-4,y:center.y-4,width:8,height:8,rowId,fill:'#ffffff'});};
    const fork=()=>pen([at(0,-7),at(12),at(0,7),at(12),at(0)]);
    if(notation==='one')return [bar(8),bar(15)];
    if(notation==='zero-one')return [bar(8),circle(21)];
    return [fork(),notation==='zero-many'?circle(23):bar(22)];
  };
  const [source,target]=variants[kind];
  return [...endpoint(source,p,q,'source'),...endpoint(target,q,p,'target')];
}

function geometry(kind,name,left,right,p,q,self=false,dashOverride) {
  const dash=dashOverride==='solid'?undefined:dashOverride||(dashed.has(kind)?'6 5':undefined);
  const lines=self ? [line(p.x,p.y,q.x,p.y,dash),line(q.x,p.y,q.x,q.y,dash),line(q.x,q.y,p.x,q.y,dash)] : [line(p.x,p.y,q.x,q.y,dash)];
  const finalPoint=self?{x:p.x,y:q.y}:q;
  const marker=decoration(kind,self?{x:q.x,y:q.y}:p,finalPoint);
  const stereotype=['include','extend','exclude'].includes(kind)?`«${kind}»`:'';
  const text=stereotype ? `${stereotype}${name ? ` ${name}`:''}` : name;
  const vertical=!self&&Math.abs(q.y-p.y)>Math.abs(q.x-p.x);
  const nameX=clamp(vertical?(p.x+q.x)/2+(left||right?70:18):(p.x+q.x)/2-text.length*4,24,Math.max(24,W-30-text.length*8));
  const nameY=clamp(vertical?(p.y+q.y)/2+4:Math.min(p.y,q.y)-12,38,H-30);
  return [...lines,...(marker?[marker]:[]),...messageSymbols(kind,p,finalPoint),...erdSymbols(kind,p,finalPoint),label('uml-relation-name',nameX,nameY,text),
    label('uml-source-label',clamp(vertical?p.x-left.length*8-12:p.x+(q.x>=p.x?10:-left.length*8-10),24,W-60),clamp(vertical?p.y+(q.y>=p.y?18:-8):p.y+23,38,H-25),left),
    label('uml-target-label',clamp(vertical?finalPoint.x+12:finalPoint.x-(q.x>=p.x?right.length*8+10:-10),24,W-60),clamp(vertical?finalPoint.y+(q.y>=p.y?-6:18):finalPoint.y+23,38,H-25),right)];
}

function withBounds(group,children) {
  const bounds=children.map(elementBounds);
  const x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y));
  return {...group,x,y,width:Math.max(...bounds.map(b=>b.x+b.width))-x,height:Math.max(...bounds.map(b=>b.y+b.height))-y,children};
}

function preserve(group,children) {
  const counters=new Map();
  return children.map(entry=>{
    const index=counters.get(entry.role)||0;counters.set(entry.role,index+1);
    const old=group.children?.filter(c=>c.role===entry.role)[index];
    return {...entry,...(old?{id:old.id,stroke:old.stroke,strokeWidth:old.strokeWidth}:{})};
  });
}

export function createUmlRelation({kind='association',name='',left='',right='',sourceId=null,targetId=null,x=100,y=450,offset=160}={}) {
  kind=checkedKind(kind);name=value(name);left=value(left,30);right=value(right,30);offset=checkedOffset(offset);
  x=clamp(x,28,W-330);y=clamp(y,60,H-140);
  const children=geometry(kind,name,left,right,{x,y:y+42},{x:x+(kind==='message-self'?64:280),y:y+(kind==='message-self'?88:42)},kind==='message-self');
  return withBounds({id:uid(),type:'group',label:'Relation UML',umlKind:'relation',relationKind:kind,offset,stroke:ink,strokeWidth:1.4,
    ...(sourceId?{sourceId:String(sourceId)}:{}),...(targetId?{targetId:String(targetId)}:{})},children);
}

export function isUmlRelation(group) { return group?.type==='group'&&group.umlKind==='relation'&&group.label==='Relation UML'; }
export function readUmlRelation(group) {
  const text=role=>group.children?.find(c=>c.role===role)?.text||'';
  return {kind:group.relationKind||'association',name:text('uml-relation-name').replace(/^«(?:include|extend|exclude)»\s*/,''),left:text('uml-source-label'),right:text('uml-target-label'),sourceId:group.sourceId||null,targetId:group.targetId||null,offset:group.offset??160};
}
export function updateUmlRelation(group,patch) {
  const next=createUmlRelation({...readUmlRelation(group),...patch,x:group.x,y:group.y-29});
  const dx=group.x-next.x,dy=group.y-next.y;
  const children=next.children.map(c=>{
    const entry={...c,x:c.x+dx,y:c.y+dy};
    if(c.x2!==undefined){entry.x2=c.x2+dx;entry.y2=c.y2+dy;}
    if(c.points)entry.points=c.points.map(p=>({x:p.x+dx,y:p.y+dy}));
    return entry;
  });
  return withBounds({...next,id:group.id,stroke:group.stroke,strokeWidth:group.strokeWidth,...(group.dash?{dash:group.dash}:{})},preserve(group,children));
}

function anchor(node,towards) {
  const b=elementBounds(node),cx=b.x+b.width/2,cy=b.y+b.height/2,dx=towards.x-cx,dy=towards.y-cy;
  if(node.umlKind==='actor')return Math.abs(dy)>Math.abs(dx)?{x:cx,y:node.y+(dy>0?112:5)}:{x:cx+(dx>=0?29:-29),y:node.y+49};
  const k=node.umlKind==='usecase' ? 1/Math.sqrt((dx/(b.width/2))**2+(dy/(b.height/2))**2) : Math.min(dx?b.width/2/Math.abs(dx):Infinity,dy?b.height/2/Math.abs(dy):Infinity);
  return Number.isFinite(k)?{x:cx+dx*k,y:cy+dy*k}:{x:cx,y:cy};
}

/** Derive attachment points for display and print without mutating saved work. */
export function resolveUmlRelations(page) {
  let elements=page.elements.map(group=>{
    if(!['activation','destruction'].includes(group.umlKind)||!group.sourceId)return group;
    const participant=page.elements.find(e=>e.id===group.sourceId&&e.umlKind==='participant');
    if(!participant)return group;
    const maxY=Math.min(H-24-group.height,participant.y+participant.height-group.height);
    const y=clamp(participant.y+44+(group.offset??160),participant.y+50,Math.max(participant.y+50,maxY));
    const x=clamp(participant.x+participant.width/2-group.width/2,24,W-24-group.width);
    return translateElement(group,x-group.x,y-group.y);
  });
  elements=elements.map(group=>{
    if(group.umlKind!=='participant')return group;
    const ends=elements.filter(e=>e.umlKind==='destruction'&&e.sourceId===group.id).map(e=>e.y+24);
    if(!ends.length)return group;
    return {...group,children:group.children.map(child=>child.type==='line'&&child.dash?{...child,y2:Math.min(child.y2,...ends)}:child)};
  });
  return {...page,elements:elements.map(group=>{
    if(!isUmlRelation(group))return group;
    const {kind,name,left,right,offset}=readUmlRelation(group);
    const oneFound=kind==='message-found'&&!group.sourceId&&group.targetId;
    const oneLost=kind==='message-lost'&&group.sourceId&&!group.targetId;
    if(oneFound||oneLost){
      const participant=elements.find(e=>e.id===(oneFound?group.targetId:group.sourceId)&&e.umlKind==='participant');
      if(!participant)return group;
      const y=clamp(participant.y+44+offset,participant.y+70,Math.min(H-90,participant.y+participant.height-30));
      const known={x:participant.x+participant.width/2,y};
      const direction=oneFound?(known.x-100>=24?-1:1):(known.x+100<=W-24?1:-1);
      const unknown={x:known.x+direction*100,y};
      const p=oneFound?unknown:known,q=oneFound?known:unknown;
      return withBounds(group,preserve(group,geometry(kind,name,left,right,p,q,false,group.dash)));
    }
    if(!group.sourceId||!group.targetId)return group;
    const source=elements.find(e=>e.id===group.sourceId&&e.type==='group'&&!isUmlRelation(e));
    const target=elements.find(e=>e.id===group.targetId&&e.type==='group'&&!isUmlRelation(e));
    if(!source||!target)return group;
    const a=elementBounds(source),b=elementBounds(target);
    let p,q,self=false;
    if(sequence(kind)) {
      const y=clamp(Math.max(source.y,target.y)+44+offset,Math.max(source.y,target.y)+70,Math.min(H-90,a.y+a.height-30,b.y+b.height-30));
      p={x:source.x+source.width/2,y};q={x:target.x+target.width/2,y};
      if(kind==='message-self') {self=true;const direction=p.x+64<W-24?1:-1;q={x:p.x+64*direction,y:Math.min(H-45,y+46)};}
    } else {
      if(source.id===target.id)return group;
      p=anchor(source,{x:b.x+b.width/2,y:b.y+b.height/2});q=anchor(target,{x:a.x+a.width/2,y:a.y+a.height/2});
    }
    return withBounds(group,preserve(group,geometry(kind,name,left,right,p,q,self,group.dash)));
  })};
}
