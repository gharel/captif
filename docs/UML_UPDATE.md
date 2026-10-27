# Bibliothèques UML et styles de tracé

## Contrat fonctionnel

La bibliothèque UML est organisée par diagramme. Chaque élément possède un formulaire adapté, un aperçu de notation dans la palette et une configuration ultérieure depuis les propriétés. Les formes et les textes restent groupés : un clic sélectionne l'ensemble, un double-clic entre dans le groupe ; un double-clic sur un texte permet son édition directe.

| Diagramme | Éléments | Relations |
| --- | --- | --- |
| Classes | Classe, classe abstraite, interface, note | Association, association orientée, agrégation, composition, généralisation, réalisation, dépendance |
| Objets | Instance avec classe et valeurs, note | Lien d'objets, dépendance |
| Cas d'utilisation | Acteur, cas, frontière de système, note | Association, include, extend, généralisation |
| Séquence | Participant avec ligne de vie, activation, fragment alt/opt/loop/par, destruction, note | Message synchrone, asynchrone, retour, auto-message |

Les classes séparent nom, attributs et opérations. Les instances soulignent leur en-tête. Les relations proposent départ, arrivée, nom et, lorsque pertinent, rôles/multiplicités. Les extrémités attachées suivent les déplacements. Les messages proposent une position verticale ; les nouveaux retours inversent par défaut les deux premiers participants et se placent après les messages existants. Les activations et destructions peuvent être attachées à un participant ; la destruction coupe sa ligne de vie.

La section **Style du tracé**, séparée des outils, ouvre une palette de couleurs avec couleur personnalisée, une épaisseur de 1 à 10 px par pas de 1 et quatre motifs : plein, tirets, pointillés et mixte. Un aperçu reflète le choix. Le style s'applique à la sélection et aux prochains tracés ; les relations conservent par défaut leur notation UML. Les styles choisis sont sauvegardés et rendus à l'impression.

## Tests et vérification

Les spécifications de composants et les premières suites UML ont précédé l'intégration. Les tests de styles ont été exécutés en échec avant l'ajout de leur prise en charge. Un test de conservation du style après configuration a également reproduit le défaut avant sa correction.

- 64 tests automatisés : document, suivi, BDD, UML, styles, catalogue, sauvegarde et SVG.
- Vérification navigateur sur une origine locale séparée avec des données fictives : classe et interface reliées par réalisation, objet souligné, système avec acteur et cas d'utilisation, include, participants avec activation et messages.
- Vérification du retour après rechargement : départ Service, arrivée Client, décalage vertical 230, flèche ouverte en tirets rendue sous l'appel.
- Vérification d'un trait violet de 4 px en pointillés et du panneau de style.

Le rendu écran et l'impression emploient le même résolveur SVG. Cette mise à jour ne constitue pas un moteur de validation sémantique UML ; les cadres et notes se disposent manuellement. Référence de notation : [OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1).
