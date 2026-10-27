# Alignement et réorganisation

## Contrat avant implémentation

Les fonctions pures de `src/layout.js` renvoient tous les éléments dans leur ordre d'origine et ne modifient pas leur entrée. Les identifiants, les textes, les styles et les références de connexion sont conservés.

`alignElements(elements, mode)` aligne les boîtes sélectionnées à gauche, au centre horizontal, à droite, en haut, au centre vertical ou en bas. Les modes de distribution répartissent les espacements horizontaux ou verticaux entre au moins trois boîtes en conservant les extrêmes. Les groupes se déplacent avec tous leurs enfants ; les connexions et marques attachées ne sont pas déplacées indépendamment.

`autoLayout(elements)` cherche une disposition lisible dans les marges A4 sans réduire les boîtes ou les caractères. Les connexions définissent des niveaux de lecture ; une grille compacte sert de solution de repli lorsque les niveaux ne tiennent pas. Les cycles restent pris en charge. Les participants de séquence sont alignés sur une même ligne de départ et restent sur des colonnes distinctes. Les messages et marques attachés gardent leurs décalages temporels.

Les frontières de système constituent des ensembles avec leurs boîtes contenues, qui restent à l'intérieur. Les fragments de séquence suivent les participants sans devenir des obstacles pleins. Les traits libres sans références ne fournissent pas de structure de graphe et sont conservés à leur emplacement.

Une opération impossible faute de place ou une distribution qui imposerait des chevauchements lève une erreur française et ne produit aucun résultat partiel. L'interface peut alors laisser la copie intacte. L'interface gère l'annulation comme une seule action.

## Tests attendus

- Six alignements avec tailles différentes et déplacements solidaires des enfants.
- Deux distributions à espacements égaux et refus des espacements négatifs.
- Conservation des liens attachés, des styles et des identifiants, immutabilité.
- Réorganisation de boîtes superposées, graphe dirigé et cycle, marges A4.
- Participants de séquence horizontaux avec offsets inchangés ; frontière et cas contenus.
- Refus de la surcapacité sans suppression ou réduction du contenu.

## Résultat des vérifications

Les dix tests dédiés passent avec le runner Node. Le premier lancement a échoué en l'absence de `src/layout.js`, avant son implémentation. Les essais incluent un groupe effectivement translaté avec son enfant, un cycle d'associations, un fragment de séquence et deux cas d'utilisation initialement superposés dans une frontière. Un texte historique sans largeur explicite est également testé : si son alignement provoque un retour à la ligne qui déborderait en bas, la commande est refusée avant toute modification.

La réorganisation conserve les dimensions actuelles des frontières et fragments. Si une frontière est trop petite pour ses contenus, il faut l'agrandir avant de réorganiser. Les participants restent sur une seule ligne : si leur largeur totale dépasse la feuille, la commande refuse de les répartir sur plusieurs rangées qui changeraient la lecture de la séquence. Les groupes de boîtes n'ont pas besoin d'être tous identiques ; les méthodes de compactage utilisent leurs dimensions réelles.
