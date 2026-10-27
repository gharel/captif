/** Small, recognisable silhouettes of the actual diagram components. */
export function diagramPreview(kind) {
  const line=(d)=>`<path d="${d}" fill="none" stroke="#525968" stroke-width="1.2"/>`;
  const label=(x,y,t,extra='')=>`<text x="${x}" y="${y}" fill="#525968" font-family="Arial,sans-serif" font-size="6" ${extra}>${t}</text>`;
  const box=(fill='#e8efff')=>`<rect x="14" y="7" width="68" height="50" rx="3" fill="white" stroke="#525968"/><path d="M17 7H79Q82 7 82 10V22H14V10Q14 7 17 7" fill="${fill}"/>${line('M14 22H82')}`;
  let content;
  if(kind==='entity')content=box('#fff6d5')+label(48,17,'table','text-anchor="middle" font-weight="700"')+label(19,32,'PK', 'font-size="4"')+label(31,32,'id')+label(52,32,'INTEGER','opacity=".55"')+label(31,42,'nom')+label(52,42,'VARCHAR','opacity=".55"')+label(31,52,'date')+label(52,52,'DATE','opacity=".55"');
  else if(['class','abstract-class','interface','object'].includes(kind))content=box(kind==='object'?'#f0eaff':'#e8efff')+label(48,17,kind==='interface'?'«interface»':kind==='object'?'objet : Classe':'Classe',`text-anchor="middle" font-weight="700"${kind==='abstract-class'?' font-style="italic"':''}${kind==='object'?' text-decoration="underline"':''}`)+label(21,32,kind==='object'?'id = 1':'− attribut : Type')+(kind==='object'?label(21,44,'nom = «valeur»'):line('M14 39H82')+label(21,50,'+ méthode()'));
  else if(['usecase','association'].includes(kind))content=`<ellipse cx="48" cy="32" rx="35" ry="19" fill="${kind==='association'?'#fff6d5':'#ede5ff'}" stroke="#525968"/>`+label(48,34,kind==='association'?'association':'Cas d’utilisation','text-anchor="middle"');
  else if(kind==='actor')content=`<circle cx="48" cy="14" r="7" fill="white" stroke="#525968"/>`+line('M48 21V39M32 29H64M48 39L36 52M48 39L60 52');
  else if(kind==='participant')content=`<rect x="18" y="6" width="60" height="19" rx="3" fill="#e8efff" stroke="#525968"/>`+label(48,18,'Participant','text-anchor="middle"')+'<path d="M48 25V60" stroke="#525968" stroke-dasharray="4 3"/>';
  else if(kind==='activation')content='<path d="M48 3V61" stroke="#a0a6b3" stroke-dasharray="4 3"/><rect x="43" y="14" width="10" height="36" fill="#e8efff" stroke="#525968"/>';
  else if(kind==='destruction')content='<path d="M48 2V34" stroke="#a0a6b3" stroke-dasharray="4 3"/>'+line('M39 34L57 52M57 34L39 52');
  else if(kind==='fragment'||kind==='system')content=`<rect x="10" y="6" width="76" height="52" rx="2" fill="white" stroke="#525968"/>${kind==='fragment'?'<path d="M10 6H35V21H10" fill="#e8efff" stroke="#525968"/>':''}`+label(kind==='fragment'?16:17,16,kind==='fragment'?'alt':'Système')+line(kind==='fragment'?'M10 36H86':'M24 32H72M24 44H60');
  else if(kind==='note')content='<path d="M17 7H68L80 19V57H17Z" fill="#fff6d5" stroke="#525968"/><path d="M68 7V19H80" fill="none" stroke="#525968"/>'+line('M26 29H66M26 38H66M26 47H54');
  else content=line('M8 42H32V22H83M76 17L83 22L76 27')+label(12,36,'1')+label(66,15,'0..*');
  return `<svg viewBox="0 0 96 64" class="diagram-preview" aria-hidden="true">${content}</svg>`;
}
