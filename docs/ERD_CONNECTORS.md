# Connecteurs ERD en patte d'oie

Plan : tester les cinq variantes, ajouter les marqueurs géométriques aux deux extrémités, vérifier l'édition, le déplacement des entités et la reprise JSON.

Variantes : un-à-un, un-à-plusieurs, un-à-zéro-ou-un, un-à-zéro-ou-plusieurs et plusieurs-à-plusieurs. Les marqueurs sont des traits et cercles, sans cardinalité textuelle préremplie. Chaque marqueur conserve le rôle `uml-marker` et porte un `rowId` `source` ou `target` pour que le routage orthogonal sache sur quel segment le replacer. Les types de relations utilisent le préfixe `erd-` et ne sont pas des messages de séquence.

L'interface expose ces variantes par icônes et infobulles. Il s'agit d'une notation de dessin ; aucune validation sémantique du modèle de données n'est effectuée.
