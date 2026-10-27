# Sélection multiple

1. Tester les fonctions de sélection, de déplacement commun et de duplication.
2. Ajouter le cadre de sélection et Maj + clic au contrôleur du pointeur.
3. Afficher les contours et le nombre d'objets sélectionnés ; appliquer déplacement, style et suppression à l'ensemble.
4. Vérifier le navigateur, l'historique et la compilation.

Un glissement sur le fond avec l'outil Sélection encadre les objets entièrement contenus. Maj + clic ajoute ou retire un objet ; Maj + cadre complète la sélection. Dans un groupe ouvert, seuls ses composants sont candidats. Un clic sur un objet déjà sélectionné conserve l'ensemble pour le déplacer. Un clic ailleurs ou Échap désélectionne.

Alt maintenu au début du glissement d'un objet sélectionné duplique toute la sélection. Les identifiants des groupes et enfants sont renouvelés ; les liens internes se rattachent aux copies. Les relations entre deux éléments copiés sont emportées, même si elles n'avaient pas été sélectionnées explicitement. Les liens attachés suivent leurs extrémités et ne se déplacent pas indépendamment. Un Alt-clic sans déplacement ne duplique rien.

Le déplacement conserve les distances entre objets et limite l'ensemble aux marges de la feuille. Une transformation, une duplication, un changement de style ou une suppression multiple représente une seule action annulable. Les poignées individuelles réapparaissent lorsqu'il ne reste qu'un objet sélectionné.

## Vérification

79 tests passent, dont 6 dédiés à la sélection multiple. Vérifications navigateur sur une copie fictive : sélection de deux formes par cadre puis par Maj + clic ; déplacement commun en conservant les distances ; annulation du déplacement ; Alt-clic sans création de copie ; couleur commune ; suppression des deux formes et restauration en une action. La duplication des identifiants, la reconnexion des liens internes, le rendu provisoire sans mutation et l'annulation d'un lot UML sont couverts par les tests automatisés.
