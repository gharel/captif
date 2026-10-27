import { W,H,elementBounds } from './geometry.js';
import { isConnector,anchorsFor,resolveConnectors,canAttach } from './connectors.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const semantic=e=>e?.type==='group'&&['Relation BDD','Relation UML'].includes(e.label)&&!e.relationKind?.startsWith('message-');
const lineRole=e=>e.label==='Relation BDD'?'relation-line':'uml-relation-line';
const copy=p=>({x:p.x,y:p.y});

function linePoints(group){
  const points=[];
  for(const child of group.children||[]){
    if(child.role!==lineRole(group))continue;
    const route=child.type==='pen'?child.points:child.x2!==undefined?[{x:child.x,y:child.y},{x:child.x2,y:child.y2}]:[];
    for(const p of route||[])if(!points.length||p.x!==points.at(-1).x||p.y!==points.at(-1).y)points.push(copy(p));
  }
  return points.length>=2?points:null;
}

/** Virtual generic connector used by shared endpoint and bend editing tools. */
export function editableConnector(element){
  if(isConnector(element))return element;
  if(!semantic(element))return null;
  const route=linePoints(element);if(!route)return null;
  const line=element.children.find(c=>c.role===lineRole(element));
  const rounded=p=>({x:Number(p.x.toFixed(3)),y:Number(p.y.toFixed(3))});
  const start=!element.sourceId&&element.startPoint?rounded(element.startPoint):route[0];
  const end=!element.targetId&&element.endPoint?rounded(element.endPoint):route.at(-1);
  route[0]=copy(start);route[route.length-1]=copy(end);
  return {id:element.id,type:'line',routing:'orthogonal',x:start.x,y:start.y,x2:end.x,y2:end.y,stroke:line.stroke||element.stroke,strokeWidth:line.strokeWidth||element.strokeWidth||1,
    ...(line.dash||element.dash?{dash:element.dash||line.dash}:{}),
    ...(element.sourceId?{sourceId:element.sourceId}:{}),...(element.targetId?{targetId:element.targetId}:{}),
    ...(element.sourceAnchor?{sourceAnchor:element.sourceAnchor}:{}),...(element.targetAnchor?{targetAnchor:element.targetAnchor}:{}),
    ...(element.waypoints?{waypoints:element.waypoints.map(copy)}:{}),route};
}

function inferAnchor(shape,p,explicit){
  const ports=anchorsFor(shape);if(!ports.length)return undefined;
  if(explicit&&ports.some(port=>port.side===explicit))return explicit;
  return ports.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0].side;
}
const unit=(a,b)=>{const length=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/length,y:(b.y-a.y)/length};};
const textWidth=label=>Math.max(1,String(label.text||'').length)*(label.fontSize||13)*.62;

function clearLabel(label,candidates,obstacles,placed){
  const width=textWidth(label),fit=position=>({...label,x:clamp(position.x,24,Math.max(24,W-36-width)),y:clamp(position.y,32,H-28)});
  const options=candidates.map(fit),ideal=options[0];
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width+3)-Math.max(a.x,b.x-3))*Math.max(0,Math.min(a.y+a.height,b.y+b.height+3)-Math.max(a.y,b.y-3));
  const score=option=>{
    const bounds=elementBounds(option);
    return [...obstacles,...placed].reduce((sum,b)=>sum+overlap(bounds,b)*1000,0)+Math.abs(option.x-ideal.x)+Math.abs(option.y-ideal.y);
  };
  options.sort((a,b)=>score(a)-score(b));return options[0]||label;
}
function labelAtPort(label,origin,direction,atEnd=false,length=64,obstacles=[],placed=[]){
  const available=Math.min(32,length/2),width=textWidth(label),size=label.fontSize||13;
  const normal={x:-direction.y,y:direction.x};
  const candidates=[];
  for(const across of [20,36,56,80,-20,-36,-56,-80]){
    const sign=atEnd?-1:1,offset=(atEnd?-1:1)*available;
    candidates.push({x:origin.x+direction.x*offset+normal.x*across*sign-width/2,y:origin.y+direction.y*offset+normal.y*across*sign+size*.35});
  }
  if(obstacles.length){
    const top=Math.min(...obstacles.map(b=>b.y)),bottom=Math.max(...obstacles.map(b=>b.y+b.height));
    candidates.push({x:origin.x-width/2,y:top-12},{x:origin.x-width/2,y:bottom+size+12});
  }
  return clearLabel(label,candidates,obstacles,placed);
}
function labelAtRoute(label,route,obstacles=[],placed=[]){
  const width=textWidth(label),segments=route.slice(1).map((p,i)=>({a:route[i],b:p,length:Math.hypot(p.x-route[i].x,p.y-route[i].y),horizontal:p.y===route[i].y}));
  segments.sort((a,b)=>(b.length+(b.horizontal&&b.length>width+20?100:0))-(a.length+(a.horizontal&&a.length>width+20?100:0)));
  const span=segments[0];if(!span)return label;
  const candidates=[];
  for(const segment of segments.slice(0,4)){
    const center={x:(segment.a.x+segment.b.x)/2,y:(segment.a.y+segment.b.y)/2};
    for(const offset of [-9,28,-32,50,-56,76])candidates.push(segment.horizontal?{x:center.x-width/2,y:center.y+offset}:{x:center.x+(offset<0?-width-12:12),y:center.y+offset});
  }
  if(obstacles.length){
    const center=(span.a.x+span.b.x)/2,top=Math.min(...obstacles.map(b=>b.y)),bottom=Math.max(...obstacles.map(b=>b.y+b.height));
    candidates.push({x:center-width/2,y:top-12},{x:center-width/2,y:bottom+(label.fontSize||13)+12});
  }
  return clearLabel(label,candidates,obstacles,placed);
}
function turnMarker(marker,group,oldRoute,newRoute){
  if(marker.type!=='pen'||!marker.points?.length)return marker;
  const source=['aggregation','composition'].includes(group.relationKind);
  const oldOrigin=source?oldRoute[0]:oldRoute.at(-1),newOrigin=source?newRoute[0]:newRoute.at(-1);
  const oldDirection=source?unit(oldRoute[0],oldRoute[1]):unit(oldRoute.at(-2),oldRoute.at(-1));
  const newDirection=source?unit(newRoute[0],newRoute[1]):unit(newRoute.at(-2),newRoute.at(-1));
  const transform=p=>{
    const dx=p.x-oldOrigin.x,dy=p.y-oldOrigin.y;
    const along=dx*oldDirection.x+dy*oldDirection.y,across=-dx*oldDirection.y+dy*oldDirection.x;
    return {x:newOrigin.x+newDirection.x*along-newDirection.y*across,y:newOrigin.y+newDirection.y*along+newDirection.x*across};
  };
  return {...marker,...newOrigin,points:marker.points.map(transform)};
}
function groupWithRoute(group,routed,obstacles){
  const oldRoute=linePoints(group),route=routed.route;if(!oldRoute||!route?.length)return group;
  const role=lineRole(group),base=group.children.find(c=>c.role===role),{x2,y2,points,...line}=base;
  const polyline={...line,type:'pen',x:route[0].x,y:route[0].y,fill:'none',points:route.map(copy)};
  const startDirection=unit(route[0],route[1]||route[0]),endDirection=unit(route.at(-2)||route[0],route.at(-1));
  const positions=new Map(),placed=[];
  for(const roles of [['cardinality-left','uml-source-label'],['cardinality-right','uml-target-label'],['relation-name','uml-relation-name']]){
    for(const label of group.children.filter(c=>roles.includes(c.role))){
      const atEnd=roles.includes('cardinality-right'),atName=roles.includes('relation-name');
      const segment=atEnd?[route.at(-2)||route[0],route.at(-1)]:[route[0],route[1]||route[0]];
      const position=atName?labelAtRoute(label,route,obstacles,placed):labelAtPort(label,atEnd?route.at(-1):route[0],atEnd?endDirection:startDirection,atEnd,Math.hypot(segment[1].x-segment[0].x,segment[1].y-segment[0].y),obstacles,placed);
      positions.set(label.id,position);if(label.text?.trim())placed.push(elementBounds(position));
    }
  }
  let lineAdded=false;
  const children=group.children.flatMap(child=>{
    if(child.role===role){if(lineAdded)return [];lineAdded=true;return [polyline];}
    if(positions.has(child.id))return [positions.get(child.id)];
    if(child.role==='uml-marker')return [turnMarker(child,group,oldRoute,route)];
    return [child];
  });
  const bounds=children.map(elementBounds),x=Math.min(...bounds.map(b=>b.x)),y=Math.min(...bounds.map(b=>b.y));
  return {...group,x,y,width:Math.max(...bounds.map(b=>b.x+b.width))-x,height:Math.max(...bounds.map(b=>b.y+b.height))-y,children};
}

/** Run after the BDD/UML notation resolvers; derived paths stay in children only. */
export function resolveDiagramConnections(page){
  const groups=page.elements.filter(semantic);if(!groups.length)return page;
  const byId=new Map(page.elements.map(e=>[e.id,e])),virtuals=new Map();
  for(const group of groups){
    const virtual=editableConnector(group);if(!virtual)continue;
    virtual.sourceAnchor=inferAnchor(byId.get(virtual.sourceId),{x:virtual.x,y:virtual.y},group.sourceAnchor);
    virtual.targetAnchor=inferAnchor(byId.get(virtual.targetId),{x:virtual.x2,y:virtual.y2},group.targetAnchor);
    const oldRoute=linePoints(group);
    if(!group.waypoints?.length&&!group.sourceAnchor&&!group.targetAnchor&&group.label==='Relation BDD'&&oldRoute?.length===4&&oldRoute[0].x===oldRoute[1].x&&oldRoute[2].x===oldRoute[3].x&&oldRoute[1].y===oldRoute[2].y){
      // The BDD resolver already made space for labels on a compact U link.
      // Preserve that useful corridor for this render without persisting pins.
      virtual.waypoints=oldRoute.slice(1,-1).map(copy);
    }
    // The 24-unit source diamond needs a longer outgoing stub than a plain line.
    if(['aggregation','composition'].includes(group.relationKind))virtual.strokeWidth=Math.max(24,virtual.strokeWidth);
    virtuals.set(group.id,virtual);
  }
  const temporary={...page,elements:page.elements.map(e=>virtuals.get(e.id)||e)},resolved=resolveConnectors(temporary),routes=new Map(resolved.elements.filter(e=>virtuals.has(e.id)).map(e=>[e.id,e]));
  const obstacles=page.elements.filter(canAttach).map(elementBounds);
  return {...page,elements:page.elements.map(group=>routes.has(group.id)?groupWithRoute(group,routes.get(group.id),obstacles):group)};
}
