/** Geometry-only palette icons: no example content, names or remote assets. */
export function shapeIcon(kind) {
  const box='<rect x="4" y="4" width="24" height="24" rx="2"/>';
  let body;
  if(kind==='entity')body=box+'<path d="M4 11h24M10 15h6m4 0h4M10 20h6m4 0h4M10 25h6m4 0h4"/>';
  else if(['class','abstract-class','interface','object'].includes(kind))body=box+`<path d="M4 12h24${kind==='object'?'':'M4 20h24'}"/>`+(kind==='abstract-class'?'<path d="m15 6-2 4m2-4h4m-6 4h4"/>':kind==='interface'?'<circle cx="16" cy="8" r="1.5"/>':kind==='object'?'<path d="M12 9h8"/>':'');
  else if(kind==='note')body='<path d="M5 3h16l6 6v20H5Z"/><path d="M21 3v7h6M10 15h12M10 20h12M10 25h8"/>';
  else if(['association','usecase'].includes(kind))body='<ellipse cx="16" cy="16" rx="13" ry="9"/>'+(kind==='association'?'<path d="M4 16h24"/>':'');
  else if(kind==='actor')body='<circle cx="16" cy="6" r="3.5"/><path d="M16 10v11M8 15h16M16 21l-7 8m7-8 7 8"/>';
  else if(kind==='participant')body='<rect x="5" y="3" width="22" height="9" rx="1"/><path d="M16 12v18" stroke-dasharray="3 3"/>';
  else if(kind==='activation')body='<path d="M16 2v28" stroke-dasharray="3 3"/><rect x="12" y="9" width="8" height="16" fill="white"/>';
  else if(kind==='destruction')body='<path d="M16 2v13" stroke-dasharray="3 3"/><path d="m10 16 12 12m0-12L10 28"/>';
  else if(kind==='fragment')body=box+'<path d="M4 11h9l3-3V4M4 19h24" stroke-dasharray="3 2"/>';
  else if(kind==='system')body=box+'<ellipse cx="16" cy="13" rx="7" ry="3"/><ellipse cx="16" cy="22" rx="7" ry="3"/>';
  else if(kind==='package')body='<path d="M3 10V4h12v6M3 10h26v19H3z"/>';
  else if(kind==='state')body='<rect x="3" y="6" width="26" height="20" rx="5"/><path d="M3 14h26"/>';
  else if(kind==='action')body='<rect x="3" y="7" width="26" height="18" rx="9"/>';
  else if(kind==='decision')body='<path d="m16 3 13 13-13 13L3 16z"/>';
  else if(['initial','final','flow-final','history','deep-history'].includes(kind))body=`<circle cx="16" cy="16" r="11"${kind==='initial'?' fill="currentColor"':''}/>`+(kind==='final'?'<circle cx="16" cy="16" r="7" fill="currentColor"/>':kind==='flow-final'?'<path d="m10 10 12 12m0-12L10 22"/>':['history','deep-history'].includes(kind)?'<path d="M11 10v12m9-12v12m-9-6h9"/>'+(kind==='deep-history'?'<path d="m24 5 3 5m-5-2h6m-1-3-3 5"/>':''):'');
  else if(kind==='fork')body='<path d="M16 2v8M7 22v8m18-8v8"/><rect x="3" y="11" width="26" height="9" rx="1" fill="currentColor"/>';
  else if(kind==='join')body='<path d="M2 7h8M2 25h8m12-9h8"/><rect x="11" y="3" width="9" height="26" rx="1" fill="currentColor"/>';
  else if(kind==='swimlane')body=box+'<path d="M4 10h24M12 10v18M20 10v18"/>';
  else if(kind==='component')body='<path d="M8 4h21v24H8V19m0-6v-3"/><path d="M3 9h10v5H3zM3 19h10v5H3z"/>';
  else if(kind==='artifact')body='<path d="M6 3h15l6 6v20H6ZM21 3v7h6"/>';
  else if(kind==='database')body='<ellipse cx="16" cy="7" rx="12" ry="4"/><path d="M4 7v18c0 5 24 5 24 0V7M4 16c0 5 24 5 24 0"/>';
  else body='<path d="M3 24h9V8h17m-5-5 5 5-5 5"/><circle cx="3" cy="24" r="2" fill="white"/>';
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
