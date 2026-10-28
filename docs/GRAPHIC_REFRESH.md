# Surfaces et relief de l'atelier

Plan : renforcer la hiérarchie des surfaces, donner une profondeur discrète aux outils et à la palette, conserver la zone de travail et vérifier l'impression sans effets d'interface. Aucun changement de comportement, de dimensions de colonne ou de texte de la palette.

Direction : blanc chaud pour les panneaux, encre bleu nuit pour les commandes, accent indigo. Le bureau accueille deux halos doux, violet et bleu, sous sa grille ponctuée. Les feuilles ont une ombre plus profonde et un contour fin. L'en-tête, les barres d'outils et les panneaux contextuels utilisent des surfaces légèrement dégradées et des bordures lumineuses.

La palette est un plateau clair dont les touches sont surélevées. Trois nuances voisines (indigo, bleu ardoise, mauve) alternent par touche, sans coder une catégorie fonctionnelle. Le survol et le focus mettent en évidence la touche en indigo. Les icônes et infobulles restent la seule présentation des formes ; aucune aide ni aucun nom n'est ajouté.

Variables : `--surface-raised`, `--surface-panel`, `--ink-strong`, `--shadow-float` et `--shadow-paper`. Les effets visuels sont limités à `screen` pour préserver le rendu imprimable. Respect du mode de mouvement réduit et des cibles de 44 px.

Validation : compilation CSS et `git diff --check`, puis recette visuelle de l'atelier avec les fonctionnalités intégrées par l'agent principal. Aucun test de texte source CSS ne remplace cette vérification.
