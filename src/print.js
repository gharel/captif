import { pageSvg,escape as esc,duration } from './render.js';

export function printDocument(document,session,journalMarkup=''){
  const attendance=`Absences : ${session.absenceCount} · Durée d’absence : ${duration(session.totalAwayMs)}`;
  const pages=document.pages.map((page,i)=>`<article class="print-sheet"><header><strong>${esc(document.student.name||'Étudiant')}</strong><span>${esc(document.exam||'Copie')}</span></header>${pageSvg(page)}<footer><span>CAPTIF · COPIE D'ÉVALUATION</span><span>${attendance}</span><span>${i+1} / ${document.pages.length}</span></footer></article>`).join('');
  return pages+`<section class="print-report"><h1>Bilan de session</h1><p>${esc(document.student.name)} · ${esc(document.exam)}</p><p>Durée de session : ${duration(session.startedAt==null?0:(session.endedAt??Date.now())-session.startedAt)}</p><p class="print-attendance">${attendance}</p>${journalMarkup}</section>`;
}
