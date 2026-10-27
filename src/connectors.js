import { W,H,elementBounds } from './geometry.js';

const round=n=>Number(n.toFixed(3));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const vectors={n:{x:0,y:-1},e:{x:1,y:0},s:{x:0,y:1},w:{x:-1,y:0}};
const point=p=>({x:round(p.x),y:round(p.y)});
export const isConnector=e=>['line','arrow'].includes(e?.type)&&e.routing==='orthogonal';
export function connectorData(element){
  if(isConnector(element)){const {route,routeBlocked,...data}=element;return data;}
  return element.children?{...element,children:element.children.map(connectorData)}:element;
}
export const canAttach=e=>['rect','ellipse','text','group'].includes(e?.type)&&!e.sourceId&&!e.targetId&&!['Relation BDD','Relation UML'].includes(e.label)&&!['system','fragment','activation','destruction'].includes(e.umlKind);

export function anchorsFor(shape){
  if(!canAttach(shape))return [];
  const b=elementBounds(shape);
  return [{side:'n',x:b.x+b.width/2,y:b.y},{side:'e',x:b.x+b.width,y:b.y+b.height/2},{side:'s',x:b.x+b.width/2,y:b.y+b.height},{side:'w',x:b.x,y:b.y+b.height/2}].map(p=>({shapeId:shape.id,...p,...point(p)}));
}
export function findAnchor(elements,p,tolerance=16,exclude=null){
  let best=null,distance=tolerance;
  for(const shape of elements)for(const anchor of anchorsFor(shape)){
    if(exclude?.shapeId===anchor.shapeId&&exclude.side===anchor.side)continue;
    const next=Math.hypot(p.x-anchor.x,p.y-anchor.y);
    if(next<=distance){best=anchor;distance=next;}
  }
  return best;
}
export function attachEndpoint(connector,end,p,anchor){
  const next={...connector,routing:'orthogonal'};
  delete next.route;delete next.routeBlocked;
  const start=end==='start',ref=start?'sourceId':'targetId',side=start?'sourceAnchor':'targetAnchor';
  delete next[ref];delete next[side];
  if(anchor){next[ref]=anchor.shapeId;next[side]=anchor.side;}
  const at=anchor||p;
  if(start){next.x=at.x;next.y=at.y;}else{next.x2=at.x;next.y2=at.y;}
  return next;
}

const connectorRoute=connector=>connector.route?.length>=2?connector.route:[{x:connector.x,y:connector.y},{x:connector.x2,y:connector.y2}];
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const isPortStub=(connector,route,index)=>route.length>2&&((index===0&&connector.sourceId)||(index===route.length-2&&connector.targetId))&&distance(route[index],route[index+1])<=40;

/** Segment indices refer to the current resolved route, not the saved waypoints. */
export function bendHandles(connector){
  if(!isConnector(connector))return [];
  const route=connectorRoute(connector),handles=[];
  for(let i=0;i<route.length-1;i++){
    const a=route[i],b=route[i+1];
    if(distance(a,b)<12||isPortStub(connector,route,i))continue;
    if(a.x!==b.x&&a.y!==b.y)continue;
    handles.push({index:i,x:(a.x+b.x)/2,y:(a.y+b.y)/2,axis:a.y===b.y?'y':'x'});
  }
  return handles;
}

/** Move a corridor while leaving both attached/free endpoint coordinates intact. */
export function moveBend(connector,index,pointer){
  if(!isConnector(connector)||!Number.isFinite(pointer?.x)||!Number.isFinite(pointer?.y))throw new Error('Position du coude invalide.');
  const route=connectorRoute(connector).map(point);
  if(!Number.isInteger(index)||index<0||index>=route.length-1)throw new Error('Segment de connexion inconnu.');
  const a=route[index],b=route[index+1],horizontal=a.y===b.y;
  if(!horizontal&&a.x!==b.x)throw new Error('Le segment doit être horizontal ou vertical.');
  const coordinate=round(clamp(horizontal?pointer.y:pointer.x,12,horizontal?H-12:W-12));
  let first={...a},last={...b};
  // A single straight span (or long endpoint span) needs two inner points so
  // dragging its midpoint creates a genuine dogleg instead of moving a port.
  if(index===0){first={x:round(a.x+(b.x-a.x)/3),y:round(a.y+(b.y-a.y)/3)};}
  if(index===route.length-2){last={x:round(a.x+(b.x-a.x)*2/3),y:round(a.y+(b.y-a.y)*2/3)};}
  if(horizontal){first.y=coordinate;last.y=coordinate;}else{first.x=coordinate;last.x=coordinate;}
  const before=route.slice(1,index+1),after=route.slice(index+1,-1);
  if(before.length&&index!==0)before.pop();
  if(after.length&&index!==route.length-2)after.shift();
  // Untouched endpoint stubs are flexible; only user-positioned corridors stay fixed.
  if(index>1&&isPortStub(connector,route,0))before.shift();
  if(index<route.length-3&&isPortStub(connector,route,route.length-2))after.pop();
  const waypoints=simplify([...before,first,last,...after]).map(p=>point({x:clamp(p.x,12,W-12),y:clamp(p.y,12,H-12)}));
  if(waypoints.length>32)throw new Error('Cette connexion possède trop de coudes manuels. Réinitialisez son parcours automatique.');
  return connectorData({...connector,waypoints});
}

/** True only when a horizontal/vertical segment enters the rectangle interior. */
export function segmentHitsBox(a,b,box){
  const right=box.x+box.width,bottom=box.y+box.height;
  if(a.y===b.y)return a.y>box.y+1e-6&&a.y<bottom-1e-6&&Math.max(a.x,b.x)>box.x+1e-6&&Math.min(a.x,b.x)<right-1e-6;
  if(a.x===b.x)return a.x>box.x+1e-6&&a.x<right-1e-6&&Math.max(a.y,b.y)>box.y+1e-6&&Math.min(a.y,b.y)<bottom-1e-6;
  return true;
}
const inside=(p,b)=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height;
function simplify(points){
  const result=[];
  for(const p of points){
    if(result.length&&p.x===result.at(-1).x&&p.y===result.at(-1).y)continue;
    if(result.length>1){const a=result.at(-2),b=result.at(-1);if((a.x===b.x&&b.x===p.x)||(a.y===b.y&&b.y===p.y))result.pop();}
    result.push(p);
  }
  return result;
}
function occupiedCost(a,b,routes){
  let cost=0;
  for(const route of routes)for(let i=1;i<route.length;i++){
    const p=route[i-1],q=route[i],horizontal=a.y===b.y,otherHorizontal=p.y===q.y;
    if(horizontal===otherHorizontal){
      const same=horizontal?a.y===p.y:a.x===p.x;
      if(!same)continue;
      const overlap=horizontal?Math.min(Math.max(a.x,b.x),Math.max(p.x,q.x))-Math.max(Math.min(a.x,b.x),Math.min(p.x,q.x)):Math.min(Math.max(a.y,b.y),Math.max(p.y,q.y))-Math.max(Math.min(a.y,b.y),Math.min(p.y,q.y));
      if(overlap>0)cost+=600+overlap*8;
    }else{
      const h=horizontal?[a,b]:[p,q],v=horizontal?[p,q]:[a,b];
      if(v[0].x>Math.min(h[0].x,h[1].x)&&v[0].x<Math.max(h[0].x,h[1].x)&&h[0].y>Math.min(v[0].y,v[1].y)&&h[0].y<Math.max(v[0].y,v[1].y))cost+=80;
    }
  }
  return cost;
}

class Queue{
  items=[];
  push(value){const a=this.items;a.push(value);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].priority<=value.priority)break;a[i]=a[p];i=p;}a[i]=value;}
  pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].priority<a[child].priority)child++;if(a[child].priority>=last.priority)break;a[i]=a[child];i=child;}a[i]=last;}return first;}
}

function search(start,end,obstacles,routes){
  // Candidate coordinates come from nearby obstacle edges; every edge is still
  // checked against all obstacles, including those omitted from this grid.
  const nearby=obstacles.slice().sort((a,b)=>Math.min(Math.abs(a.x-start.x)+Math.abs(a.y-start.y),Math.abs(a.x-end.x)+Math.abs(a.y-end.y))-Math.min(Math.abs(b.x-start.x)+Math.abs(b.y-start.y),Math.abs(b.x-end.x)+Math.abs(b.y-end.y))).slice(0,40);
  const xSet=new Set([12,W-12,start.x,end.x]),ySet=new Set([12,H-12,start.y,end.y]);
  const add=(set,n,max)=>set.add(round(clamp(n,12,max-12)));
  for(const b of nearby){add(xSet,b.x,W);add(xSet,b.x+b.width,W);add(ySet,b.y,H);add(ySet,b.y+b.height,H);}
  for(const route of routes.slice(-6))for(const p of route.slice(0,8))for(const offset of [-14,14]){add(xSet,p.x+offset,W);add(ySet,p.y+offset,H);}
  const xs=[...xSet].sort((a,b)=>a-b),ys=[...ySet].sort((a,b)=>a-b),nx=xs.length;
  const source=ys.indexOf(start.y)*nx+xs.indexOf(start.x),target=ys.indexOf(end.y)*nx+xs.indexOf(end.x);
  const rows=ys.map(y=>obstacles.filter(b=>y>b.y+1e-6&&y<b.y+b.height-1e-6));
  const columns=xs.map(x=>obstacles.filter(b=>x>b.x+1e-6&&x<b.x+b.width-1e-6));
  const costs=new Float64Array(nx*ys.length*3).fill(Infinity),parents=new Int32Array(costs.length).fill(-1),queue=new Queue();
  const initial=source*3;costs[initial]=0;queue.push({state:initial,cost:0,priority:Math.abs(start.x-end.x)+Math.abs(start.y-end.y)});
  while(queue.items.length){
    const current=queue.pop(),state=current.state;if(current.cost!==costs[state])continue;
    const cell=Math.floor(state/3),dir=state%3,ix=cell%nx,iy=Math.floor(cell/nx),p={x:xs[ix],y:ys[iy]};
    if(cell===target){const path=[];for(let at=state;at>=0;at=parents[at]){const c=Math.floor(at/3);path.push({x:xs[c%nx],y:ys[Math.floor(c/nx)]});}return path.reverse();}
    for(const [dx,dy,orientation] of [[-1,0,1],[1,0,1],[0,-1,2],[0,1,2]]){
      const x=ix+dx,y=iy+dy;if(x<0||x>=nx||y<0||y>=ys.length)continue;
      const q={x:xs[x],y:ys[y]},blocks=orientation===1?rows[iy]:columns[ix];
      if(blocks.some(b=>segmentHitsBox(p,q,b)))continue;
      const next=(y*nx+x)*3+orientation,cost=current.cost+Math.abs(p.x-q.x)+Math.abs(p.y-q.y)+(dir&&dir!==orientation?24:0)+occupiedCost(p,q,routes);
      if(cost>=costs[next])continue;
      costs[next]=cost;parents[next]=state;queue.push({state:next,cost,priority:cost+Math.abs(q.x-end.x)+Math.abs(q.y-end.y)});
    }
  }
  return null;
}

function fallback(start,end,obstacles,routes){
  const candidates=[[start,{x:end.x,y:start.y},end],[start,{x:start.x,y:end.y},end]];
  for(const x of [12,W-12])candidates.push([start,{x,y:start.y},{x,y:end.y},end]);
  for(const y of [12,H-12])candidates.push([start,{x:start.x,y},{x:end.x,y},end]);
  const score=path=>path.slice(1).reduce((sum,p,i)=>sum+obstacles.filter(b=>segmentHitsBox(path[i],p,b)).length*10000+occupiedCost(path[i],p,routes)+Math.abs(p.x-path[i].x)+Math.abs(p.y-path[i].y),0);
  return candidates.sort((a,b)=>score(a)-score(b))[0];
}

function freeWaypoint(value,obstacles){
  let p=point({x:clamp(value.x,12,W-12),y:clamp(value.y,12,H-12)});
  // A moved form may cover a previously valid manual passage. Push the passage
  // to a clear padded edge; never silently move the student's form instead.
  for(let attempt=0;attempt<16;attempt++){
    const covering=obstacles.find(b=>inside(p,b));if(!covering)return p;
    const candidates=[{x:covering.x,y:p.y},{x:covering.x+covering.width,y:p.y},{x:p.x,y:covering.y},{x:p.x,y:covering.y+covering.height}].map(q=>point({x:clamp(q.x,12,W-12),y:clamp(q.y,12,H-12)}));
    candidates.sort((a,b)=>obstacles.filter(box=>inside(a,box)).length*10000+distance(a,p)-(obstacles.filter(box=>inside(b,box)).length*10000+distance(b,p)));
    if(candidates[0].x===p.x&&candidates[0].y===p.y)break;p=candidates[0];
  }
  return p;
}

export function resolveConnectors(page){
  const shapes=page.elements.filter(canAttach),byId=new Map(shapes.map(e=>[e.id,e]));
  const prior=page.elements.flatMap(e=>{
    if(['Relation BDD','Relation UML'].includes(e.label))return e.children.filter(c=>['relation-line','uml-relation-line'].includes(c.role)).map(c=>c.points||[{x:c.x,y:c.y},{x:c.x2,y:c.y2}]);
    return ['line','arrow'].includes(e.type)&&!isConnector(e)?[[{x:e.x,y:e.y},{x:e.x2,y:e.y2}]]:[];
  });
  const elements=page.elements.map(connector=>{
    if(!isConnector(connector))return connector;
    const source=byId.get(connector.sourceId),target=byId.get(connector.targetId);
    const sourcePort=source&&anchorsFor(source).find(p=>p.side===connector.sourceAnchor),targetPort=target&&anchorsFor(target).find(p=>p.side===connector.targetAnchor);
    const start=point(sourcePort||{x:connector.x,y:connector.y}),end=point(targetPort||{x:connector.x2,y:connector.y2});
    const clearance=12+(connector.strokeWidth||2)/2,lead=clearance+8;
    const stub=(p,port)=>{const v=port?vectors[port.side]:{x:0,y:0};return point({x:clamp(p.x+v.x*lead,12,W-12),y:clamp(p.y+v.y*lead,12,H-12)});};
    const first=stub(start,sourcePort),last=stub(end,targetPort);
    const obstacles=shapes.map(e=>{const b=elementBounds(e);return {...b,x:b.x-clearance,y:b.y-clearance,width:b.width+clearance*2,height:b.height+clearance*2};}).filter(b=>!(!sourcePort&&inside(start,b))&&!(!targetPort&&inside(end,b)));
    const recent=prior.slice(-12),manual=(connector.waypoints||[]).slice(0,32).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>freeWaypoint(p,obstacles));
    const passages=[first,...manual,last],middle=[];let routeBlocked=false;
    for(let i=1;i<passages.length;i++){
      const segment=search(passages[i-1],passages[i],obstacles,recent);
      if(!segment)routeBlocked=true;
      middle.push(...(segment||fallback(passages[i-1],passages[i],obstacles,recent)));
    }
    const route=simplify([start,...middle,end]);prior.push(route);
    return {...connector,x:start.x,y:start.y,x2:end.x,y2:end.y,route,routeBlocked};
  });
  return {...page,elements};
}
