# Éléments UML configurables

Les quatre familles disposent de composants vectoriels groupés : classe, classe abstraite, interface ; objet et valeurs ; acteur, cas d'utilisation et frontière du système ; participant avec ligne de vie, activation, fragment combiné et destruction. Une note accompagne tous les diagrammes.

Chaque groupe porte `label: Élément UML` et `umlKind`. Les données éditables sont lues depuis ses textes de rôle (`uml-name`, `uml-stereotype`, `uml-attributes`, `uml-operations`, `uml-condition`) ; les cadres et décorations restent des primitives. Aucun groupe imbriqué. Les mises à jour conservent les identifiants et les coordonnées lorsque les dimensions restent compatibles avec la feuille A4.

Les noms sont limités à 50 caractères, les membres à dix lignes de 80 caractères. La factory refuse un élément dépassant les dimensions utiles de la feuille. Les titres abstraits sont italiques, les titres d'objets soulignés et les lignes de vie pointillées. Les cadres de système et de fragment ne masquent pas les éléments qu'ils contiennent.

Tests avant implémentation : couverture des douze types, compartiments, notations distinctes, lecture après édition directe, mises à jour immuables avec identifiants conservés, refus des limites dépassées, reprise du gabarit de classe historique.
