# Plan de réalisation — Captif

1. Écrire les spécifications et les critères d'acceptation avec un sous-agent.
2. Écrire les tests automatisés du document et du journal avec un second sous-agent, avant les modules concernés.
3. Exécuter ces tests avant implémentation pour constater leur échec initial.
4. Initialiser JavaScript ESM, Vite et Tailwind via le plugin officiel Vite.
5. Implémenter le modèle immuable et le suivi déterministe ; faire passer les tests.
6. Construire l'atelier A4 : texte, tracé, formes, flèches, sélection, annulation, pages et sauvegarde locale.
7. Ajouter le cycle de session, le journal visible, la reprise après rechargement et l'impression des pages et du bilan.
8. Vérifier compilation, tests et parcours navigateur ; documenter les limites et les commandes.

## Décisions de périmètre

- Projet local dans le dossier fourni, sans déploiement, authentification ou collecte distante.
- Le navigateur mesure des signaux de focus et de visibilité, sans déduire une application consultée ni distinguer avec certitude un onglet changé d'une fenêtre réduite.
- Une absence qui produit plusieurs signaux compte une seule fois et sa durée n'est jamais doublée.
- Le journal local est informatif, modifiable par un utilisateur technique ; il ne constitue pas un dispositif inviolable d'évaluation.
- Le PDF passe par la boîte d'impression du navigateur : choisir « Enregistrer au format PDF ».
