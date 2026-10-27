# Vérification de la première version

## Évolution : plein écran au démarrage

Le 26 octobre 2026, le nouveau dialogue de consignes a été vérifié dans un onglet de test séparé de la copie ouverte : consigne et annonce du retrait de points visibles, acceptation obligatoire, activation du plein écran au clic « Commencer en plein écran », passage à « Évaluation en cours » et bouton « Plein écran actif » désactivé. La session fictive a été terminée et l'onglet fermé. Compilation réussie et 36 tests existants réussis. En cas de refus du plein écran, le code conserve la session en préparation ; ce refus n'a pas été simulé dans le navigateur.

Date : 26 octobre 2026. Environnement : Windows, Node 24.11, aperçu Chromium intégré.

## Contrôles réalisés

- Plan, spécifications, critères d'acceptation et suites initiales écrits avant l'implémentation.
- Échec initial constaté avec `ERR_MODULE_NOT_FOUND` pour les deux modules absents. L'environnement limitant les sous-processus, le runner utilise `--test-isolation=none`.
- 25 tests automatisés réussis : document immuable, historique, import assaini, suivi sans doublon, durées, fin, reprise, horloge qui recule, validation du journal et horodatage du plein écran.
- Compilation Vite/Tailwind de production réussie ; page locale et ressources disponibles, réponse HTTP 200.
- Parcours navigateur : saisie de l'identité et de l'épreuve, gabarits entité BDD et classe UML, ajout d'une seconde feuille, tracé d'un rectangle par glissement du pointeur, annulation (2 objets) puis rétablissement (3 objets), dialogue d'information du suivi, début puis fin de session, édition verrouillée après fin, disponibilité de l'impression après fin.
- Interface inspectée visuellement sur la largeur initiale de l'aperçu (~920 px) et en format bureau 1440 × 1050. Le panneau d'outils passe sous la feuille sur écran intermédiaire.
- Aucune erreur console observée durant les parcours consultés.
- Réservation Web Locks vérifiée : un second onglet affichait « Lecture seule : copie ouverte ailleurs », avec identité, édition, import et démarrage désactivés.
- Structure et géométrie CSS de l'impression relues : une feuille A4 par article, marges dédiées, SVG vectoriel sans grille ni sélection, bilan séparé et tableau pouvant se poursuivre sur plusieurs pages.

## Limites de la recette

- Le bouton d'impression a été déclenché ; le dialogue natif a bloqué l'automatisation de l'aperçu intégré. Aucun PDF final n'a été généré et inspecté. La pagination réelle et les réglages d'en-têtes/pieds de page du navigateur restent à contrôler dans Chrome, Edge, Brave ou Firefox.
- Les confirmations de fin, suppression et remplacement ont ensuite été converties en dialogues HTML accessibles. Cette dernière adaptation a été vérifiée syntaxiquement et par compilation ; son parcours complet n'a pas été rejoué dans l'aperçu bloqué.
- L'ouverture d'un second onglet en arrière-plan dans l'aperçu intégré n'a pas reproduit un changement d'onglet utilisateur ; aucune détection réelle de minimisation ou de changement d'onglet n'est présentée comme validée. Ces transitions sont testées dans la machine d'état et doivent aussi être vérifiées sur un navigateur classique.
- Le rechargement tenté pendant la session n'a pas confirmé une navigation effective dans l'aperçu. La reprise est vérifiée au niveau de la machine d'état, pas de bout en bout dans le navigateur.
- Stylet, vrai appareil tactile, zoom du navigateur à 200 %, impression d'un journal long et échec de quota localStorage restent à tester manuellement. La gestion des erreurs correspondante est implémentée.
- Aucun serveur, authentification, journal distant ou contrôle du poste n'est fourni. Le fonctionnement concurrent de plusieurs onglets sur la même copie n'est pas pris en charge.

La matrice complète de recette figure dans `ACCEPTANCE.md`. Les critères non exercés ne doivent pas être interprétés comme validés automatiquement.
