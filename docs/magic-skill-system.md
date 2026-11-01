# ASTREA — système commun des arbres de magie

## Périmètre

Le catalogue de conception comprend 16 écoles de 75 emplacements chacune (1 200 emplacements) :
- Élémentaires : feu, eau, vent, terre, glace, foudre, nature.
- Principales : lumière, démoniaque, spatiale, temporelle, invocation, guérison.
- Spécialisées : illusion, barrières, enchantement.

Chaque école contient 20 compétences offensives, 20 défensives, 20 de contrôle, 10 de soutien et 5 ultimes. Les noms et concepts de compétences sont le catalogue créatif de référence ; le moteur leur attribue des identifiants stables. Les fiches d'effet individuelles (portée, dégâts, durée, coût et contres) doivent être renseignées avant leur activation dans le combat.

## Règles de progression implémentées

- Les 16 écoles sont indépendantes : le personnage peut développer plusieurs écoles sans choisir de classe exclusive.
- Chaque école possède son propre niveau et son expérience.
- Les compétences ont un identifiant stable `school:branch:number`.
- Chaque branche est divisée en cinq paliers.
- Les niveaux d'école requis par palier sont 1, 10, 25, 45 et 70.
- Les coûts proposés sont 1, 2, 3, 4 et 6 points de compétence selon le palier.
- Une compétence ordinaire exige la compétence précédente de sa branche.
- Une ultime exige les quatre dernières compétences des branches offensive, défensive, contrôle et soutien.
- Chaque compétence possède sa propre maîtrise, améliorée par les utilisations réussies.
- Les données de progression sont sérialisables par personnage et nettoyées avant utilisation.

## Valeurs provisoires

Les seuils de niveau, coûts de points et seuils de maîtrise du code sont des valeurs de prototype. Ils ne sont pas des décisions d'équilibrage définitives. Le gain de point de compétence doit être relié à la progression globale du personnage côté serveur ; le client ne doit jamais pouvoir s'attribuer des points.

Le niveau d'école progresse ici à raison d'un XP par lancement réussi. Ce rendement est une valeur technique provisoire. Les essais, soins hors combat, invocations et compétences de contrôle devront recevoir des règles anti-farm dédiées avant le jeu en ligne.

## Modèle de fiche technique d'une compétence

Chaque entrée finale du catalogue doit renseigner :
- identité : id, école, branche, palier, nom, description ;
- déblocage : niveau d'école, coût en points, prérequis ;
- exécution : coût en mana, temps d'incantation, portée, zone, cible, durée, recharge ;
- effet : dégâts/soins/bouclier/contrôle, type de dégâts, élément, intensité, durée et fréquence ;
- maîtrise : XP par usage admissible, seuils, améliorations et plafond ;
- contres : esquive, blocage, résistance, immunité, interruption et dissipation ;
- environnement : terrains créés, interactions élémentaires, durée et règles de nettoyage ;
- sécurité : limites anti-boucle, anti-farm et validation serveur.

## Garde-fous de conception

- Aucune école ne doit être la meilleure dans toutes les situations.
- Les ultimes restent évitables, contrables ou interruptibles lorsque leur nature le permet.
- Les contrôles ont des durées plafonnées et des fenêtres de réaction.
- Les soins, résurrections, arrêts temporels et déplacements spatiaux ont des limites strictes.
- Les combinaisons inter-écoles ne doivent pas multiplier les dégâts sans coût ou délai.
- Les résistances et immunités distinguent dégâts physiques, dégâts magiques et effets secondaires.
- L'absorption et l'intensification d'une attaque élémentaire hostile restent réservées au feu et exigent un niveau de feu strictement supérieur à celui du lanceur.
- Le serveur valide les points, prérequis, lancements réussis et gains de maîtrise. Le client ne fait qu'afficher l'arbre et envoyer des intentions d'action.

## État

Le moteur de progression commun et les tests sont présents. Les 1 200 noms/concepts ne constituent pas encore 1 200 sorts jouables : les données d'effet propres à chaque sort et leur intégration au moteur de combat restent à produire et équilibrer. Le moteur de progression ne constitue pas à lui seul une sauvegarde serveur connectée.
