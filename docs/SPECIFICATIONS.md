# Captif — spécifications fonctionnelles et techniques

Statut : contrat de la première version locale, rédigé avant l’implémentation.

## Objectif

Fournir aux étudiants une copie numérique proche du papier et du stylo pour les évaluations de bases de données, UML et matières similaires. Le travail combine texte, dessin libre et formes sur plusieurs feuilles A4. La copie et un bilan de session peuvent être imprimés avec la destination « Enregistrer au format PDF » du navigateur.

L’application fonctionne dans le navigateur sans compte, serveur, transfert de copie ou service d’IA. Le suivi est informatif : il ne bloque pas le système et ne constitue pas une preuve de fraude.

## Parcours

1. Saisir le nom de l’étudiant et le titre de l’évaluation.
2. Lire la consigne de rester dans la fenêtre et en plein écran, avec annonce d'un retrait de points en cas de sortie. Accepter les consignes puis activer le plein écran au clic sur Commencer. Le suivi démarre après activation réussie ; un refus laisse la session en préparation. Les limites techniques sont documentées hors du dialogue de démarrage.
3. Écrire ou dessiner, ajouter des feuilles, naviguer entre elles et corriger le travail.
4. Consulter à tout moment le nombre d’absences et leur durée cumulée.
5. Terminer la session pour figer le suivi, puis imprimer la copie et le bilan.

Une session terminée conserve sa copie et ses exports. Une nouvelle session ne doit pas écraser silencieusement une copie existante.

## Copie et édition

- Document identifié par une version de format, une identité, un titre, une liste ordonnée de pages et les données de session.
- Au moins une page existe toujours. La page courante est clairement indiquée.
- Chaque feuille conserve des coordonnées logiques constantes au format A4 ; l’affichage peut être réduit sans modifier les positions enregistrées.
- Outils : sélection et déplacement, stylo à main levée, rectangle, ellipse, ligne, flèche et texte. Le texte accepte plusieurs lignes afin de représenter classes UML, attributs et entités BDD.
- Couleur et épaisseur des traits sont réglables ; les formes restent lisibles à l’impression.
- Les objets peuvent être sélectionnés, déplacés et supprimés. Les actions de création, déplacement et suppression sont annulables et rétablissables. Une nouvelle action après annulation efface la branche de rétablissement.
- Les événements de pointeur prennent en charge souris, stylet et interaction tactile. Une interaction annulée ne doit pas laisser un objet incohérent.
- Le texte saisi est traité comme du contenu, jamais comme du HTML exécutable.
- Des gabarits d’entité BDD et de classe UML regroupent le cadre et le texte éditables. Un clic sélectionne et déplace le groupe entier ; un double-clic entre dans le groupe. Un double-clic sur un texte ouvre un éditeur directement sur la feuille, validé par Ctrl/Cmd+Entrée ou Enregistrer et annulé par Échap. Un inspecteur conserve les propriétés et les actions clavier. Le numéro étudiant est retiré du modèle propre et des rendus. Les critères détaillés de cette évolution sont dans UX_UPDATE.md.
- Une suppression de page non vide demande une confirmation. La dernière page ne peut pas être supprimée.

## Suivi de session

La collecte commence au démarrage explicite et s’arrête à la fin explicite. Les événements d’interface antérieurs ne créent pas d’absences.

Signaux observés :

| Signal | Observation rapportée | Limite |
| --- | --- | --- |
| `visibilitychange` | Page masquée ou visible | Ne distingue pas changement d’onglet, minimisation et autres causes |
| `blur` / `focus` | Perte et retour du focus de la fenêtre | Peut correspondre à une boîte de dialogue ou à l’interface du navigateur |
| `fullscreenchange` | Entrée ou sortie du plein écran | Le plein écran est volontaire, dépend du navigateur et n’enferme pas l’utilisateur |

Une absence débute quand la page est masquée **ou** que la fenêtre perd le focus. Elle se termine uniquement lorsque la page est visible **et** la fenêtre a le focus. Plusieurs signaux recouvrant le même intervalle produisent une seule absence ; leurs durées ne s’additionnent pas. Les causes observées peuvent être conservées dans le journal sans être interprétées.

Les durées utilisent des horodatages réels plutôt que le nombre de déclenchements d’un intervalle, car les onglets masqués ralentissent les minuteries. Une absence ouverte est incluse dans le cumul affiché. La fin de session clôt toute absence ouverte à l’heure de fin. La durée d’absence ne peut pas dépasser la durée de session, ni devenir négative.

Le journal présente début, fin, durée et signaux de chaque absence, ainsi que les sorties du plein écran. Une sortie du plein écran visible et focalisée n’est pas automatiquement une absence. Une impression explicitement demandée dans l’application est signalée comme telle, afin qu’un évaluateur puisse contextualiser une éventuelle perte de focus.

Le rechargement conserve la session et tout intervalle déjà ouvert. La reprise signale l’intervalle d’interruption avec la raison « rechargement », sans inventer un changement d’onglet ou une minimisation. Si cette interruption recouvre une absence existante, elle reste une seule absence. L’application ne prétend pas connaître le comportement de l’étudiant pendant son arrêt. Un stockage modifiable par l’utilisateur ne permet aucune garantie d’intégrité du journal.

## Sauvegarde et interchange

- Sauvegarde automatique locale de la copie et de la session après modifications significatives.
- Reprise au prochain chargement avec message explicite. Un échec de lecture ou d’écriture est affiché sans interrompre l’édition.
- Export JSON du document complet pour sauvegarde et transmission manuelle.
- L’import et l’export JSON sont disponibles hors session active, afin de ne pas remplacer la copie ni déclencher de dialogue de fichier pendant l’évaluation. La sauvegarde automatique reste active.
- Import JSON avec contrôle du format, de la version, des champs et des coordonnées. Un fichier invalide est rejeté sans modifier la copie courante. Remplacer une copie existante requiert une confirmation.
- La sauvegarde dépend du navigateur et de son profil. Effacer les données du site, naviguer en privé ou changer d’ordinateur peut la rendre indisponible. Le JSON est le moyen de conservation portable.
- Aucune navigation externe, publicité, police distante ou télémétrie n’est nécessaire pendant l’évaluation.
- Une réservation Web Locks, lorsque l'API est disponible, limite l'édition à un seul onglet de l'origine pour éviter l'écrasement concurrent. Un doublon affiche une explication et reste en lecture seule. Fermer l'éditeur puis recharger le doublon pour reprendre.

## Impression

L’action d’impression ouvre la boîte de dialogue native ; elle ne promet pas de télécharger directement un PDF. Chaque feuille devient une page A4 sans barre d’outils ni panneau de contrôle. L’identité, le titre et la pagination figurent sur la copie. Un bilan séparé indique dates, durée, absences, sorties du plein écran et limites du suivi. Les objets vectoriels et les retours à la ligne du texte sont conservés.

## Interface et accessibilité

Interface en français, zone de travail dominante et commandes regroupées par fonction. Les outils ont un nom accessible et un état sélectionné perceptible autrement que par la couleur. Les commandes principales sont utilisables au clavier avec un focus visible. Les raccourcis de suppression et d’annulation n’interceptent pas une saisie dans un champ de texte. Les messages d’enregistrement et d’erreur sont annoncés sans déplacer le focus.

Le dessin précis nécessite un pointeur ; cette limite est documentée. Le texte et les commandes restent accessibles au clavier. La mise en page s’adapte aux écrans étroits sans perdre les actions de sauvegarde ou de fin de session.

## Architecture

Projet JavaScript ESM avec Vite, Tailwind via son plugin Vite, dépendances verrouillées et scripts documentés.

- Modèle du document : opérations pures, coordonnées, historique et validation de l’import.
- Suivi : machine d’état indépendante du DOM, horloge injectable et calcul des intervalles.
- Persistance : sérialisation et gestion explicite des erreurs de stockage.
- Interface : rendu des feuilles SVG, contrôleurs de pointeur et formulaires.
- Impression : styles dédiés et génération du bilan à partir du même état.

Les tests déterministes couvrent d’abord les règles du modèle et du suivi. Les tests de parcours couvrent ensuite dessin, sauvegarde, reprise, import et impression. La validation minimale avant livraison est : tests réussis, compilation de production réussie et contrôle visuel de l’interface et de l’aperçu d’impression lorsque le navigateur de test est disponible.

Contrat des modules testés : modèle immuable exposant `createDocument`, `addPage`, `removePage`, `addElement`, `updateElement` et `removeElement` ; historique pur avec `past`, `present`, `future` ; suivi créé par `createMonitor({ now, onChange })`, avec `start`, `signal`, `finish` et `snapshot`. Un signal `focus` ou `visibility` vrai signifie le retour de cette condition. Une absence ouverte porte une fin `null`. La suppression de la dernière page retourne le document sans modification.

## Hors périmètre

Authentification, serveur d’examen, surveillance de l’écran, caméra, verrouillage du poste, détection d’applications tierces, notation automatique, collaboration en temps réel et journal infalsifiable. Pour une évaluation exigeant une restriction effective du poste, une infrastructure administrée distincte reste nécessaire.
