# Animations ASTREA

Le prototype construit des clips de combat sur le squelette 3D du personnage chargé.

## Coups et combos
- 7 profils de mouvement raciaux : humain, elfe, nain, démon, ange, orc et dragonoïde.
- 3 familles de combos : physique, magique et hybride, chacune avec 3 étapes.
- Transitions avec fondu entre actions et fondu légèrement plus long pour les finisseurs.

## Finisseurs par arme et par race
Le générateur crée des clips dédiés au finisseur pour chaque combinaison race/arme, en versions physique et hybride : épée, dague, sabre, hache, marteau, masse, arc, arbalète, bâton, baguette et grimoire.

Les gestes sont différenciés selon le mouvement attendu de l'arme : taille, estoc, frappe descendante, visée/tension, rotation ou invocation. Les profils raciaux modulent la puissance, l'amplitude, la rotation et la posture.

Les clips GLB réalisés spécialement pour ASTREA peuvent remplacer ces animations de secours. Convention de nommage : `combo_<race>_<weapon>_finisher.glb` ou `combo_<race>_<weapon>_hybrid_finisher.glb`, dans `animations/` de l'archive du personnage.

**Limite actuelle :** ces clips sont des animations squelettiques générées par des poses et courbes de clés dans le moteur, pas encore des captures de mouvement ni des animations GLB artisanales. Les contacts au sol, la prise réelle de chaque arme et les silhouettes de chaque modèle devront être validés avec les personnages et armes 3D définitifs.
