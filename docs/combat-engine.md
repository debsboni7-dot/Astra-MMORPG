# ASTREA — Combat Engine 0.1

## Statut
Noyau technique initial, isolé du prototype 3D. Les formules et coefficients de ce module sont configurables et provisoires. Aucun coefficient de balance n'est déclaré officiellement validé.

## Principes invariants
- Les attributs physiques ne sont pas déduits automatiquement du niveau du personnage.
- Une arme exige simultanément la force physique et la maîtrise de catégorie nécessaires.
- La défense réduit les dégâts avec rendement décroissant ; les résistances élémentaires sont calculées séparément.
- Les boucliers absorbent les dégâts ; les altérations sont résolues séparément.
- Les soins sont plafonnés aux PV maximums.
- Les réapplications de brûlure/gel peuvent prolonger la durée sans empiler l'intensité.
- Les buffs de même statistique/groupe ne s'additionnent pas : la valeur absolue la plus forte prévaut.
- L'absorption/intensification d'une attaque hostile est réservée au feu et exige une maîtrise du feu strictement supérieure à celle de l'attaquant. La fonction actuelle vérifie l'éligibilité et retourne une décision ; le futur contrôleur de combat devra annuler explicitement les dégâts entrants et appliquer les bonus.
- L'immunité doit être représentée explicitement, jamais par une résistance approximativement infinie.

## API
Voir `prototype/src/combat/CombatEngine.js` pour les fonctions pures : calculs physiques/magiques, application de dégâts, soins, boucliers, effets temporaires, purification, modificateurs, absorption de feu, contrôle des prérequis d'armes et résolution d'attaque.

## Vérification
- Tests automatisés Node.js : `node --test tests/*.test.js` (36 tests couvrant le moteur, le runtime et l’IA ennemie).
- Workflow GitHub Actions : `.github/workflows/combat-tests.yml`.
- Banc de test navigateur : ouvrir `prototype/combat-tests.html` depuis un serveur HTTP local ou après déploiement.

Les 36 tests automatisés couvrent les calculs physiques et magiques, les limites de résistance, les coups critiques, la qualité d'exécution, les boucliers, les soins, les effets périodiques, la purification, les modificateurs, l'absorption du feu, les prérequis d'armes, la résolution d'attaque, les transitions de l'IA, les fenêtres de télégraphie, la récupération, l'interruption et la défaite. Ils utilisent des données artificielles destinées à vérifier les invariants, pas à fixer l'équilibrage final.

## À faire avant intégration en production
- Brancher les attributs officiels complets une fois leur liste et leurs règles confirmées.
- Définir les courbes de coefficients par arme, technique et école magique.
- Implémenter résistances/immunités spécifiques aux espèces et aux boss.
- Ajouter un système serveur autoritaire pour les combats multijoueurs ; ne jamais faire confiance au client pour les dégâts PvP.
- Tester les valeurs par simulations PvE/PvP et avec télémétrie.


## Prototype 3D : intégration initiale

Le prototype `prototype/src/main.js` importe `CombatRuntime.js` et `EnemyAI.js`. Il instancie le joueur, un mannequin d'entraînement et un pillard humanoïde construit en primitives 3D. Le HUD affiche les PV du joueur, son endurance, les PV des deux cibles et l'état courant du pillard.

Commandes raccordées :
- `J` / bouton Attaque : frappe physique de démonstration.
- `K` / bouton Feu : projectile de feu de démonstration.
- `L` / bouton Parade : blocage avec fenêtre initiale de parade parfaite.
- `O` / bouton Esquive : esquive avec fenêtre temporaire.
- Bouton Réinitialiser : restaure les PV et l'endurance du joueur, ainsi que les deux ennemis.

IA ennemie actuelle :
- Le pillard passe par approche, télégraphie, attaque, récupération, étourdissement et défaite.
- Un anneau rouge au sol annonce son attaque ; il peut interrompre sa télégraphie s'il est frappé.
- Le joueur peut éviter l'attaque par esquive, la réduire en garde ou l'annuler avec une parade parfaite, qui ouvre une fenêtre de contre-attaque manuelle.
- Les attaques du joueur ciblent la cible la plus proche à portée ; les attaques sur le pillard l'interrompent temporairement.

Limites connues de cette intégration :
- Le mannequin reste une cible d'entraînement immobile ; le pillard est un prototype d'IA simple, sans tactiques de groupe ni adaptation.
- Les valeurs de dégâts, coûts d'endurance, durées, statistiques de démonstration et distances sont provisoires.
- Le joueur de démonstration commence avec des statistiques simplifiées ; la fiche de personnage et la progression réelle ne sont pas encore branchées.
- Les contrôles du joueur sont raccordés aux animations disponibles ; les mouvements d'attaque du pillard restent représentés par la télégraphie et la résolution des dégâts, sans animation dédiée.
- Une passe Chromium headless a validé WebGL, le chargement du modèle, le passage créateur → jeu, l'apparition du HUD, l'attaque ennemie, l'esquive et la parade/contre-attaque, sans erreur JavaScript dans la console. Les captures ont été générées, mais la revue esthétique image par image reste à faire.
- Les tests CI valident la syntaxe JavaScript et les fonctions du moteur/runtime/IA ; ils ne certifient pas la qualité visuelle finale ni les animations dédiées.
