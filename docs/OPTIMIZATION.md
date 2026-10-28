# Fiabilité, performances et atelier

Plan : (1) tests de reprise d'un brouillon et des caches/ordonnanceurs ; (2) brouillon séparé de la copie, sauvegarde légère de session et reprise contrôlée ; (3) caches bornés de coloration, géométrie par page immuable, miniatures incrémentales, rendu des gestes à la cadence écran ; (4) suppression des branches mortes et consolidation des styles ; (5) bibliothèque divisée entre formes et connexions, propriétés contextuelles et colonnes rétractables ; (6) tests, recette sur copie fictive et publication.

Critères d'acceptation :
- Recharger pendant la saisie restaure texte, langage et format sans valider le document ; Échap retire le brouillon, valider produit une action annulable. Un brouillon d'une autre copie ou d'un champ modifié n'est jamais appliqué.
- Le suivi conserve les observations et sa dernière date avec un battement léger, sans réécrire la copie chaque seconde. Les copies anciennes restent lisibles.
- Les pages inchangées conservent leurs miniatures DOM. Les caches sont bornés ou faibles ; une modification de contenu invalide le calcul. Les points du stylo sont tous conservés même si plusieurs mouvements arrivent entre deux images.
- Les formes et connexions restent accessibles simultanément à 1280 × 720, uniquement par icônes et infobulles. Sélectionner ne décale pas la bibliothèque. Les colonnes peuvent être réduites sans masquer leur commande de réouverture.
- L'éditeur reste sur la feuille ; sa taille libre est réglable et ses commandes restent dans l'espace visible. L'impression reste dépourvue de commandes.

Conserver les validateurs, modèles BDD/UML historiques et l'historique immuable ; supprimer seulement les parcours de création par formulaire devenus inaccessibles. La mise à jour partielle du SVG des gestes sera limitée aux composants dont le rendu change, en conservant la capture du pointeur sur la feuille.

Implémentation : cache faible des pages résolues et miniatures, cache LRU de 32 colorations/tokens, regroupement des peintures avec `requestAnimationFrame` sans supprimer les échantillons du stylo. Le brouillon est écrit 150 ms après la saisie et vidé lors des événements de sauvegarde/fermeture ; il est retiré par Échap ou validation. La taille libre utilise les limites communes 12–32 px du validateur. Les zones monospace utilisent le même nombre de colonnes que le repli SVG ; les compartiments Arial conservent une approximation de largeur des glyphes.

Recette locale sur copie fictive : récupération après rechargement du code et du langage SQL, validation puis annulation ; reprise d'un texte multiligne en gras à 24 px ; réduction/réouverture des deux colonnes et zoom à 100 % ; navigation des icônes par flèches et infobulle au focus ; déplacement d'une entité avec suivi de son lien ERD ; rectangle de 180 × 100 et stylo avec conservation des échantillons ; réorganisation du diagramme. Aucun parcours effectué dans la copie de l'origine 127.0.0.1. Captures : `screenshots/optimized-workspace.png` et `screenshots/recovered-draft.png`.
