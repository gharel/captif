# Plan de tests écrit avant développement

Les suites utilisent le runner natif Node (`node:test`, `node:assert/strict`) sans réseau ni navigateur. Exécution : `node --test` après ajout de `"type": "module"` au `package.json`. Avant création des modules, l'échec attendu est `ERR_MODULE_NOT_FOUND` ; aucune implémentation n'est incluse dans cette livraison de tests.

## Contrats exécutables

`src/model.js` exporte `createDocument`, `addPage(doc)`, `removePage(doc, pageId)`, `addElement(doc, pageId, element)`, `updateElement(doc, pageId, elementId, patch)` et `removeElement(doc, pageId, elementId)`. Ces fonctions renvoient un document sans modifier leur entrée. Une copie initiale possède `version: 1`, un `id` unique, `student: {name: '', number: ''}`, `exam: ''` et une page `{id, elements: []}`. Les types couverts sont `rect`, `text`, `pen`, `ellipse`, `line`, `arrow`. Supprimer la dernière page ou une cible inconnue ne change pas le document.

Le même module exporte les fonctions pures `createHistory(initial)`, `commit(history, document)`, `undo(history)`, `redo(history)`. Chaque résultat contient `{past, present, future}`. Une modification après annulation efface la branche de rétablissement.

`src/monitor.js` exporte `createMonitor({now, onChange})`, qui renvoie `start()`, `signal(type, value)`, `finish()` et `snapshot()`. Les signaux sont `focus` (vrai = focus), `visibility` (vrai = visible) et `fullscreen` (vrai = plein écran). Les signaux avant démarrage et après fin sont ignorés. Les appels répétés à `start` en session et à `finish` après fin sont sans effet.

Un snapshot indépendant contient `status` (`idle`, `active`, `finished`), `startedAt`, `endedAt`, `incidents`, `absenceCount`, `totalAwayMs`, `fullscreenExits`. Chaque incident contient `start`, `end` (null si ouvert), `durationMs`, `reasons` (valeurs `focus` et/ou `visibility`). Une absence est l'union de focus perdu et visibilité perdue : les événements simultanés ne doublent ni compteur ni durée. Une sortie plein écran est seulement une transition vrai vers faux ; elle ne crée pas à elle seule une absence.

La reprise utilise `createMonitor({now, onChange, restored: snapshot})`. Une session active conserve son journal et ses compteurs ; une interruption est comptabilisée depuis `savedAt` (à défaut `startedAt`) avec la raison `reload`, ou prolonge l'incident déjà ouvert. La réinitialisation silencieuse est interdite.

## Couverture automatique

Compléments de régression : vérifier la sauvegarde/reprise complète d'un diagramme édité (avec coudes), la conservation brute d'une sauvegarde illisible, les erreurs de stockage, les petites annotations sémantiques sans relâcher les limites des textes libres, et l'échappement des noms BDD/UML à l'impression. Les globals du stockage sont simulés puis restaurés ; aucun accès aux copies réelles ni au réseau.

Évolution de l'atelier : le modèle courant ne conserve plus que `student: {name: ''}`. Le type `group` contient un cadre et du texte en coordonnées absolues, avec un niveau d'imbrication. Les tests de groupe et de rendu ont été ajoutés avant l'implémentation correspondante ; la recette du double-clic et de l'édition directe est consignée dans `UX_UPDATE.md`.

- Copie et identifiants uniques, isolation des pages et refus de supprimer la dernière.
- Ajout, modification, suppression de tous les types d'éléments ; sources gelées pour détecter les mutations.
- Annuler/rétablir, limites de l'historique et abandon d'une ancienne branche.
- Suivi inactif avant démarrage, durées déterministes avec horloge injectée.
- Événements répétés, chevauchements focus/visibilité et intervalles successifs.
- Sorties plein écran, fin de session au milieu d'une absence, journal figé après fin.
- Snapshots indépendants pour protéger l'état interne contre une modification involontaire.

## Recette navigateur et impression

1. Démarrer une copie après lecture de l'information de suivi ; vérifier identité, épreuve et minuteur.
2. Écrire du texte accentué et multiligne ; tracer au pointeur et au stylet, créer et déplacer formes et flèches. Annuler/rétablir et supprimer une sélection. Vérifier les raccourcis sans perturber l'édition de texte.
3. Ajouter deux pages, naviguer et vérifier que les éléments restent sur leur page ; vérifier le refus de retirer la dernière page.
4. Recharger après sauvegarde ; vérifier texte, géométrie, identité, pages et comportement documenté du suivi après interruption. Simuler un stockage indisponible et un fichier JSON invalide : message explicite, copie courante conservée.
5. Changer d'onglet puis revenir ; perdre le focus sans masquer la page ; vérifier les raisons et durées sans prétendre connaître la cause exacte. Sortir du plein écran et confirmer le compteur distinct.
6. Terminer la session puis imprimer en PDF : une feuille A4 par page, texte et schémas nets, identité et pagination lisibles, aucun bouton ni panneau sur la copie. Vérifier le bilan de session et les caractères spéciaux.
7. Parcourir les actions au clavier ; vérifier noms accessibles, focus visible et lisibilité à 200 %. Tester une fenêtre étroite et le pointeur tactile.

Les tests unitaires ne prouvent pas les comportements réels du navigateur ni le rendu PDF. La recette doit indiquer les étapes effectivement réalisées et celles restant à vérifier. Le journal local peut être modifié par un utilisateur : aucun test ne le rend opposable ni ne garantit l'absence de fraude.
