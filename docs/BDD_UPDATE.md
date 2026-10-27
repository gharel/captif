# Schémas BDD et commandes contextuelles

## Fonctionnement

- Alignement vertical explicite du titre et du sous-titre avec le logo ; les centres mesurés dans le navigateur sont identiques.
- La note du panneau conserve « Votre travail reste sur cet appareil. Le suivi observe le focus et la visibilité. »
- Le panneau latéral de saisie de texte disparaît. Un texte sélectionné propose une barre flottante proche de ses coordonnées, avec modification, taille, couleur et suppression. L'édition directe et ses raccourcis sont conservés.
- L'entité BDD devient une carte structurée : en-tête distinct, colonnes clé / attribut / type / NULL et séparations de lignes. Formulaire éditable avec ajout/suppression de rangs et maximum 12 attributs.
- L'association est un ovale nommé pouvant contenir ses propres attributs.
- Le lien comporte deux cardinalités parmi 0,1 / 1,1 / 0,N / 1,N et un nom. Il peut être libre, ou attaché à deux entités/associations.
- Les références des liens sont conservées au format JSON. Le rendu SVG recalcule les points d'attache, y compris pendant un déplacement provisoire et pour l'impression. Les liens courts côte à côte passent en U ; les libellés possèdent un fond blanc.
- La configuration reste accessible depuis l'inspecteur. Double-clic pour entrer dans un groupe, puis édition de ses textes. La mise en page des cellules BDD conserve une typographie adaptée au tableau.
- Les insertions cherchent une place disponible et demandent d'ajouter une feuille si aucun emplacement ne convient. Les liens attachés se déplacent en suivant leurs extrémités. La suppression d'un élément retire les liens attachés, et reste annulable.

## Recette effectuée

- Les tests de composants BDD ont été écrits et constatés en échec avant l'implémentation. Tests supplémentaires pour routage court et cellule vide ajoutés après observation de problèmes de rendu.
- 47 tests automatisés : données structurées, identifiants préservés, anciennes copies, import assaini, liens mobiles, suppression des liens, routage en U, rendu imprimable et absence de texte fantôme pour les cellules vides.
- Navigateur, origine de test séparée : création de CLIENT et COMMANDE, type INT, clé PK et FK, NULL/NN, choix des cardinalités 0,N et 1,1, ajout d'une association CONTENIR avec attribut quantite.
- Déplacement réel de CLIENT : les chemins SVG du lien changent immédiatement avec la table ; la géométrie de l'autre extrémité est conservée.
- Texte libre : création directement dans l'éditeur, validation par Ctrl+Entrée, apparition de la barre flottante, changement effectif de 18 à 24 px et suppression contextuelle.
- Aucun ancien panneau #text-editor présent. Centres verticaux du logo et du bloc de titre identiques dans le DOM.
- Le PDF natif n'a pas été imprimé à nouveau. L'identité du calcul des liens écran/impression est couverte par test ; les limites de recette PDF précédentes restent applicables.
