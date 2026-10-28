# Présentation des textes et en-têtes

Plan : tester une géométrie partagée entre rendu SVG et saisie directe, puis remplacer les aplats pastel par des dégradés soutenus. Vérifier les formes BDD/UML, les textes longs et le rendu imprimable.

Critères : titres centrés dans leur en-tête, texte unique centré horizontalement et verticalement dans la forme, zone de texte couvrant sa largeur utile avec marges. Les corps à plusieurs champs, le code et les libellés de liens gardent leur alignement. Les onglets de paquetage et fragment conservent leur notation. Aucun texte ni identifiant sauvegardé ne change. Dégradés SVG partagés écran/PDF, sans ressource externe ; texte clair sur en-tête sombre.

Recette sur copie fictive à l’origine `localhost:5174` : création et saisie directe d’une entité, d’une association, d’une classe et d’un objet ; textes centrés pendant et après saisie, blancs sur les surfaces colorées, dégradés présents dans le SVG. Aucune erreur console observée. Capture : `screenshots/diagram-gradients-centered.png`. Tests de rendu partagé et compilation exécutés ; pas de nouvelle impression PDF native.
