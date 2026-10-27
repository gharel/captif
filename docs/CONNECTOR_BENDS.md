# Modifier les coudes des connexions

## Contrat écrit avant l'implémentation

- Une connexion sélectionnée expose des poignées au milieu de ses segments. Les courtes sorties des ports restent automatiques.
- Tirer un segment horizontal le déplace verticalement ; tirer un segment vertical le déplace horizontalement. Une ligne droite peut recevoir un détour en tirant sa poignée centrale.
- La manipulation conserve les extrémités, leurs références aux formes, les côtés choisis et le style.
- Les passages manuels sont stockés dans `waypoints`, une liste de 32 points de feuille au maximum. Le chemin `route` reste calculé et ne se sauvegarde pas.
- Le routeur relie ces passages à angles droits et contourne les obstacles entre eux. Si une forme occupe un passage manuel, le point effectif est repoussé au bord de son obstacle pour conserver un chemin utilisable.
- Déplacer ou redimensionner une forme recalcule ses extrémités tout en conservant les passages manuels. Retirer `waypoints` remet la connexion en routage automatique.
- Les coordonnées restent dans la feuille. Les valeurs non finies et les indices de segment invalides sont refusés.

## Tests attendus

Poignée sur une ligne droite, exclusion des petites sorties des ports, déplacement horizontal/vertical sans diagonale, suivi des formes après réglage manuel, contournement d'un obstacle, limite de feuille, immutabilité de la source et conservation des références/style.
