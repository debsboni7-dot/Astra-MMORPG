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
- L'absorption/intensification d'une attaque hostile est réservée au feu et exige une maîtrise du feu strictement supérieure à celle de l'attaquant.
- L'immunité doit être représentée explicitement, jamais par une résistance approximativement infinie.

## API
Voir `prototype/src/combat/CombatEngine.js` pour les fonctions pures : calculs physiques/magiques, application de dégâts, soins, boucliers, effets temporaires, purification, modificateurs, absorption de feu, contrôle des prérequis d'armes et résolution d'attaque.

## Vérification
Ouvrir `prototype/combat-tests.html` dans un navigateur moderne. Les tests utilisent des données artificielles destinées à vérifier les invariants, pas à fixer l'équilibrage final.

## À faire avant intégration en production
- Brancher les attributs officiels complets une fois leur liste et leurs règles confirmées.
- Définir les courbes de coefficients par arme, technique et école magique.
- Implémenter résistances/immunités spécifiques aux espèces et aux boss.
- Ajouter un système serveur autoritaire pour les combats multijoueurs ; ne jamais faire confiance au client pour les dégâts PvP.
- Tester les valeurs par simulations PvE/PvP et avec télémétrie.
