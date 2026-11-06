# ASTREA — environnement du continent

- Échelle de conception : 1 200 × 900 km, soit 1 080 000 km².
- Huit régions définies par coordonnées : Plaine d'Aube, Bois de Sylve, Greniers d'Or, Hautes Terres de Veyr, Lac des Miroirs, Bassin d'Eloria, Marches de l'Ouest et Côte des Brumes.
- Unité 3D : 1 unité = 1 mètre. Terrain généré par cellules de 1 km et chargé autour du joueur.
- Plaine d'Aube : terrain ondulé, fleuve, pont, routes, bourg médiéval, marché, forge, fontaine lumineuse, PNJ clonés depuis le modèle du joueur et six activités de départ.
- Activités distribuées dans les sept autres régions : cueillette et bois à Sylve ; cultures aux Greniers d'Or ; minerais et reliques à Veyr ; pêche et vestiges au Lac des Miroirs ; cultures et pêche à Eloria ; pierre et bois aux Marches de l'Ouest ; plantes et pêche sur la Côte des Brumes.
- Sept monuments régionaux procéduraux : Cœur-Vert, Moulin des Moissons, Aiguille de Veyr, Phare des Miroirs, Aqueduc d’Eloria, Tour des Marches et Saule des Brumes. Ils sont chargés uniquement avec la cellule de 1 km qui les contient.
- Cycle jour/nuit, eau animée et sources lumineuses locales.
- Commandes tactiles : axe vertical normalisé une seule fois (haut = avancer, bas = reculer) ; axes tactiles testés indépendamment des axes clavier et manette.
- Textures PBR 512 px issues d'ambientCG : Grass 004, Ground 106 et Rock 064, licence CC0 1.0. Voir `assets/textures/astrea/ASSET_SOURCES.md`.
- Refonte de la Plaine d'Aube : terrain à 64 segments par cellule ; tapis d'herbe en touffes instanciées, fleurs, buissons, arbres, rochers et galets. La densité varie par biome et reste plafonnée à 6 200 instances par cellule pour préserver les appareils mobiles.
- Les zones de départ, la place du village, les routes et le couloir du fleuve gardent des marges sans gros éléments de décor pour éviter les obstructions visuelles.
- Deux parcelles agricoles clôturées, avec rangées de cultures et bottes de foin, complètent les abords du village.
- Les placements naturels utilisent la graine déterministe de chaque cellule : un rechargement de zone conserve la même disposition. Les maillages instanciés sont libérés avec leur cellule.
- Caméra de jeu initialisée au-dessus et derrière le personnage ; mannequin et pillard d'entraînement placés devant le point d'apparition pour dégager la vue.

La géographie, le streaming et des activités de collecte propres aux huit régions sont intégrés. La Plaine d'Aube dispose désormais d'un habillage naturel plus dense et de parcelles agricoles ; les sept régions éloignées disposent chacune d'un monument identifiable et de points de collecte, mais pas encore de villes complètes ni de chaînes artisanales avancées. Les saisons, la météo, les sons d'ambiance et les grands sites scénarisés restent à développer. Les performances doivent encore être mesurées sur de vrais téléphones Android et appareils PC.
