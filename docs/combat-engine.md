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
- Tests automatisés Node.js : `node --test tests/*.test.js` (moteur, runtime, techniques et IA ennemie).
- Workflow GitHub Actions : `.github/workflows/combat-tests.yml`.
- Banc de test navigateur : ouvrir `prototype/combat-tests.html` depuis un serveur HTTP local ou après déploiement.

La suite de tests automatisés couvre les calculs physiques et magiques, les limites de résistance, les coups critiques, la qualité d'exécution, les boucliers, les soins, les effets périodiques, la purification, les modificateurs, l'absorption du feu, les prérequis d'armes, la résolution d'attaque, les transitions de l'IA, les fenêtres de télégraphie, la récupération, l'interruption et la défaite. Les tests de réaction couvrent aussi la diminution des contrôles répétés afin d'éviter les stun-locks, ainsi que le lancement aérien : trajectoire ascendante et descendante, atterrissage, maintien au sol, puis relevée progressive. Ils utilisent des données artificielles destinées à vérifier les invariants, pas à fixer l'équilibrage final.

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
- Les attaques du joueur ciblent la cible la plus proche à portée ; les attaques sur le pillard l'interrompent temporairement. Une mise à terre le maintient au sol pendant sa durée de contrôle, puis une phase de relevée progressive le rend à nouveau mobile. Les contrôles répétés sur une même cible perdent progressivement en durée et en puissance ; après plusieurs contrôles rapprochés, les mises à terre et lancements sont ramenés à un simple étourdissement. Cette protection se réinitialise après une période sans contrôle. Le deuxième coup du combo agit comme un lanceur : la cible suit une courte trajectoire aérienne, retombe, reste vulnérable au sol, puis se relève.

Limites connues de cette intégration :
- Le mannequin reste une cible d'entraînement immobile ; le pillard est un prototype d'IA simple, sans tactiques de groupe ni adaptation.
- Les valeurs de dégâts, coûts d'endurance, durées, statistiques de démonstration et distances sont provisoires.
- Le joueur de démonstration commence avec des statistiques simplifiées ; la fiche de personnage et la progression réelle ne sont pas encore branchées.
- Les contrôles du joueur sont raccordés aux animations disponibles ; les mouvements d'attaque du pillard restent représentés par la télégraphie et la résolution des dégâts, sans animation dédiée.
- Une passe Chromium headless a validé WebGL, le chargement du modèle, le passage créateur → jeu, l'apparition du HUD, les trois coups du combo sur une même cible, le finisher avec mise à terre, ainsi que l'attaque ennemie, l'esquive et la parade/contre-attaque, sans erreur JavaScript dans la console. Les captures ont été générées, mais la revue esthétique image par image reste à faire.
- Les tests CI valident la syntaxe JavaScript et les fonctions du moteur/runtime/IA ; ils ne certifient pas la qualité visuelle finale ni les animations dédiées.


## Signatures de réaction par catégorie d'arme

Le module expose `applyWeaponHitProfile` pour différencier les réactions après résolution de l'impact : épée (contrôle équilibré), hache (déséquilibre plus marqué), marteau (étourdissement prolongé et impact lourd) et arme d'hast (projection/recul supérieur). Le profil est appliqué uniquement si une attaque physique fournit explicitement `weaponCategory`; sans catégorie, le comportement reste neutre. Ces coefficients sont des valeurs techniques provisoires, pas un équilibrage officiel. Le prototype ne possède pas encore d'équipement d'arme réellement sélectionnable : l'intégration est donc prête à recevoir cette donnée, sans attribuer arbitrairement une arme au personnage.


## Équipement d'arme raccordé au runtime

Le runtime permet maintenant d'équiper/déséquiper une arme physique avec une catégorie validée (épée, hache, marteau, arme d'hast). L'équipement est refusé si la force physique ou la maîtrise de cette catégorie est insuffisante ; un refus conserve l'arme précédemment équipée. Une attaque utilise automatiquement la puissance et la catégorie de l'arme équipée, sauf surcharge explicite de l'attaque. Les utilisations sont comptabilisées au total et par catégorie pour préparer la progression de maîtrise. Aucun gain numérique de maîtrise n'est attribué automatiquement : la courbe de progression et les seuils restent à définir officiellement.


## Correctifs d'interface et de navigation

Le panneau de combat utilise une grille à deux colonnes avec des largeurs minimales explicites, des boutons qui peuvent revenir à la ligne et un défilement interne lorsque la hauteur disponible est faible. Sa largeur tient compte des marges de l'écran sur mobile afin d'éviter tout débordement horizontal ou superposition des commandes. La navigation clavier/manette inclut désormais les listes déroulantes de personnalisation ; les flèches haut/bas restent disponibles pour choisir leurs options. La perte de focus de la fenêtre libère les touches de déplacement afin d'éviter un mouvement bloqué après un changement d'application.


## Progression de maîtrise des armes — première courbe jouable

Le module `WeaponProgression.js` définit une première courbe de jeu : chaque catégorie (épée, hache, marteau, arme d'hast) progresse indépendamment sur 100 rangs. Chaque attaque exécutée avec une arme donne de l'expérience à sa catégorie : légère 1 XP, lourde 1,5 XP, chargée 1,75 XP, finisher 2 XP, spéciale 2,25 XP et aérienne 1,5 XP. Une attaque refusée ne donne aucun gain.

Le rang suivant coûte 12 XP au rang 0, puis le seuil augmente de 2 XP par rang. Le rang 100 demande 11 100 XP cumulés. Les catégories ne partagent pas leur expérience. Les prérequis de force physique et de maîtrise restent indépendants : atteindre la maîtrise requise ne remplace jamais la force nécessaire pour manier l'arme.

Huit techniques par catégorie se débloquent automatiquement aux rangs 3, 8, 15, 25, 40, 60, 80 et 100. Chaque technique possède sa propre maîtrise, qui progresse à chaque utilisation valide : paliers cumulés à 3, 8, 15, 25 et 40 utilisations. Chaque rang de technique augmente ses dégâts de 2 % et réduit son coût d'endurance de 2 %, avec un plafond de 10 % pour chacun. Une technique verrouillée ne peut pas être exécutée. Cette courbe est un premier équilibrage jouable destiné à être mesuré puis ajusté.
