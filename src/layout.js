import { W,H,elementBounds,translateElement } from './geometry.js';

const MARGIN=24,TOP=36,GAP=28;
const MODES=new Set(['left','center-x','right','top','center-y','bottom','distribute-x','distribute-y']);
const relation=e=>['Relation BDD','Relation UML'].includes(e.label);
export const isLayoutBox=e=>['rect','ellipse','text','group'].includes(e?.type)&&!e.sourceId&&!e.targetId&&!relation(e)&&!['fragment','activation','destruction'].includes(e.umlKind);
const boundsOf=elements=>{
  const bounds=elements.map(elementBounds),x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y));
  return {x,y,width:Math.max(...bounds.map(b=>b.x+b.width))-x,height:Math.max(...bounds.map(b=>b.y+b.height))-y};
};
const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width&&a.y+a.height<=b.y+b.height;
const overlaps=(a,b)=>a.x<b.x+b.width-1e-6&&a.x+a.width>b.x+1e-6&&a.y<b.y+b.height-1e-6&&a.y+a.height>b.y+1e-6;
const pageRegion={x:MARGIN,y:TOP,width:W-MARGIN*2,height:H-MARGIN-TOP};
const noSpace=()=>new Error('La feuille manque de place pour réorganiser ces boîtes sans les réduire. Répartissez le diagramme sur plusieurs feuilles.');

/** Align selected boxes; attached links and marks remain governed by their refs. */
export function alignElements(elements,mode){
  if(!Array.isArray(elements)||!MODES.has(mode))throw new Error('Commande d’alignement inconnue.');
  const copy=structuredClone(elements),items=copy.filter(isLayoutBox).map(e=>({element:e,bounds:elementBounds(e)}));
  if(mode.startsWith('distribute-')&&items.length<3)throw new Error('Sélectionnez au moins trois boîtes pour répartir leurs espacements.');
  if(items.length<2)return copy;
  const envelope=boundsOf(items.map(e=>e.element)),positions=new Map();
  if(mode.startsWith('distribute-')){
    const axis=mode==='distribute-x'?'x':'y',size=axis==='x'?'width':'height';
    const sorted=items.slice().sort((a,b)=>a.bounds[axis]-b.bounds[axis]);
    const first=sorted[0].bounds[axis],end=sorted.at(-1).bounds[axis]+sorted.at(-1).bounds[size];
    const gap=(end-first-sorted.reduce((sum,e)=>sum+e.bounds[size],0))/(sorted.length-1);
    if(gap<0)throw new Error('Écartez les boîtes avant de répartir leurs espacements : la sélection est trop serrée.');
    let cursor=first;
    for(const item of sorted){positions.set(item.element.id,{dx:axis==='x'?cursor-item.bounds.x:0,dy:axis==='y'?cursor-item.bounds.y:0});cursor+=item.bounds[size]+gap;}
  }else{
    for(const {element,bounds:b} of items){
      let dx=0,dy=0;
      if(mode==='left')dx=envelope.x-b.x;
      if(mode==='center-x')dx=envelope.x+envelope.width/2-b.x-b.width/2;
      if(mode==='right')dx=envelope.x+envelope.width-b.x-b.width;
      if(mode==='top')dy=envelope.y-b.y;
      if(mode==='center-y')dy=envelope.y+envelope.height/2-b.y-b.height/2;
      if(mode==='bottom')dy=envelope.y+envelope.height-b.y-b.height;
      positions.set(element.id,{dx,dy});
    }
  }
  const result=copy.map(e=>{const move=positions.get(e.id);return move?translateElement(e,move.dx,move.dy):e;});
  if(result.filter(isLayoutBox).some(e=>!inside(elementBounds(e),{x:MARGIN,y:MARGIN,width:W-MARGIN*2,height:H-MARGIN*2})))throw new Error('Cet alignement ferait dépasser une boîte ou son texte de la feuille. Déplacez la sélection ou agrandissez sa zone de texte.');
  return result;
}

function rowPack(items,region,layers=false){
  const positions=new Map();let x=region.x,y=region.y,rowHeight=0,lastRank=null;
  for(const item of items){
    const b=item.bounds;
    if(b.width>region.width+1e-6||b.height>region.height+1e-6)return null;
    const newLayer=layers&&lastRank!==null&&lastRank!==item.rank;
    if(newLayer||x+b.width>region.x+region.width+1e-6){x=region.x;y+=rowHeight+(newLayer?48:GAP);rowHeight=0;}
    if(y+b.height>region.y+region.height+1e-6)return null;
    positions.set(item.id,{x,y});x+=b.width+GAP;rowHeight=Math.max(rowHeight,b.height);lastRank=item.rank;
  }
  return positions;
}

function rectanglePack(items,region){
  let free=[{x:region.x,y:region.y,width:region.width+GAP,height:region.height+GAP}];const positions=new Map();
  for(const item of items){
    const width=item.bounds.width+GAP,height=item.bounds.height+GAP;
    const candidates=free.filter(r=>r.width+1e-6>=width&&r.height+1e-6>=height).sort((a,b)=>a.y-b.y||a.x-b.x||Math.min(a.width-width,a.height-height)-Math.min(b.width-width,b.height-height));
    if(!candidates.length)return null;
    const chosen=candidates[0],used={x:chosen.x,y:chosen.y,width,height};positions.set(item.id,{x:used.x,y:used.y});
    const next=[];
    for(const r of free){
      if(!overlaps(r,used)){next.push(r);continue;}
      if(used.x>r.x)next.push({...r,width:used.x-r.x});
      if(used.x+used.width<r.x+r.width)next.push({...r,x:used.x+used.width,width:r.x+r.width-used.x-used.width});
      if(used.y>r.y)next.push({...r,height:used.y-r.y});
      if(used.y+used.height<r.y+r.height)next.push({...r,y:used.y+used.height,height:r.y+r.height-used.y-used.height});
    }
    free=next.filter((r,i)=>r.width>0&&r.height>0&&!next.some((other,j)=>i!==j&&inside(r,other)&&(r.width<other.width||r.height<other.height||j<i)));
  }
  return positions;
}

function pack(items,region,{layers=false}={}){
  if(!items.length)return new Map();
  const ordered=items.slice().sort((a,b)=>(a.rank||0)-(b.rank||0)||a.index-b.index);
  let result=rowPack(ordered,region,layers)||rowPack(ordered,region);
  if(result)return result;
  const strategies=[ordered,ordered.slice().sort((a,b)=>b.bounds.width*b.bounds.height-a.bounds.width*a.bounds.height||a.index-b.index),ordered.slice().sort((a,b)=>b.bounds.height-a.bounds.height||a.index-b.index),ordered.slice().sort((a,b)=>b.bounds.width-a.bounds.width||a.index-b.index)];
  for(const strategy of strategies){result=rectanglePack(strategy,region);if(result)return result;}
  return null;
}

function atom(id,members,index){return {id,members,index,bounds:boundsOf(members),rank:0};}
function makeAtoms(elements){
  const consumed=new Set(),atoms=[],boxes=elements.filter(isLayoutBox);
  // A system and its contents move as a unit. Pack the contents inside its fixed
  // boundary first, rather than moving its use cases into the outer page grid.
  const systems=boxes.filter(e=>e.umlKind==='system').sort((a,b)=>a.width*a.height-b.width*b.height);
  for(const system of systems){
    const frame=elementBounds(system),content=boxes.filter(e=>e.id!==system.id&&!consumed.has(e.id)&&e.umlKind!=='system'&&e.umlKind!=='participant'&&inside(elementBounds(e),frame));
    const inner={x:frame.x+20,y:frame.y+56,width:frame.width-40,height:frame.height-76};
    const parts=content.map((e,i)=>atom(e.id,[e],i));
    const positions=pack(parts,inner);
    if(!positions)throw new Error('La frontière du système manque de place. Agrandissez-la ou répartissez ses cas d’utilisation avant de réorganiser.');
    const moved=content.map(e=>{const b=elementBounds(e),p=positions.get(e.id);return translateElement(e,p.x-b.x,p.y-b.y);});
    for(const e of [system,...content])consumed.add(e.id);
    atoms.push(atom(system.id,[system,...moved],elements.indexOf(system)));
  }
  const participants=boxes.filter(e=>e.umlKind==='participant'&&!consumed.has(e.id)).sort((a,b)=>a.x-b.x||elements.indexOf(a)-elements.indexOf(b));
  if(participants.length){
    const old=boundsOf(participants),moved=[];let x=0;
    for(const e of participants){const b=elementBounds(e);moved.push(translateElement(e,x-b.x,-b.y));x+=b.width+GAP;consumed.add(e.id);}
    const width=x-GAP;
    if(width>pageRegion.width)throw new Error('Les participants ne tiennent pas sur une même ligne de vie. Réduisez leur largeur ou répartissez la séquence sur plusieurs feuilles.');
    const fragments=elements.filter(e=>e.umlKind==='fragment'&&!e.sourceId&&!e.targetId);
    for(const e of fragments){
      const b=elementBounds(e),nx=Math.max(0,Math.min(Math.max(0,width-b.width),b.x-old.x)),ny=Math.max(64,b.y-old.y);
      moved.push(translateElement(e,nx-b.x,ny-b.y));consumed.add(e.id);
    }
    atoms.push(atom(participants[0].id,moved,Math.min(...participants.map(e=>elements.indexOf(e)))));
  }
  for(const e of boxes)if(!consumed.has(e.id)&&e.umlKind!=='system'){atoms.push(atom(e.id,[e],elements.indexOf(e)));consumed.add(e.id);}
  return atoms;
}

function rankAtoms(atoms,elements){
  const owners=new Map(atoms.flatMap(a=>a.members.map(e=>[e.id,a.id]))),edges=new Map(atoms.map(a=>[a.id,new Set()]));
  for(const e of elements){const source=owners.get(e.sourceId),target=owners.get(e.targetId);if(source&&target&&source!==target)edges.get(source).add(target);}
  // Condense strongly connected components so cyclic associations never stall
  // topological ranking and their member boxes are still laid out separately.
  let nextIndex=0;const visited=new Map(),low=new Map(),stack=[],onStack=new Set(),components=[];
  function visit(id){
    visited.set(id,nextIndex);low.set(id,nextIndex++);stack.push(id);onStack.add(id);
    for(const target of edges.get(id)){if(!visited.has(target)){visit(target);low.set(id,Math.min(low.get(id),low.get(target)));}else if(onStack.has(target))low.set(id,Math.min(low.get(id),visited.get(target)));}
    if(low.get(id)===visited.get(id)){const component=[];let at;do{at=stack.pop();onStack.delete(at);component.push(at);}while(at!==id);components.push(component);}
  }
  for(const a of atoms)if(!visited.has(a.id))visit(a.id);
  const componentOf=new Map(components.flatMap((ids,i)=>ids.map(id=>[id,i]))),links=components.map(()=>new Set()),indegree=components.map(()=>0),ranks=components.map(()=>0);
  for(const [id,targets] of edges)for(const target of targets){const from=componentOf.get(id),to=componentOf.get(target);if(from!==to&&!links[from].has(to)){links[from].add(to);indegree[to]++;}}
  const queue=components.map((_,i)=>i).filter(i=>!indegree[i]);
  for(let i=0;i<queue.length;i++){const from=queue[i];for(const to of links[from]){ranks[to]=Math.max(ranks[to],ranks[from]+1);if(--indegree[to]===0)queue.push(to);}}
  for(const a of atoms)a.rank=ranks[componentOf.get(a.id)];
  return [...edges.values()].some(targets=>targets.size);
}

/** Reorganize the page without resizing boxes or mutating any saved element. */
export function autoLayout(elements){
  if(!Array.isArray(elements))throw new Error('Diagramme invalide.');
  const copy=structuredClone(elements),atoms=makeAtoms(copy);
  if(!atoms.length)return copy;
  const connected=rankAtoms(atoms,copy),positions=pack(atoms,pageRegion,{layers:connected});
  if(!positions)throw noSpace();
  const replacements=new Map(),placed=[];
  for(const a of atoms){
    const p=positions.get(a.id),members=a.members.map(e=>translateElement(e,p.x-a.bounds.x,p.y-a.bounds.y));
    for(const e of members)replacements.set(e.id,e);
    const b=boundsOf(members);if(!inside(b,{x:MARGIN,y:MARGIN,width:W-MARGIN*2,height:H-MARGIN*2}))throw noSpace();placed.push(b);
  }
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)if(overlaps(placed[i],placed[j]))throw noSpace();
  return copy.map(e=>replacements.get(e.id)||e);
}
