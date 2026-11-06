# ASTREA — sorts de combat v1

Cette première tranche transforme les neuf écoles de magie en actions de combat jouables dans le prototype Three.js. Les valeurs de dégâts, de mana, de durée et de recharge sont des valeurs de départ de prototype, pas un équilibrage définitif.

## Sorts jouables

| École | Sort | Effet de jeu | Coût mana | Recharge |
|---|---|---|---:|---:|
| Feu | Trait ardent | Projectile, dégâts et brûlure périodique | 8 | 0,9 s |
| Eau | Jet d’eau | Projectile et ralentissement temporaire | 8 | 0,8 s |
| Vent | Onde de vent | Attaque de zone sur les cibles proches et recul | 9 | 1,4 s |
| Terre | Égide de pierre | Bouclier personnel temporaire | 12 | 5 s |
| Glace | Éclat de givre | Projectile et immobilisation temporaire | 9 | 1,2 s |
| Foudre | Arc électrique | Dégâts, décharge périodique et bref étourdissement | 10 | 1,3 s |
| Nature | Sève réparatrice | Soin personnel | 10 | 1,5 s |
| Lumière | Lueur purificatrice | Soin personnel et purification des effets négatifs | 10 | 1,8 s |
| Démoniaque | Ponction démoniaque | Dégâts et vol de vie | 12 | 1,5 s |

## Règles communes

- Mana initiale : 100 ; régénération de combat : 4 points par seconde.
- Un sort interdit à la race, sans cible, en recharge ou sans mana ne consomme pas de mana.
- Le vent touche toutes les cibles d'entraînement dans un rayon de 4,5 m ; les autres sorts offensifs ciblent une seule cible proche.
- Les soins ne peuvent pas être lancés à PV maximum pour éviter de faire progresser artificiellement une école.
- La progression d'école ne gagne de l'expérience que si l'effet du sort a réellement touché, soigné, purifié ou créé un bouclier.
- L'absorption d'une attaque hostile reste exclusivement liée au feu et exige une maîtrise du feu strictement supérieure à celle de l'attaquant.
- Les effets temporaires et boucliers expirent via l'horloge de combat. Brûlure et décharge infligent leurs dégâts périodiquement.

## Commandes et interface

Le sélecteur d'école est affiché dans le HUD. Le bouton tactile MAGIE, Triangle sur manette et K au clavier lancent le sort sélectionné. La barre de mana, le nom de l'école et le temps de recharge sont visibles pendant le jeu. Les écoles interdites par la race sont désactivées dans le sélecteur.

## Limites de cette tranche

Les cibles d'entraînement et l'ennemi du prototype sont les seules cibles connectées. Les projectiles et effets visuels sont des VFX Three.js légers, pas encore des animations d'incantation complètes ni des effets d'assets 3D finaux. Les règles de combat doivent être exécutées et validées côté serveur avant toute mise en multijoueur ; le prototype actuel les exécute localement.
