# ASTREA — Bible artistique
Version 1.0 — 15 novembre 2026
Statut : référence de direction artistique proposée, à valider par le créateur.

## 1. Intention visuelle
Fantasy médiévale semi-réaliste, détaillée et lumineuse. Le monde doit sembler habité, vaste et crédible sans devenir uniformément lugubre. Les paysages naturels et la lisibilité du personnage priment sur les effets décoratifs.

## 2. Piliers visuels
1. Réalisme médiéval lumineux : proportions crédibles, matériaux physiques, lumière naturelle et silhouettes lisibles.
2. Identité par continent : chaque région se reconnaît par ses formes, couleurs, végétation, architecture et atmosphère.
3. Détails maîtrisés : ornements concentrés sur les zones importantes, pas de bruit visuel permanent.
4. Personnages humanoïdes : les sept races partagent une base anatomique lisible ; les traits raciaux sont distinctifs sans déformer excessivement les proportions.
5. Effets lisibles : la magie doit être spectaculaire mais ne jamais masquer les télégraphies de combat ni saturer les téléphones.

## 3. Palette et matériaux
- Acier trempé bleu-gris, argent forgé et or ancien en accents.
- Cuir brun/rouge sombre avec grain visible et réponse mate.
- Émail saphir profond, non émissif par défaut.
- Pierre sculptée, bois travaillé, tissus naturels et métaux patinés.
- Éviter les aplats métalliques uniformes, le plastique brillant et les surfaces trop saturées.

## 4. Identité des continents
| Région | Couleurs et lumière | Formes et matières |
|---|---|---|
| Astrea | verts doux, ciel bleu, soleil chaud | plaines ouvertes, chemins de terre, fermes, bois clair, pierre locale |
| Van | verts profonds, lumière filtrée | troncs, racines, charpentes, passerelles, villages forestiers |
| Burg | ocres, sable, lumière dure | grès, oasis, ruines, tissus adaptés à la chaleur |
| Night | nuit urbaine lisible, lumières localisées | rues, places, marchés, pierre et bois urbains |
| Noir | contrastes dramatiques mais navigables | roches sombres, fortifications, reliefs hostiles |

Night n'est pas un continent de monstres : son identité vient des villes, des interactions et de la criminalité. Noir concentre les dangers monstrueux.

## 5. Personnages et races
- Humain : proportions et apparence polyvalentes.
- Elfe : silhouette élégante, oreilles distinctives, détails naturels.
- Nain : stature plus compacte, proportions cohérentes pour l'équipement.
- Démon : apparence proche humaine, cornes optionnelles et traits subtils.
- Ange : apparence proche humaine, attributs lumineux maîtrisés ; ailes seulement si confirmées par le design.
- Orc : silhouette robuste sans exagération caricaturale.
- Dragonoïde : traits draconiques intégrés à une anatomie humanoïde.
Les modèles masculins/féminins, visages, morphologies et détails exacts doivent être validés par des planches de référence avant production en série.

## 6. Armures, vêtements et armes
- Priorité à la lecture de silhouette et à la mobilité.
- Modularité des pièces sans trous visibles ni pénétration majeure du corps.
- Matériaux et ornements cohérents avec la région, la faction et le rang.
- Les armes d'hast restent exclues selon la règle de conception actuelle.
- Chaque arme doit être lisible en mouvement et compatible avec les prises d'animation.

## 7. Environnements et architecture
- Échelle humaine crédible : portes, escaliers, mobiliers, routes et végétation doivent être utilisables.
- Points de repère visibles à distance pour guider l'exploration.
- Densité des détails adaptée à la distance caméra.
- Intérieurs et lieux de vie doivent raconter la fonction des bâtiments.
- Les modules architecturaux doivent permettre la variation sans répétition évidente.

## 8. Magie et effets
Palette proposée à tester : feu chaud, eau cyan/bleu, vent blanc/vert pâle, terre ocre, glace bleu froid, foudre jaune/blanc, nature vert vivant, lumière or/blanc, démoniaque violet/rouge profond. Ces couleurs sont des repères de lisibilité, pas des règles finales de lore.
Chaque effet doit avoir un début, une phase active et une fin clairement lisibles, avec version mobile réduite.

## 9. Interface
- Inspiration console haut de gamme, sans surcharge.
- Bordures de sélection contrastées et commandes clairement identifiables.
- HUD qui laisse le personnage et le monde visibles.
- Commandes tactiles espacées, sans chevauchement.
- Typographie lisible sur petit écran et hiérarchie cohérente.
- Les glyphes de manette doivent correspondre au périphérique utilisé.

## 10. Standards techniques d'assets
- PBR : Base Color, Metallic/Roughness, Normal séparés lorsque nécessaire.
- Conserver .blend, textures source et fichiers de référence.
- GLB/glTF pour échange et inspection ; FBX pour Unity lorsque requis.
- Commencer avec textures 512 ou 1K selon la taille à l'écran ; passer en 2K uniquement après mesure mémoire.
- Topologie, UV, normales, échelle, pivot, collisions, LOD et rig doivent être contrôlés.
- Vérifier les licences commerciales et les obligations d'attribution avant intégration.

## 11. Critères d'acceptation visuelle
- Silhouette lisible à distance de jeu.
- Matériaux cohérents en lumière directe et ombre.
- Pas de pénétration majeure des vêtements/armures.
- Déformations propres aux articulations.
- Pas d'objets flottants, trous de terrain ou répétitions trop visibles.
- Effets magiques identifiables et non aveuglants.
- Qualité maintenue sur profil Android de référence.

---
Cette bible complète les standards existants de `docs/ART_DIRECTION.md`. Les couleurs de magie, ailes d'anges et détails morphologiques signalés comme propositions restent à valider.
