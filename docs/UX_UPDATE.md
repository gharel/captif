# Évolution de l'atelier : édition directe et groupes

## Comportements attendus

- Le numéro étudiant disparaît du formulaire, du modèle propre, du JSON exporté, du nom de fichier et de l'impression. Une ancienne copie contenant ce champ reste lisible ; le champ est éliminé à la validation.
- Un double-clic sur un texte indépendant ouvre un éditeur superposé à la feuille, prérempli avec le contenu existant. L'enregistrement est une action annulable. Échap annule la saisie ; Ctrl/Cmd+Entrée l'enregistre. Les balises restent du texte inerte.
- Les nouveaux gabarits UML et BDD sont des groupes avec un cadre et un texte. Un clic sélectionne l'ensemble ; déplacer le groupe translate les deux composants du même décalage.
- Un double-clic entre dans le groupe. Un second double-clic sur son texte ouvre l'édition directe. Le fil d'Ariane affiche le contexte actif, et une commande explicite ou Échap quitte le groupe.
- Le texte modifié peut agrandir le cadre si nécessaire, dans les limites de la feuille. Le mode groupe permet également de déplacer ou supprimer un composant seul.
- Les anciens gabarits présentant la géométrie et le séparateur caractéristiques des modèles de la première version sont repris en groupes au chargement/import. Les autres dessins restent indépendants, sans association arbitraire.
- La structure de groupe est conservée après sauvegarde, import/export et impression. Il n'y a qu'un niveau de groupe.

## Direction visuelle

Atelier clair gris/indigo, typographie sans serif lisible, icônes SVG cohérentes, barre d'outils flottante et panneaux indépendants. L'inspecteur explique la sélection courante et les raccourcis disponibles. Le contexte de groupe est visible sans changer les couleurs de la copie imprimée.

## Vérifications effectuées

- 36 tests automatisés réussis, dont déplacement immuable d'un groupe, édition/suppression d'enfant, ancien numéro éliminé, migration ciblée des anciens gabarits, validation d'import et rendu provisoire sans doublon.
- Compilation Vite/Tailwind réussie.
- Navigateur : création de classe UML, double-clic d'entrée dans le groupe puis d'édition du texte, enregistrement d'un texte multiligne, sortie du groupe.
- Déplacement réel du groupe : x du cadre et du groupe de 70 à environ 170, texte de 86 à environ 186 ; le décalage de 16 unités est conservé.
- Texte indépendant : éditeur ouvert par double-clic, changement annulé avec Échap sans altérer l'original, changement suivant enregistré avec Ctrl+Entrée.
- Interface inspectée en format bureau, à 920 px et sur mobile 390 px. Pas de débordement horizontal de la page sur mobile. La feuille s'ajuste automatiquement à l'espace disponible, avec zoom manuel et commande Ajuster. Les contrôles d'impression restent soumis aux limites détaillées dans VERIFICATION.md ; pas de nouvelle impression native pendant cette recette.
