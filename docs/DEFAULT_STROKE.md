# Trait gris léger

Plan : centraliser le gris par défaut, tester son contraste sur la feuille blanche et le fond des blocs de code, appliquer la même valeur aux primitives BDD/UML et aux traits libres, agrandir le témoin couleur puis contrôler le navigateur.

Critères : contours, séparateurs et connexions nouvellement créés utilisent le même gris à 1 px ; contraste du gris ≥ 3:1 sur les surfaces de papier. Textes conservés sombres pour la lecture, choix explicites de tracé toujours mémorisés entre outils. Aucun remplacement des couleurs enregistrées dans les copies existantes. Témoin de couleur de 26 × 26 px, fixe et centré dans le bouton de style.

Validation : gris `#888c94`, contraste 3,37:1 sur blanc ; 211 tests réussis couvrant les constructeurs UML/BDD, les séparateurs, les connexions et les cadres de code. Recette sur `localhost:5174` avec copie fictive : insertion d’une entité et d’une association, contours SVG gris communs, textes lisibles, témoin mesuré à 26 × 26 px et première pastille de palette sélectionnée. Capture `screenshots/light-gray-stroke.png`. Pas de nouvelle impression PDF native.
