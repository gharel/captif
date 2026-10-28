import { weakMemo } from './performance.js';
import { editableConnector } from './diagram-connections.js';
import { connectorData } from './connectors.js';
const prepareElement=weakMemo(element=>{
  const wire=editableConnector(element);
  if(element.type==='group'&&wire){
    const start=!element.sourceId&&!element.startPoint,end=!element.targetId&&!element.endPoint;
    if(start||end)element={...element,...(start?{startPoint:{x:wire.x,y:wire.y}}:{}),...(end?{endPoint:{x:wire.x2,y:wire.y2}}:{})};
  }
  return connectorData(element);
});
export function normalizeCopy(doc,pageId){
  const index=doc.pages.findIndex(p=>p.id===pageId);if(index<0)return doc;
  const page=doc.pages[index],elements=page.elements.map(prepareElement);
  if(elements.every((e,i)=>e===page.elements[i]))return doc;
  const pages=doc.pages.slice();pages[index]={...page,elements};return {...doc,pages};
}
