# Palette de formes par icônes

Organisation actuelle : depuis la refonte décrite dans `NEUMORPHIC_LIBRARY.md`, les icônes sont regroupées en familles de diagrammes dépliables, avec leurs formes et connexions. Cette demande utilisateur remplace le catalogue global à deux sections décrit ci-dessous. Les noms restent exclusivement en infobulle et nom accessible.

Plan : tester le contrat de la palette, remplacer les onglets BDD/UML et le sélecteur de diagramme par un catalogue unique, afficher chaque forme et chaque connexion sous forme d'icône, puis vérifier insertion et navigation au clavier au navigateur.

Critères : tous les composants restent accessibles en un clic. Aucun nom ni exemple textuel dans les vignettes ; les vrais noms UML/BDD (classe, objet, paquetage, entité, etc.) sont disponibles par infobulle et nom accessible. Aucun sélecteur de catégorie ou de type de diagramme. Deux sections stables : formes et connexions. Les créations restent vides, éditables sur la feuille et groupées. Les réglages avancés des objets existants et les sélecteurs de valeurs utiles à leurs champs ne sont pas concernés.

Vérification initiale : 29 boutons ; tests du catalogue complet et des noms accessibles. Recette navigateur sur copie fictive : insertion d'une note par Entrée et d'une boîte par clic, éditeur direct présent, aucune fenêtre de création. Capture `screenshots/icon-palette.png`. Extension : 55 boutons couvrant les nouvelles formes et messages ; voir `DIAGRAM_LIBRARY.md`.
