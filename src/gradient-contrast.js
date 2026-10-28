const cache=new WeakMap();
const rgb=color=>color.slice(1).match(/../g).map(v=>parseInt(v,16));
const luminance=channels=>channels.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);

/** Worst-case contrast across all stops and their sRGB interpolation. */
export function gradientTextColor(stops,preferred){
  let colors=cache.get(stops);if(!colors){colors=new Map();cache.set(stops,colors);}
  if(colors.has(preferred))return colors.get(preferred);
  const candidates=[preferred,'#000000','#ffffff'],levels=candidates.map(color=>luminance(rgb(color))),scores=candidates.map(()=>Infinity);
  for(let segment=0;segment<stops.length-1;segment++){
    const from=rgb(stops[segment]),to=rgb(stops[segment+1]);
    for(let i=0;i<=256;i++){
      const background=luminance(from.map((v,k)=>v+(to[k]-v)*i/256));
      levels.forEach((level,k)=>{scores[k]=Math.min(scores[k],ratio(level,background));});
    }
  }
  const color=scores[0]>=4.5?preferred:scores[1]>=scores[2]?'#000000':'#ffffff';
  if(colors.size>=32)colors.delete(colors.keys().next().value);
  colors.set(preferred,color);return color;
}
