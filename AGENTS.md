# Contribuer à Captif

## Produit et périmètre

Captif est une copie numérique A4 pour des évaluations, avec dessin libre, texte, diagrammes BDD/UML, suivi de session et impression PDF. Interface et messages en français. Le projet utilise JavaScript ESM, Vite et Tailwind, sans framework d'interface ni serveur applicatif.

Les demandes explicites de l'utilisateur priment sur ce document. Lire les spécifications pertinentes dans `docs/` avant de modifier un comportement. Pour une nouvelle fonctionnalité, consigner un plan et les critères d'acceptation, puis écrire les tests du comportement avant son implémentation. Utiliser des sous-agents uniquement si cela est demandé ; leur attribuer des fichiers distincts pour éviter les conflits.

## Architecture

- `src/main.js` : interface, commandes et gestes au pointeur.
- `src/model.js` : modèle, validation stricte des imports et historique immuable.
- `src/geometry.js`, `transforms.js`, `selection.js` : géométrie, transformations et sélection.
- `src/bdd.js`, `uml-nodes.js`, `uml-relations.js` : composants sémantiques.
- `src/diagram-inline.js` : création vide et édition directe des champs.
- `src/connectors.js`, `diagram-connections.js`, `layout.js` : accrochage, coudes et disposition.
- `src/render.js` : SVG partagé par la feuille, les miniatures et l'impression.
- `src/storage.js`, `monitor.js`, `print.js` : persistance, observations de session et impression.
- `src/drafts.js` : brouillon local séparé, validation et reprise de la saisie non validée.
- `src/performance.js`, `svg-patch.js` : caches bornés/faibles, cadence de rendu et conservation des groupes SVG inchangés.
- `src/page-index.js`, `document-data.js`, `workspace-preferences.js` : indexation faible, normalisation sans copies inutiles et préférences visuelles indépendantes de la copie.
- `tests/*.test.js` : tests Node natifs ; `docs/` : spécifications et recettes visuelles.

Préférer des fonctions pures et des changements ciblés. Ne pas ajouter de dépendance sans besoin concret. Le routage calculé, les repères d'édition et les poignées ne sont pas des données de copie.

## Contrats à préserver

- Ne jamais écraser ou supprimer silencieusement une copie illisible. Valider les imports avant de remplacer la copie courante. Conserver les identifiants des composants et les références de leurs liens pendant l'édition.
- Les opérations sur le document sont immuables et annulables. Une duplication ou une réorganisation constitue une action d'historique.
- Les caches de géométrie et de miniatures utilisent l'identité des pages immuables. Valider les modifications internes sans remplacer les pages inchangées par des clones ; les imports restent nettoyés par le validateur. Le brouillon n'entre dans l'historique qu'à la validation. Voir `docs/OPTIMIZATION.md`.
- Les palettes ajoutent des composants vides sans fenêtre de création. Éditer les champs directement sur la feuille ; les réglages avancés restent facultatifs.
- Les blocs de code sont vides à l'insertion. Coloration locale via highlight.js, sélection de langage dans l'éditeur, badge de langage en en-tête, aucun code exécuté ou suggéré. Conserver le texte brut/indentation et utiliser les mêmes couleurs SVG à l'impression. Voir `docs/CODE_BLOCKS.md`.
- Aucun placeholder ni texte d'aide dans les formes vides ou leurs champs de saisie (« Nom », « Ajouter des attributs », etc.). Conserver de larges cibles cliquables dans les compartiments vides et préserver tout texte réellement saisi. Voir `docs/EMPTY_SHAPES.md`.
- La bibliothèque expose toutes les formes et connexions par icônes géométriques : aucun onglet BDD/UML, sélecteur de diagramme ni nom visible sous les icônes. Utiliser les vrais noms UML/BDD en infobulle et `aria-label` (classe, objet, paquetage…). Les conventions graphiques locales sont identifiées comme telles. Voir `docs/ICON_PALETTE.md` et `docs/DIAGRAM_LIBRARY.md`.
- Les nouvelles entités sont des boîtes à en-tête et corps en texte libre, sans noms suggérés, attributs structurés, clés ou nullabilité. Les anciennes entités structurées restent compatibles. Retirer Classe abstraite et Interface de la palette ; conserver leurs modèles pour la lecture des copies. Voir `docs/FREE_ENTITY.md`. UML : compartiments lisibles et notations conservées.
- Les formes et leurs textes restent groupés. Les connecteurs suivent leurs extrémités ; leurs coudes manuels survivent à la sauvegarde.
- Redimensionner un texte libre change sa zone et ses retours à la ligne, pas sa police. MAJ contraint les proportions ; ALT permet la duplication ou la création depuis le centre selon le geste.
- Conserver les choix de tracé entre outils ; épaisseur initiale de 1 px.
- L'impression conserve le contenu et le bilan d'absences, sans commandes d'édition ni placeholders. Utiliser le même rendu SVG que l'écran.
- Le suivi enregistre des observations de focus, visibilité et plein écran. Ne pas inventer une cause précise, un contenu consulté ou une preuve de fraude. Les événements simultanés ne doublent pas les absences.
- Aucune donnée personnelle, ressource distante ou télémétrie ne doit être ajoutée sans demande explicite. Échapper tout contenu utilisateur dans le SVG/HTML ; maintenir les listes de valeurs autorisées du validateur.

## Vérification

Node.js >= 22.12 ; Node 24 utilisé en CI.

```sh
npm ci
npm test
npm run build
git diff --check
```

Pour un changement de logique, tester un résultat observable, les cas limites pertinents, la non-mutation et la reprise JSON si elle est concernée. Ne pas tester une copie de l'implémentation ni se contenter d'assertions sur le texte des fichiers sources. Les tests doivent être déterministes, sans réseau, ni horloge réelle pour les durées. Restaurer les globals simulés après chaque test.

Pour un changement visuel ou de geste, compléter par une vérification navigateur et, si nécessaire, d'impression : les tests Node ne valident pas l'apparence ni les événements natifs. Utiliser une copie fictive dans une origine locale distincte de celle de l'utilisateur ; ne pas modifier sa copie pour une recette. Conserver une capture utile dans `docs/screenshots/`, sans données personnelles.

## Git et publication

Ne pas committer `node_modules/`, `dist/`, les caches, `.env`, les identifiants ou les réglages d'IDE. Ne pas réinitialiser, écraser ou forcer une branche sans demande explicite.

La branche `main` est publiée automatiquement sur `https://gharel.github.io/captif/` par `.github/workflows/pages.yml`, après tests et compilation. La production utilise le chemin `/captif/` ; le développement utilise `/`. Un push sur `main` est donc aussi une publication : respecter l'autorisation de publication de la session, puis vérifier le workflow et la version publique avant d'annoncer le déploiement réussi.

Résumer les changements, les vérifications exécutées et les limites de validation réelles. Ne pas annoncer un parcours navigateur ou un déploiement non vérifié.
