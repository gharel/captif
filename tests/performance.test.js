import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedMemo, weakMemo, frameTask } from '../src/performance.js';
import { resolvePageGeometry, pageSvg } from '../src/render.js';
import { highlightLines } from '../src/code-highlight.js';

test('le cache borné réutilise les résultats et évince la valeur la moins récente',()=>{
  let calls=0;const get=boundedMemo(x=>({value:x,calls:++calls}),2);
  const a=get('a');get('b');assert.equal(get('a'),a);get('c');get('b');assert.equal(calls,4);
});
test('les miniatures ne sont recalculées que pour les pages immuables modifiées',()=>{
  let calls=0;const get=weakMemo(page=>({text:page.text,call:++calls})),a={text:'a'},b={text:'b'};
  const first=get(a);get(b);assert.equal(get(a),first);get({...a,text:'nouveau'});assert.equal(calls,3);
});
test('les rendus sont regroupés sans perdre la dernière tâche, annulables et vidables',()=>{
  let callback,id=0,cancelled=0;const values=[];
  const frame=frameTask(()=>values.push('draw'),fn=>(callback=fn,++id),()=>cancelled++);
  frame.schedule();frame.schedule();assert.equal(id,1);callback();assert.deepEqual(values,['draw']);
  frame.schedule();frame.flush();assert.equal(values.length,2);assert.equal(cancelled,1);
  frame.schedule();frame.cancel();assert.equal(cancelled,2);assert.equal(values.length,2);
});

test('le routage partagé réutilise une page immuable et invalide une page modifiée',()=>{
  const page={elements:[{id:'r',type:'rect',x:30,y:40,width:80,height:80,stroke:'#334155',strokeWidth:1}]},before=JSON.stringify(page);
  const resolved=resolvePageGeometry(page);pageSvg(page,{selected:'r'});assert.equal(resolvePageGeometry(page),resolved);
  const next={...page,elements:page.elements.map(e=>({...e,x:60}))};assert.notEqual(resolvePageGeometry(next),resolved);
  assert.equal(JSON.stringify(page),before);
});
test('la coloration réutilise ses tokens immuables et tient compte de la largeur et du langage',()=>{
  const tokens=highlightLines('SELECT 42;','sql',80);assert.equal(highlightLines('SELECT 42;','sql',80),tokens);
  assert.notEqual(highlightLines('SELECT 42;','sql',4),tokens);assert.notEqual(highlightLines('SELECT 42;','plaintext',80),tokens);
  assert.throws(()=>tokens[0][0].text='altéré');
});
