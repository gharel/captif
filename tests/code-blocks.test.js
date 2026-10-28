import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodeBlock, updateCodeBlock, codeText, CODE_LANGUAGES } from '../src/code-blocks.js';
import { highlightLines } from '../src/code-highlight.js';
import { createDocument, validateDocument, createHistory, commit, undo, updateElement } from '../src/model.js';
import { pageSvg } from '../src/render.js';

test('un bloc de code est vide, groupé et propose les langages demandés',()=>{
  const block=createCodeBlock();assert.equal(codeText(block),'');assert.equal(block.type,'group');
  for(const lang of ['sql','javascript','css','html','php','java','markdown'])assert.ok(CODE_LANGUAGES[lang]);
  assert.throws(()=>createCodeBlock({language:'inconnu'}));
  assert.throws(()=>createCodeBlock({language:'__proto__'}));
});

test('texte brut, indentation, langage et identifiants survivent à la reprise et à une modification annulable',()=>{
  const block=createCodeBlock(),doc=createDocument();doc.pages[0].elements=[block];
  const source='SELECT id, nom\n  FROM compte\nWHERE actif = 1;';
  const next=updateCodeBlock(block,{text:source,language:'sql'});
  assert.equal(codeText(block),'');assert.equal(next.id,block.id);
  assert.equal(next.children.find(c=>c.role==='code-content').id,block.children.find(c=>c.role==='code-content').id);
  const saved=validateDocument(JSON.parse(JSON.stringify(updateElement(doc,doc.pages[0].id,block.id,next))));
  assert.equal(saved.pages[0].elements[0].codeLanguage,'sql');assert.equal(codeText(saved.pages[0].elements[0]),source);
  assert.equal(codeText(undo(commit(createHistory(doc),saved)).present.pages[0].elements[0]),'');
});

test('la coloration différencie les tokens sans exécuter ni injecter de balises',()=>{
  const tokens=highlightLines('SELECT id FROM compte WHERE actif = 1;', 'sql', 100).flat();
  assert.equal(tokens.map(t=>t.text).join(''),'SELECT id FROM compte WHERE actif = 1;');
  assert.ok(new Set(tokens.map(t=>t.color)).size>1);
  const payload='<script>alert("x")</script>';
  const block=createCodeBlock({text:payload,language:'html'}),svg=pageSvg({elements:[block]});
  assert.doesNotMatch(svg,/<script|onerror=/);assert.match(svg,/&lt;/);
  assert.equal(codeText(block),payload);
});

test('le repli des longues lignes est visuel et les tabulations restent sauvegardées',()=>{
  const source='\tconst valeur = "une chaîne assez longue";';
  const lines=highlightLines(source,'javascript',12);
  assert.ok(lines.length>1);assert.equal(lines.flat().map(t=>t.text).join(''),source.replace(/\t/g,'    '));
  const block=createCodeBlock({text:source,language:'javascript'});assert.equal(codeText(block),source);
});

test('un bloc trop haut est refusé et le langage importé est strictement validé',()=>{
  assert.throws(()=>createCodeBlock({text:'ligne\n'.repeat(1000)}));
  const block=createCodeBlock(),doc=createDocument();doc.pages[0].elements=[{...block,codeLanguage:'<script>'}];
  assert.throws(()=>validateDocument(doc));
});

test('chaque langage sélectionnable colore son code sans modifier les caractères',()=>{
  const examples={plaintext:'texte libre',sql:'SELECT id FROM compte;',javascript:'const x = "a";',typescript:'const x: number = 1;',css:'a { color: red; }',html:'<div class="x">Bonjour</div>',php:'<?php echo "Bonjour";',java:'class Demo { int x = 1; }',markdown:'# Titre\n**texte**',python:'def f():\n    return 1',json:'{"id": 1}',bash:'echo "Bonjour"',xml:'<root id="1" />'};
  for(const [language,source] of Object.entries(examples)){
    const lines=highlightLines(source,language,1000);
    assert.equal(lines.map(line=>line.map(token=>token.text).join('')).join('\n'),source,language);
    if(language!=='plaintext')assert.ok(lines.flat().some(token=>token.color!=='#334155'),language);
  }
});
