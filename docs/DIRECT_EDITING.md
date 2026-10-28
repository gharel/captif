# Saisie sur la feuille

Plan : tester le placement des champs au zoom courant, remplacer le panneau flottant par un champ superposé exactement au texte, conserver la mise en forme et le choix de langage dans une barre compacte hors du contenu, puis vérifier les gestes au navigateur avant publication.

Critères : aucune fenêtre ni carte de saisie ; même position, largeur et taille de police que le texte rendu ; titres centrés conservés ; code édité dans son bloc avec coloration immédiate. Un clic ailleurs ou Ctrl + Entrée valide une seule action annulable ; Échap abandonne la saisie. Tab parcourt les compartiments, sauf dans le code où il indente. La copie sauvegardée n'est modifiée qu'à la validation. Le texte SVG édité est masqué pendant la saisie puis rétabli.

Recette effectuée sur localhost avec copie fictive : saisie de code coloré, validation Ctrl + Entrée, retour par Annuler, abandon par Échap ; titre d'entité centré, Tab vers le corps multiligne et annulation des deux modifications. Captures : screenshots/direct-text-editing.png et screenshots/direct-code-editing.png.
