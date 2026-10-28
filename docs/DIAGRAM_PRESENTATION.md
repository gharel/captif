# Présentation des textes et en-têtes

Nouvelle direction (référence utilisateur à capsules colorées) : dégradés lumineux menthe/turquoise, cyan/bleu, violet/rose, jaune/rose, orange/corail, etc. Orientation de gauche à droite avec faible pente diagonale. Combinaisons distinctes par type ; texte sombre identique pendant la saisie et dans le SVG. Tester le contraste sur tout le dégradé, l’unicité et la direction, puis vérifier visuellement les composants de la copie fictive. Cette demande remplace le précédent dégradé sombre ton sur ton.

Validation de cette direction : 210 tests, dont contraste ≥ 4,5:1 échantillonné tous les 5 % du dégradé pour chaque type coloré. Recette navigateur locale sur copie fictive : entité, association, classe et objet ; couleur du titre identique dans le champ de saisie et le SVG, aucune erreur console. Capture `screenshots/vivid-horizontal-gradients.png`. Rendu partagé avec l’impression ; pas de nouvelle recette PDF native.

Révision de palette : remplacer les tons bruns et les contrastes de dégradé trop marqués par des teintes contemporaines distinctes par type (pétrole, ardoise, indigo, prune, framboise…). Deux nuances proches de la même teinte, sans changement de teinte dans un dégradé. Tester l’unicité des couleurs entre types, le faible écart entre les deux nuances et le contraste du texte blanc avant implémentation. Conserver les zones de corps blanches et toute la géométrie de saisie.

Palette affinée : neuf types colorés possèdent chacun une paire exclusive de nuances, dont les modèles historiques de classe abstraite et interface. Les tests vérifient les couleurs effectivement affectées aux formes, un contraste du blanc ≥ 4,5:1 à chaque extrémité et un écart maximal de 16 par canal entre nuances. 210 tests réussis, compilation et contrôle visuel local sur copie fictive ; capture `screenshots/refined-diagram-colors.png`.

Plan : tester une géométrie partagée entre rendu SVG et saisie directe, puis remplacer les aplats pastel par des dégradés soutenus. Vérifier les formes BDD/UML, les textes longs et le rendu imprimable.

Critères : titres centrés dans leur en-tête, texte unique centré horizontalement et verticalement dans la forme, zone de texte couvrant sa largeur utile avec marges. Les corps à plusieurs champs, le code et les libellés de liens gardent leur alignement. Les onglets de paquetage et fragment conservent leur notation. Aucun texte ni identifiant sauvegardé ne change. Dégradés SVG partagés écran/PDF, sans ressource externe ; texte clair sur en-tête sombre.

Recette sur copie fictive à l’origine `localhost:5174` : création et saisie directe d’une entité, d’une association, d’une classe et d’un objet ; textes centrés pendant et après saisie, blancs sur les surfaces colorées, dégradés présents dans le SVG. Aucune erreur console observée. Capture : `screenshots/diagram-gradients-centered.png`. Tests de rendu partagé et compilation exécutés ; pas de nouvelle impression PDF native.
