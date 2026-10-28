# Captif

Application publiée : [gharel.github.io/captif](https://gharel.github.io/captif/).

Chaque push sur `main` lance les tests, compile le projet et le déploie sur GitHub Pages via `.github/workflows/pages.yml`.

Les règles de contribution et de validation se trouvent dans [AGENTS.md](AGENTS.md). La couverture automatique et la recette navigateur sont décrites dans [docs/TEST_PLAN.md](docs/TEST_PLAN.md). Lancer les tests avec `npm test` ; ils utilisent le runner natif Node, sans réseau ni accès aux copies réelles.

Une copie numérique pour les évaluations : écrire du texte et dessiner des schémas sur des feuilles A4, puis imprimer la copie et son bilan en PDF.

Projet JavaScript ESM, Vite 7 et Tailwind CSS 4 via le plugin officiel Vite. Interface en français, sans bibliothèque d'interface, sans compte ni serveur applicatif. Aucune police, image ou télémétrie distante n'est chargée par l'application.

## Démarrer

Node.js 22.12 ou ultérieur (testé avec Node 24.11).

```sh
npm ci
npm run dev
```

Ouvrir l'adresse locale indiquée, normalement `http://127.0.0.1:5173/`. Utiliser un navigateur classique récent pour les évaluations et l'impression ; l'aperçu intégré de certains outils ne prend pas en charge les dialogues natifs.

```sh
npm test
npm run build
npm run preview
```

Le dossier `dist/` contient la version statique à héberger. Le développement et la compilation invoquent explicitement le point d'entrée Node de Vite pour rester compatibles avec les wrappers Node de ServBay sous Windows. Le runner de tests désactive l'isolation par processus pour fonctionner dans les environnements qui restreignent la création de processus.

## Utiliser la copie

1. Renseigner le nom et le titre de l'évaluation.
2. Lire et accepter les consignes : rester dans la fenêtre et en plein écran pendant l'évaluation, sous peine de retrait de points selon les consignes de l'enseignant. **Commencer en plein écran** active le plein écran avant le démarrage du suivi et du chronomètre. Si le navigateur refuse, la session reste en préparation et un message invite à réessayer. Le travail est également possible en préparation.
3. Choisir un outil : sélection, stylo, texte, rectangle, ellipse, ligne ou flèche. Tracer en cliquant et glissant sur la feuille ; la sélection permet de déplacer un élément.
4. Pour écrire : choisir **Texte** dans la barre d'outils, cliquer sur la feuille et saisir directement le contenu. Un clic sur un texte affiche ses commandes contextuelles près de lui : modification, taille, couleur, suppression. **Double-cliquer sur un texte** ouvre l'éditeur : `Ctrl/Cmd+Entrée` ou **Enregistrer** valide ; `Échap` ou **Annuler** abandonne la modification. Un clic ailleurs valide aussi le texte si ses limites sont respectées. Les tailles des cellules BDD sont adaptées au composant pour conserver les colonnes ; les textes libres et UML ont une taille réglable.
5. **Entité / table** ajoute immédiatement une boîte vide : remplir son nom puis cliquer dans ses cellules, sans fenêtre de création. **Tab** passe au champ suivant ; **Entrée** valide un champ simple et **Ctrl/Cmd + Entrée** valide un compartiment de plusieurs lignes. Les commandes **＋ Attribut**, **＋ Méthode** et **− Ligne** apparaissent près du composant sélectionné. La BDD propose jusqu'à 12 attributs avec nom, type, clé PK/FK/PK,FK et caractère nullable. **Association** ajoute une forme ovale vide ; **Lien et cardinalités** ajoute une relation éditable et utilise les deux éléments sélectionnés lorsqu'ils sont compatibles. Les points d'accroche permettent de rebrancher les relations. **Options BDD / UML** conserve les réglages avancés d'un élément existant. Supprimer une boîte retire ses liens attachés, avec annulation possible.
6. Annuler avec `Ctrl/Cmd+Z`, rétablir avec `Ctrl/Cmd+Maj+Z`, supprimer la sélection avec `Suppr` ou `Retour arrière`. Les raccourcis de dessin ne s'appliquent pas dans les champs de saisie. `Échap` quitte un geste ou une sélection.
7. Ajouter et naviguer entre les feuilles. **Paramètres**, avec une roue dentée en bas du panneau gauche, permet d'afficher ou masquer les points de repère. Le zoom et les repères ne modifient pas le contenu de la copie ni son impression. **Journal** regroupe les compteurs et durées de suivi ainsi que la commande de plein écran ; son voyant est vert sans absence observée, rouge dès qu'au moins une absence a été enregistrée.
8. Terminer la session : l'édition est figée. Le bouton **Imprimer / PDF** ouvre le dialogue natif ; choisir **Enregistrer au format PDF**, papier A4, échelle 100 %, et désactiver les en-têtes/pieds de page ajoutés par le navigateur. Les feuilles sont suivies d'un bilan de session, éventuellement réparti sur plusieurs pages si le journal est long.

Le dessin exige un pointeur ; les formulaires, l'ajout de texte et les commandes sont accessibles au clavier. L'application n'interprète pas ni ne valide la sémantique UML/BDD des schémas.

## Sauvegarde et suivi

La bibliothèque unique expose 55 formes et connexions sous forme d'icônes, sans onglet ni sélecteur de diagramme. Les infobulles utilisent les vrais noms : classe, objet, cas d'utilisation, paquetage, état, activité, entité/table, etc. Les boutons sont aussi nommés pour les lecteurs d'écran et activables au clavier. Cliquer insère un élément vide, à remplir directement sur la feuille. Les attributs et méthodes acceptent une ligne par entrée. Les relations attachées suivent leurs éléments ; les messages, activations et destructions se positionnent sur les lignes de vie. Les variantes graphiques locales (exclusion, message minuté/dérobant/avec délai) sont identifiées comme conventions. Voir [docs/DIAGRAM_LIBRARY.md](docs/DIAGRAM_LIBRARY.md).

L'éditeur de texte et son menu contextuel proposent gras, italique et souligné. `Ctrl/Cmd+B`, `Ctrl/Cmd+I` et `Ctrl/Cmd+U` basculent ces styles pendant la saisie. Le formatage concerne le champ entier ; texte et styles s'enregistrent ensemble et s'annulent ensemble. Les commandes d'alignement et de répartition disposent de leurs propres icônes.

Sous les outils, **Style du tracé** ouvre les couleurs, l'épaisseur et les motifs plein, tirets, pointillés ou mixte avec aperçu. Les réglages modifient la sélection et les prochains tracés.

Le trait de dessin commence à **1 px**. Les derniers choix de couleur, d'épaisseur et de motif sont conservés entre outils et feuilles pendant l'utilisation ; sélectionner un objet existant ne les remplace pas. Les nouveaux composants BDD/UML reprennent ces choix. Leurs tirets de notation restent ceux du modèle tant qu'aucun motif n'a été choisi explicitement.

Les objets sélectionnés disposent de **poignées de redimensionnement** : cadre pour les formes et les zones de texte, angles pour les groupes, extrémités pour les lignes/flèches. Pour un texte, les poignées changent sa zone et son retour à la ligne sans changer la police ; taille, **gras** et *italique* se règlent dans ses commandes contextuelles. **Maj** crée un carré/cercle ou contraint une ligne à 45° ; lors du redimensionnement, il conserve les proportions initiales. **Alt** dessine ou redimensionne depuis le centre ; **Alt + glisser un objet** en crée une copie indépendante. Maj + glisser un objet contraint son déplacement horizontalement ou verticalement. Une manipulation s'annule en une action ; Échap abandonne le geste. Voir [docs/TRANSFORMS.md](docs/TRANSFORMS.md).

Pour sélectionner plusieurs éléments, tracer un **cadre sur le fond** avec l'outil Sélection, ou utiliser **Maj + clic** pour ajouter/retirer un élément. **Alt + glisser** l'un des objets sélectionnés duplique l'ensemble, avec ses liens internes. Déplacement, style et suppression s'appliquent au lot ; Ctrl/Cmd + Z annule chaque opération en une action. Voir [docs/MULTI_SELECTION.md](docs/MULTI_SELECTION.md).

Avec **Ligne** ou **Flèche**, les formes affichent quatre **points d'accroche violets**. Glisser d'un point à un autre attache la connexion : elle suit ensuite les déplacements et redimensionnements des formes. Les nouveaux traits empruntent un chemin à angles droits qui contourne les autres formes et privilégie les passages non occupés. Pour rebrancher ou détacher une extrémité, sélectionner la connexion puis déplacer sa poignée. Un trait historique adopte aussi ce fonctionnement lorsque l'une de ses extrémités est modifiée. Voir [docs/CONNECTORS.md](docs/CONNECTORS.md).

Les **poignées en losange** des connexions permettent de déplacer leurs segments et coudes. **Parcours automatique** efface les passages imposés. Les relations BDD et les relations structurelles UML disposent des mêmes commandes en conservant leurs cardinalités et marqueurs ; les messages de séquence conservent leur logique temporelle.

**Aligner** aligne les boîtes sélectionnées sur leurs côtés ou leurs centres ; à partir de trois boîtes, il permet aussi de répartir les espacements. **Réorganiser** redispose toutes les boîtes de la feuille selon leurs liens, recalcule les parcours et conserve leur contenu. Chaque commande s'annule en une action. Si la feuille manque de place, un message invite à répartir le diagramme sur plusieurs feuilles, sans réduire les textes.

La copie et le journal sont enregistrés dans `localStorage` sous `captif-copy-v1`. En cas d'erreur de stockage, un message indique que la sauvegarde a échoué. Une sauvegarde illisible est conservée sans être écrasée ; **Nouvelle copie** ou un import confirmé autorise son remplacement. Un rechargement d'une session active conserve le suivi et ajoute une interruption « rechargement » à partir de la dernière sauvegarde. Les durées reposent sur des horodatages, avec protection contre une horloge qui recule.

**Exporter .json** permet une conservation portable hors session active. L'import contrôle le format, les identifiants et les coordonnées ; il ouvre le document en préparation, sans importer une session historique comme nouvelle évaluation. Le journal exporté reste consultable dans le JSON. Une nouvelle copie remplace la sauvegarde locale après confirmation : exporter avant de continuer si elle doit être conservée.

Ouvrir une seule instance de la copie à la fois : sur les navigateurs compatibles Web Locks, un second onglet s'ouvre en lecture seule et ne peut pas écraser le travail de l'autre. Fermer l'onglet initial puis recharger le second pour reprendre l'édition. Il n'y a pas de synchronisation concurrente ; sur un navigateur sans Web Locks, éviter toute ouverture en double. Les données ne suivent pas l'étudiant entre machines, profils ou origines. L'effacement des données du site ou le mode privé peut supprimer la copie. Ne pas ouvrir directement `index.html` en `file://`.

Une absence commence dès que la fenêtre perd le focus ou que la page est masquée, et se termine quand les deux conditions sont rétablies. Les signaux qui se recouvrent produisent une seule absence. Les sorties du plein écran sont comptées et horodatées séparément. Le journal s'arrête à la fin explicite de session. L'impression depuis l'application est proposée après la fin ; un raccourci d'impression du navigateur ne peut pas être bloqué de manière fiable et peut provoquer une perte de focus.

Une page web ne peut pas déterminer avec certitude si une page masquée correspond à un onglet changé, une fenêtre réduite ou une autre action. Les dialogues du navigateur peuvent produire des faux positifs. Le parcours de démarrage exige le plein écran, mais il ne verrouille pas le poste. Le stockage et le code côté client sont modifiables : ni le journal ni le verrouillage de l'édition après fin ne sont inviolables. Cette version constitue un atelier local et un journal d'observations, sans garantie anti-triche. Une restriction effective du poste exige un environnement d'examen administré distinct.

## Organisation et démarche

- `docs/PLAN.md`, `docs/SPECIFICATIONS.md`, `docs/ACCEPTANCE.md`, `docs/TEST_PLAN.md` : plan et contrats écrits avant l'implémentation avec deux sous-agents.
- `src/model.js` : document immuable, historique borné à 100 actions, validation des imports.
- `src/monitor.js` : machine d'état de session, horloge injectable, reprise et validation du journal.
- `src/storage.js` : stockage et export JSON, gestion d'erreurs.
- `src/render.js` : rendu vectoriel SVG, texte échappé, contrôle des limites.
- `src/geometry.js` : géométrie partagée, bornes et déplacement solidaire des groupes.
- `src/bdd.js` : entités, associations, cardinalités, mise à jour structurée et résolution des liens attachés.
- `src/main.js` : interface, pointeurs, session et impression.
- `src/style.css` : Tailwind, interface responsive et mise en page d'impression.
- `tests/` : tests déterministes exécutés avec le runner Node.
- `docs/VERIFICATION.md` : résultats et limites des vérifications effectuées.

Les suites du document et du suivi ont été écrites avant les modules. Leur premier lancement sans isolation échouait avec `ERR_MODULE_NOT_FOUND`, puis elles ont été rendues passantes. Des tests de validation et de robustesse ont été ajoutés lors de la revue.

Références techniques : [installation Vite](https://vite.dev/guide/), [Tailwind avec Vite](https://tailwindcss.com/docs/installation/using-vite), [visibilité du document](https://developer.mozilla.org/en-US/docs/Web/API/Document/hidden), [impression CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).
