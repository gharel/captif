# Connexions et routage orthogonal

## Plan et contrat

1. Tester les ports, l'attachement, le suivi des déplacements et le routage indépendamment du pointeur.
2. Ajouter les métadonnées de connexion au document et les préserver à l'export, à l'annulation et à la duplication.
3. Afficher quatre points d'accroche avec les outils Ligne et Flèche. Un départ ou une arrivée près d'un point s'y attache ; un dépôt ailleurs reste libre.
4. Recalculer les connexions à l'écran et à l'impression après déplacement ou redimensionnement d'une forme. Les poignées d'extrémité permettent de reconnecter ou détacher un côté.
5. Tester au navigateur, puis compiler.

Les nouveaux traits et flèches utilisent des segments horizontaux et verticaux. Le routeur contourne les rectangles englobants des formes et textes avec une marge ; il pénalise aussi les segments déjà occupés par d'autres connexions. Les cadres de système et fragments UML ne sont pas traités comme des obstacles pleins. Les notations spécialisées BDD/UML gardent leur propre logique.

Les points d'accroche et le chemin calculé sont des aides d'édition : seuls les références, les côtés choisis et les coordonnées libres sont sauvegardés. Supprimer une forme retire ses connexions ; dupliquer plusieurs formes reconnecte leurs liens internes aux copies. Les lignes historiques restent compatibles.

Un passage sans croisement n'est pas toujours possible, notamment avec des formes superposées, des ports communs ou des éléments qui ferment tout un passage. Dans ce cas le routeur privilégie un détour orthogonal avec le moins d'obstacles possible ; il ne déplace pas les formes de l'étudiant.

## Vérification

94 tests passent, dont 9 tests de connexions. Ils couvrent les ports, le contournement d'un obstacle, le suivi de déplacement et redimensionnement, la reconnexion/déconnexion, les métadonnées JSON, la suppression et duplication, les connexions concurrentes, les poignées, ainsi que le rendu imprimable sans points d'accroche.

Au navigateur, trois rectangles fictifs ont servi à tracer une flèche entre les deux rectangles extérieurs en contournant celui du centre. La forme d'arrivée a été déplacée, le déplacement annulé puis rétabli, et la forme redimensionnée : l'extrémité a suivi à chaque fois. La poignée d'arrivée a ensuite été rebranchée sur le point supérieur du rectangle central. Les essais utilisent une origine locale distincte de la copie de l'utilisateur.
