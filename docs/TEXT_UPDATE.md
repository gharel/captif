# Zones de texte et lisibilité des traits

1. Écrire les tests des zones de texte, de la persistance des styles, de l'espacement des traits et du suivi imprimé.
2. Ajouter largeur et hauteur aux textes sans modifier les textes historiques qui n'en possèdent pas.
3. Faire redimensionner le cadre par les poignées à police constante, avec retour à la ligne et hauteur minimale adaptée au contenu. Ajouter gras et italique dans les commandes contextuelles.
4. Partager les motifs de traits entre aperçu et rendu ; augmenter leurs espacements avec l'épaisseur. Aligner le bouton de style sur tout le bloc d'outils voisin.
5. Afficher explicitement nombre et durée d'absence sur chaque feuille imprimée et dans le bilan. Retirer la phrase demandée du journal.

La zone de texte garde tout son contenu : elle grandit en hauteur si son texte l'exige ; une modification qui dépasserait la feuille est refusée. La taille des caractères se règle par le menu contextuel. Les retours explicites et les mots sont préservés autant que possible ; un mot plus long que la zone est coupé. L'impression utilise exactement le même retour à la ligne que l'écran.

## Vérifications

85 tests passent, dont 6 nouveaux tests de mise en page, de styles persistants et de suivi imprimé. Le contrat de redimensionnement du texte a été mis à jour dans la suite de transformations. Le test d'impression vérifie les compteurs et la durée sur chaque feuille et dans le bilan, y compris avec plusieurs pages.

Au navigateur, un paragraphe gras et italique réduit avec sa poignée latérale passe à huit lignes tout en restant à 18 px. Le motif mixte à 10 px garde des espaces visibles. Le bouton de style et le bloc d'outils mesurent tous deux 55,33 px dans l'aperçu contrôlé.
