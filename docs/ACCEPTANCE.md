# Critères d’acceptation — Captif

Ces critères sont rédigés avant le développement. Les cas automatisables doivent être exécutés avec une horloge contrôlée ; les cas navigateur sont vérifiés sur le résultat construit.

## Modèle et édition

| Réf. | Scénario | Résultat attendu |
| --- | --- | --- |
| D01 | Créer une copie | Une feuille existe, avec identité et titre modifiables |
| D02 | Ajouter puis supprimer une feuille | Ordre et page courante cohérents ; impossible de supprimer la dernière |
| D03 | Créer chaque type d’objet | Stylo, rectangle, ellipse, ligne, flèche et texte possèdent des coordonnées finies |
| D04 | Déplacer puis supprimer un objet | Les autres objets et pages ne changent pas |
| D05 | Annuler puis rétablir création, déplacement, suppression | L’état précédent puis l’état suivant sont restaurés |
| D06 | Annuler puis effectuer une nouvelle action | La branche de rétablissement est vide |
| D07 | Saisir du texte multiligne et des balises HTML | Les lignes sont conservées et les balises restent du texte inerte |
| D08 | Dessiner après réduction visuelle de la feuille | Les coordonnées et l’impression restent proportionnées |
| D09 | Annuler une interaction de pointeur | Aucun objet invalide ou geste bloqué ne subsiste |

## Suivi déterministe

| Réf. | Scénario | Résultat attendu |
| --- | --- | --- |
| S01 | Perdre le focus avant démarrage | Zéro absence, aucune durée collectée |
| S02 | Démarrer à 0, perdre le focus à 1 s, revenir à 4 s | Une absence de 3 s |
| S03 | `blur` à 1 s, masqué à 2 s, visible à 5 s, focus à 6 s | Une absence de 5 s, sans double compte |
| S04 | Masqué à 1 s, focus à 2 s alors que toujours masqué, visible à 4 s | Une absence de 3 s |
| S05 | Émettre plusieurs fois le même signal | Aucun doublon d’absence |
| S06 | Ouvrir une absence et consulter le cumul avant retour | Le temps écoulé de l’absence ouverte est inclus |
| S07 | Terminer pendant une absence | L’absence est clôturée à l’heure de fin ; les événements suivants sont ignorés |
| S08 | Quitter le plein écran en restant visible et focalisé | Une sortie du plein écran, zéro absence |
| S09 | Répéter des sorties et retours du plein écran | Seules les transitions de sortie effectives sont comptées |
| S10 | Simuler un grand intervalle sans déclenchement de minuterie | Le calcul repose sur les horodatages, pas sur le nombre de ticks |
| S11 | Reprendre une session enregistrée | Copie et intervalle déjà ouvert conservés ; interruption signalée « rechargement » sans double compte ni cause inventée |
| S12 | Consulter les statistiques à des bornes temporelles | Aucune durée négative ni supérieure à la session |

## Persistance et sécurité du contenu

| Réf. | Scénario | Résultat attendu |
| --- | --- | --- |
| P01 | Enregistrer puis recharger | Texte, formes, ordre des pages et identité sont identiques |
| P02 | Exporter puis importer dans une copie vide | Le document utile est identique |
| P03 | Importer JSON cassé, version inconnue, objets mal formés ou coordonnées non finies | Rejet explicite, copie courante intacte |
| P04 | Refuser le remplacement lors d’un import | Aucun changement de copie |
| P05 | Simuler quota atteint ou stockage interdit | Erreur visible, édition et export manuel encore possibles |
| P06 | Charger une sauvegarde corrompue | Message compréhensible, pas de plantage ni écrasement silencieux |
| P07 | Examiner les actions pendant une session active | Import et export JSON indisponibles ; sauvegarde automatique maintenue |

## Parcours navigateur et impression

| Réf. | Scénario | Résultat attendu |
| --- | --- | --- |
| U01 | Parcourir les commandes au clavier | Labels accessibles, focus visible, activation possible |
| U02 | Utiliser suppression ou annulation dans un champ de texte | Aucun objet supprimé et aucun historique de dessin déclenché par erreur |
| U03 | Démarrer puis changer d’onglet et revenir | Compteur et journal cohérents ; cause affichée sans supposer minimisation ou onglet |
| U04 | Demander le plein écran puis le quitter | Entrée volontaire, sortie enregistrée pendant la session |
| U05 | Imprimer une copie de plusieurs feuilles | Une page A4 par feuille, puis bilan ; aucune commande à l’impression |
| U06 | Imprimer schémas et texte multiligne | Aucun objet coupé par les marges de la zone utile ; traits et texte lisibles |
| U07 | Terminer la session puis imprimer | Compteurs figés pendant la boîte de dialogue PDF |
| U08 | Ouvrir sur un écran étroit | La feuille reste consultable et les commandes essentielles accessibles |
| U09 | Consulter l’information de suivi | Limites techniques et sauvegarde locale expliquées avant démarrage |

## Livraison

- Les tests exécutés et leurs résultats sont consignés dans le compte rendu de livraison.
- La compilation de production doit réussir.
- Le README décrit installation, lancement, tests, export PDF et limites du suivi.
- Si un contrôle navigateur ou impression ne peut pas être réalisé, cette limite est signalée explicitement ; elle ne peut pas être présentée comme validée.
