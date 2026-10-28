# Bibliothèque étendue et commandes d'édition

Plan : écrire les tests du catalogue et du formatage, étendre les primitives et relations sémantiques, intégrer leurs icônes et infobulles, ajouter les commandes de texte et d'alignement, puis vérifier la sauvegarde, l'impression et les gestes au navigateur.

Contrats :
- Palette sans catégories sélectionnables ni exemples de réponses. Icônes monocolores simples, vrais noms UML/BDD en infobulle ; les familles restent documentées ici, pas enseignées dans l'interface.
- MCD/MLD : entité/table, association, clés et cardinalités existantes. UML : classes, objets, interfaces, acteurs, cas d'utilisation, séquences, paquetages, états/transitions et activités (début, fin, décision, barres de parallélisme, couloirs).
- Messages : simple, synchrone, asynchrone, retour, auto-appel, création, destruction, trouvé/perdu et variantes graphiques minutée, dérobante et délai dépassé. Ces variantes sont des outils de dessin, sans simulation temporelle.
- Include et extend conservent leurs notations UML. L'exclusion demandée est une convention graphique `«exclude»`, pas une relation normative UML ; ne pas la présenter comme telle. Référence : https://www.omg.org/spec/UML/2.5.1/.
- Gras, italique et souligné sont accessibles dans la boîte d'édition et le menu du texte. Les styles provisoires s'annulent avec Annuler et se valident en une action avec le texte.
- Huit commandes d'alignement/répartition avec icônes et noms accessibles ; proportions et positions des objets restent gérées par la logique existante.
- Toute nouvelle forme reste groupée, vide à l'insertion, validable, sauvegardable, rééditable et imprimable. Les copies existantes restent compatibles.

Recette exécutée sur copie fictive : état et activité, sélection multiple et icônes d'alignement, création d'un paquetage, message minuté sur lignes de vie. Formatage gras/italique/souligné sauvegardé puis relu après rechargement ; annuler une modification provisoire conserve les styles initiaux. Le double-clic conserve les trois styles. Captures : `screenshots/inline-text-format.png`, `screenshots/alignment-icons.png`.
