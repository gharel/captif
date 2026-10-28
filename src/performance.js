export function boundedMemo(compute,limit=64){
  const values=new Map();
  return key=>{
    if(values.has(key)){const result=values.get(key);values.delete(key);values.set(key,result);return result;}
    const result=compute(key);values.set(key,result);
    if(values.size>limit)values.delete(values.keys().next().value);
    return result;
  };
}
export function weakMemo(compute){
  const values=new WeakMap();
  return key=>{if(!values.has(key))values.set(key,compute(key));return values.get(key);};
}
export function frameTask(draw,request=requestAnimationFrame,cancel=cancelAnimationFrame){
  let pending=null;
  const run=()=>{pending=null;draw();};
  return {
    schedule(){if(pending===null)pending=request(run);},
    flush(){if(pending!==null){cancel(pending);run();}},
    cancel(){if(pending!==null)cancel(pending);pending=null;},
  };
}
