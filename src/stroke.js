export const DEFAULT_STROKE='#888c94';
export const DEFAULT_TEXT='#303540';
const patterns=new Set(['6 5','4 4','8 5','1 5','8 4 1 4']);
export function scaledDash(pattern,width=2){
  if(!patterns.has(pattern))return '';
  const factor=Math.max(1,width/2);
  return pattern.split(' ').map(n=>Number((Number(n)*factor).toFixed(3))).join(' ');
}
