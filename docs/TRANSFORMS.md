# Manipulation des objets

## Plan et comportements attendus

1. Écrire et tester la géométrie indépendamment des événements du navigateur.
2. Afficher les poignées sur la sélection, sans les inclure dans le PDF.
3. Brancher création, redimensionnement et duplication sur l'historique existant.
4. Vérifier au navigateur et compiler.

- Rectangle, ellipse et tracé : poignées de cadre ; ligne/flèche : deux extrémités.
- Zones de texte : poignées de cadre, largeur et hauteur ajustables à police constante avec retour à la ligne. La hauteur ne descend pas sous le contenu. Groupes : poignées d'angle et mise à l'échelle proportionnelle pour préserver les compartiments.
- À la création, Maj contraint rectangle/ellipse en carré/cercle et les lignes à des angles de 45°.
- Au redimensionnement, Maj conserve le rapport initial ; pour un carré/cercle il reste de 1:1. Alt redimensionne autour du centre.
- Alt à la création dessine depuis le point initial pris comme centre. Alt + glisser une sélection crée une copie indépendante, avec de nouveaux identifiants pour le groupe et ses enfants. Un simple Alt-clic ne crée rien.
- Maj et Alt se combinent. Les modificateurs de création et de redimensionnement sont lus pendant le geste.
- Les objets restent dans les marges de la feuille. La taille de police, de 12 à 32 px, se règle dans le menu du texte avec le gras et l'italique.
- Une manipulation constitue une seule action annulable. Échap et l'annulation du pointeur abandonnent le geste.
- Les relations attachées et leurs composants restent pilotés par leurs extrémités et leurs formulaires ; les poignées ne permettent pas de rompre ces ancrages.

## Vérifications attendues

Carré/cercle dans les quatre directions, création centrée combinée à Maj, conservation des proportions, redimensionnement centré et limites de feuille, lignes inversées/angles, texte, déplacement solidaire des groupes, identifiants indépendants de copie, absence de poignées au rendu imprimable et annulation sans doublon.

## Résultats

73 tests passent, dont 9 tests dédiés aux transformations. Leur premier lancement a échoué en l'absence du module de géométrie, avant l'implémentation. La compilation Vite réussit. Au navigateur, une feuille fictive sur une origine locale séparée a servi à créer un rectangle, le redimensionner par son angle, annuler/rétablir sa taille, puis agrandir un texte libre de 18 à 32 px. Les combinaisons de modificateurs sont vérifiées par les tests de géométrie. Les poignées conservent leur taille à l'écran lorsque le zoom change.
