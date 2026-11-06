# ASTREA — direction artistique de l'environnement de la Plaine d'Aube

## Intention
Reconstruire la zone de départ comme une grande plaine médiévale lumineuse et accueillante, lisible en troisième personne, avec une finition 3D anime semi-réaliste. L'environnement doit donner envie d'explorer et de vivre dans le monde, sans basculer vers une ambiance dark fantasy.

## Piliers visuels
1. **Nature généreuse** — herbe en couches, fleurs sauvages, buissons, arbres variés, pierres, galets et affleurements rocheux distribués par biome.
2. **Campagne médiévale habitée** — chemins lisibles, village à échelle humaine, marché, forge, puits, pont, champs clôturés et petits détails de vie.
3. **Lumière claire et magie discrète** — ciel bleu doux, soleil chaud, eau turquoise, points lumineux cyan/vert réservés aux lieux et objets interactifs.

## Règles de production
- Moteur conservé : Three.js 0.170.0 ; 1 unité = 1 mètre.
- Le monde reste streamé par cellules de 1 km autour du joueur ; les coordonnées continentales et les huit régions restent inchangées.
- La géométrie du terrain passe à 64 segments par cellule.
- La végétation et les rochers utilisent des `InstancedMesh` déterministes par cellule, avec des budgets par biome plafonnés à 6 200 instances (les troncs et couronnes comptent séparément).
- Les chemins, la place du village et le couloir du fleuve restent dégagés pour préserver la lecture et la navigation.
- Les textures PBR ambientCG déjà intégrées sont conservées : Grass 004, Ground 106 et Rock 064, CC0 1.0.
- Pas de dépendance ajoutée, pas de modification du combat, des sauvegardes ou des contrôles.

## Parcours jouable visé
Arrivée sur une clairière herbeuse → lecture du village et du fleuve → exploration des chemins → découverte du marché, de la forge, du pont et des activités de collecte → départ vers les régions voisines.

## Critères d'acceptation
- Terrain et décor cohérents dans toutes les cellules streamées, sans trous ni objets flottants évidents.
- Plaine d'Aube sensiblement plus dense en herbe, rochers, buissons, arbres et fleurs.
- Routes, fleuve, place et bâtiments restent dégagés et identifiables.
- Les huit régions et leurs activités/monuments conservent leurs coordonnées et leurs fonctions.
- Les commandes clavier, manette et tactile restent inchangées ; haut sur le joystick = avancer.
- Tests Node existants et nouveaux tests de budget passent ; prototype chargé dans Chromium, avec inspection visuelle mobile et console sans erreur bloquante.
