# Blocs de code et bibliothèque graphique

Alignement du langage : après validation de l'éditeur, afficher le badge à droite de l'en-tête, avec une marge de 20 unités, quelle que soit la longueur du langage ou la largeur du bloc. Plan : vérifier le rendu SVG sur plusieurs langages et largeurs, puis appliquer l'ancrage à droite au rendu partagé écran/PDF, sans modifier la copie.

Plan : tester la conservation du code, la coloration sûre et la géométrie ; ajouter un composant vide avec choix de langage dans l'éditeur ; intégrer le rendu SVG partagé et la validation JSON ; compléter formes/liens de diagrammes et moderniser l'interface ; vérifier édition, impression et reprise avant publication.

Le bloc de code conserve le texte brut, l'indentation et un identifiant de langage autorisé. Texte brut, SQL, JavaScript, TypeScript, CSS, HTML, PHP, Java, Markdown, Python, JSON, Bash et XML sont disponibles. Coloration locale via highlight.js, sans CDN, exécution de code, autocomplétion ou exemple inséré. L'utilisateur choisit le langage pendant l'édition, avec aperçu coloré immédiat. Changer le langage et le texte constitue une seule action annulable.

Le SVG contient des fragments de texte échappés et des couleurs explicites ; l'impression conserve le code et ses couleurs. Le cadre s'adapte au nombre de lignes, dans les limites de la feuille A4. Les lignes longues sont repliées visuellement sans modifier leur contenu. Les copies antérieures restent compatibles.

Sources de référence : [Miro mapping et diagrammes](https://help.miro.com/hc/en-us/articles/4403634496402-Miro-for-mapping-diagramming), [highlight.js](https://highlightjs.org/). Reprendre les familles de symboles et usages, sans prétendre reproduire tout le catalogue propriétaire de Miro.

Recette sur copie fictive : blocs SQL et JavaScript édités avec coloration immédiate, changement de langage annulé, rechargement avec conservation du code et du langage. Vérification des tokens SVG colorés utilisés par l'impression. Connexion ERD créée entre deux entités libres et vérifiée visuellement. Captures : `screenshots/code-blocks.png`, `screenshots/code-editor.png`, `screenshots/erd-crows-foot.png`.
