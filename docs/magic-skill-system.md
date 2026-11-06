# ASTREA — système de magie, règles de progression v2

## Écoles

Les neuf écoles jouables sont : feu, eau, vent, terre, glace, foudre, nature, lumière et démoniaque (magie noire/démoniaque). Les écoles arcane, spirituelle, mentale, gravité, sang, transmutation, spatiale, temporelle, invocation, guérison, illusion, barrières et enchantement ne font pas partie du catalogue actuel.

Chaque école expose un arbre de 75 techniques réparties en 20 offensives, 20 défensives, 20 de contrôle, 10 de soutien et 5 ultimes. Les fiches d'effets individuelles restent à concevoir avant de les rendre toutes lançables en combat.

## Races et affinités

- Humain : toutes les écoles, sans bonus élémentaire.
- Elfe : toutes sauf démoniaque ; +10 % en nature.
- Nain : magie élémentaire de base uniquement (feu, eau, vent, terre) ; +15 % de défense physique à intégrer au système de statistiques.
- Démon : toutes sauf lumière et nature ; +20 % en démoniaque.
- Ange : toutes sauf démoniaque ; +20 % en lumière.
- Orc : toutes sauf lumière et nature ; +14 % en feu et +14 % en force physique à intégrer au système de statistiques.
- Dragonoïde : toutes les écoles ; +15 % aux techniques offensives de destruction.

Les multiplicateurs sont des paramètres de prototype à équilibrer. Ils ne s'appliquent jamais si la race ne peut pas utiliser l'école.

## Progression sans points

- Aucun point de compétence n'est attribué ou dépensé.
- Seuls les lancements réussis et confirmés par le combat donnent de l'expérience à l'école concernée.
- Les niveaux d'école ouvrent automatiquement les paliers de techniques ; les prérequis de branche restent séquentiels.
- La maîtrise individuelle augmente uniquement lorsqu'une technique déjà débloquée est effectivement utilisée.
- Une ultime reste verrouillée tant que les quatre capstones offensif, défensif, contrôle et soutien ne sont pas acquis.
- Les seuils de niveau sont 1, 10, 25, 45 et 70 ; la courbe d'XP est provisoire.

## Techniques équipées

Le personnage dispose de cinq emplacements : trois techniques normales et deux ultimes. Une technique ne peut occuper qu'un emplacement à la fois et son type doit correspondre au type de l'emplacement.

## Sécurité et persistance

Le serveur doit confirmer le succès du sort et fournir un identifiant d'événement unique. Les événements rejoués ne donnent pas d'expérience deux fois. Le client ne peut pas envoyer lui-même des points ou de l'XP. La progression est sauvegardée par personnage dans la transaction serveur existante.

L'absorption et l'intensification d'une attaque élémentaire hostile restent réservées au feu : le niveau de feu du défenseur doit être strictement supérieur à celui de l'attaquant. Ce contrôle devra être raccordé au moteur de sort lorsqu'il sera généralisé aux neuf écoles.

## État du prototype

Le moteur de progression, les restrictions raciales, les emplacements de techniques et la validation serveur sont testés. Les effets détaillés des sorts, leur animation/VFX, le coût en mana, les temps d'incantation et le raccordement à tous les contrôles tactiles ne sont pas encore complets. Le service serveur existe dans le dépôt mais ne constitue pas un MMORPG multijoueur en production tant que l'adaptateur persistant et le serveur de jeu ne sont pas déployés.
