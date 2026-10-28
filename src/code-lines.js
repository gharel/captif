export function codeLines(text, columns=80){
  const width=Math.max(1,Math.floor(columns));
  return String(text).replace(/\r\n?/g,'\n').replace(/\t/g,'    ').split('\n').flatMap(line=>{
    const parts=[];for(let i=0;i<line.length;i+=width)parts.push(line.slice(i,i+width));return parts.length?parts:[''];
  });
}
