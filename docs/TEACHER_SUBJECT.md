# Sujet PDF déposé par l'enseignant

Statut : implémenté le 6 novembre 2026.

## Besoin

L'enseignant fournit les consignes de l'évaluation sous forme d'un PDF, lisible par l'étudiant dans Captif pendant l'épreuve. Captif est statique, sans serveur : le sujet est déposé **sur chaque poste**, dans le navigateur, depuis une page enseignant protégée par mot de passe. Un seul sujet existe à la fois. Un nouveau dépôt remplace l'ancien, sans historique.

## Parcours

1. Le bouton « Ajouter les consignes » (« Remplacer les consignes » si un sujet existe), sous le titre de l'évaluation, ouvre `enseignant.html`. Il est masqué pendant une session active.
2. Un écran « Accès réservé » demande le mot de passe. Le reste de la page est `inert`. Le déverrouillage reste **en mémoire seulement** : un rechargement ou « Verrouiller » redemande le mot de passe. Rien n'est retenu sur le poste de l'étudiant.
3. La page enseignant présente le sujet actuel (nom, pages, taille, date de dépôt, début d'empreinte), « Déposer un sujet PDF », « Retirer le sujet » et un aperçu. Remplacer ou retirer un sujet existant demande une confirmation.
4. En préparation, l'étudiant voit seulement « Sujet déposé : nom.pdf · N pages. Il s'affichera au démarrage de l'évaluation. » Le contenu n'est pas lisible avant le démarrage.
5. Au démarrage, le panneau « Sujet » s'ouvre à côté de la feuille. À 100 %, chaque page occupe la largeur du panneau, sans ascenseur horizontal. L'en-tête indique la page courante (« PAGE 1 / 2 »). Zoom − / + ou Ctrl + molette ; un clic sur le pourcentage revient à 100 %, en gardant la position de lecture. Une poignée sur le bord droit règle la largeur du panneau (glisser, flèches gauche/droite, Maj pour aller plus vite, Début/Fin, double-clic pour la largeur par défaut). La feuille garde au moins 360 px ; la largeur choisie est mémorisée sur ce navigateur. Le panneau se replie. Il reste consultable après la fin de la session. Aucune commande de la copie ne remplace ni ne retire le sujet.
6. Au démarrage, la copie enregistre une référence au sujet : nom, empreinte SHA-256 et nombre de pages. Le bilan imprimé l'affiche. Le PDF n'est ni exporté dans le JSON ni imprimé.

## Choix techniques

- Rendu par pdf.js (`pdfjs-dist`), servi par l'application et chargé à la demande. Le rendu en canvas reste dans le document : cliquer dans le sujet ne fait pas perdre le focus de la fenêtre, donc ne crée pas d'absence. Pas de barre native Imprimer / Télécharger, pas de liens actifs, pas d'évaluation de code, pas de polices ni de tables distantes.
- Stockage IndexedDB, base `captif-subject-v1`, magasin `subject`, une seule clé `current`. localStorage est trop petit pour un PDF.
- Fichier accepté : 20 Mo au plus, non vide, en-tête `%PDF-`, ouvrable par pdf.js. Un fichier refusé laisse le sujet existant intact.
- Un enregistrement relu invalide n'est pas affiché ni effacé silencieusement : l'enseignant peut le retirer.
- `BroadcastChannel('captif-subject')` prévient l'onglet de la copie après un dépôt ou un retrait.
- Mot de passe : empreinte PBKDF2-SHA-256 (sel aléatoire, 600 000 itérations) en dur, comme les autres outils Skazy Formation. `npm run mot-de-passe` calcule une nouvelle empreinte. Le mot de passe n'apparaît jamais en clair.
- Après chaque mot de passe incorrect, la saisie est bloquée 1 minute, puis 5 minutes, 15 minutes, puis 1 heure pour chaque échec suivant. Le blocage n'est jamais définitif : sur un poste d'étudiant, il empêcherait l'enseignant de déposer le sujet. Le bon mot de passe remet le compte à zéro. Clé `captif-teacher-failures`.

## Limites

La page enseignant est une porte dissuasive, pas une authentification : le site et ses fichiers sont publics, et le blocage est gardé dans ce navigateur. Effacer les données du site efface aussi le sujet et la copie. Le sujet doit être déposé sur chaque poste.

## Critères d'acceptation

- Sans mot de passe correct, aucune commande de dépôt ou de retrait n'est atteignable.
- Un dépôt valide remplace l'unique sujet ; l'ancien n'est conservé nulle part.
- Un fichier non PDF, vide, trop lourd ou illisible est refusé, et le sujet existant reste intact.
- L'étudiant ne lit pas le sujet avant le démarrage ; il le lit pendant et après la session.
- Cliquer, faire défiler ou zoomer dans le sujet ne crée aucune absence.
- Le JSON exporté et le bilan imprimé contiennent la référence au sujet, jamais le PDF. Une copie sans référence reste importable.
- Aucun appel réseau ajouté.
- À 100 %, aucun ascenseur horizontal, au chargement comme après un redimensionnement ; au-delà de 100 %, le bord gauche des pages reste accessible.
- Le thème sombre de la copie est inchangé : la page enseignant a sa propre feuille (`teacher-page.css`) et ne partage aucun module CSS avec la copie, sinon Vite charge le bloc commun avant `atelier.css`.

## Vérification

Le 6 novembre 2026, sur la version compilée servie par `npm run preview` (origine locale distincte, Chromium sans interface, copie et PDF fictifs, mot de passe de test substitué dans la réponse) : porte affichée et page inerte, blocage d'une minute après un mauvais mot de passe, accès ouvert avec le bon, faux PDF refusé, dépôt d'un PDF de 3 pages puis remplacement par un PDF de 2 pages après confirmation, « Verrouiller » redemande le mot de passe, mention seule en préparation, panneau ouvert au démarrage, aucune absence après clic, défilement et zoom dans le sujet, référence enregistrée dans la copie, repli du panneau, sujet visible après la fin, référence dans le bilan imprimé, aucune requête hors de l'origine, aucune erreur console. Captures : `docs/screenshots/teacher-subject-page.png` et `docs/screenshots/teacher-subject-panel.png`.

Le même jour, ergonomie du panneau : pas d'ascenseur horizontal à 100 % au chargement ni après redimensionnement, indicateur de page qui suit le défilement, zoom 125 % avec bord gauche accessible, retour à 100 % par le pourcentage, poignée glissée (+80 px), bornée par les 360 px de la feuille, flèche gauche (−20 px), double-clic (largeur par défaut), largeur mémorisée. Capture : `docs/screenshots/teacher-subject-panel-ux.png`.

Non vérifié : le vrai mot de passe (inconnu de la recette), Firefox et Safari, un sujet de grande taille, l'aperçu d'impression natif, le geste de pincement sur pavé tactile et la lecture du sujet par un lecteur d'écran (le rendu en canvas n'expose pas le texte du PDF).
