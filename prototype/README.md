# ASTREA MMORPG — prototype web

Prototype jouable dans un navigateur, construit avec Three.js. Il permet de parcourir le menu, créer un personnage, afficher son modèle 3D animé et tester un premier déplacement en jeu. **Ce prototype n'est pas encore le MMORPG complet.**

## Jouer

Après publication, ouvrir l'adresse GitHub Pages du dépôt dans un navigateur récent compatible WebGL 2. Aucune installation et aucun téléchargement d'archive ne sont nécessaires. Une connexion Internet est requise : les modèles et animations ASTREA sont chargés à la demande depuis leur hébergement, et les bibliothèques Three.js / JSZip depuis jsDelivr.

Pour lancer localement :

```bash
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173` depuis ce dossier `prototype/`.

## Personnages et commandes

- Sept races : humain, elfe, nain, démon, ange, orc et dragonoïde ; modèles masculin et féminin pour chacune.
- Le créateur présente les réglages à gauche et le modèle 3D à droite. La prévisualisation peut être tournée à la souris et zoomée à la molette.
- Les 14 packs personnages référencés dans `src/main.js` comprennent un modèle texturé et riggé ainsi que neuf animations : idle, marche, course, saut, attaque, sort chargé, blocage, réaction aux coups et esquive.
- Clavier : ZQSD / WASD pour se déplacer, Maj pour courir, Espace pour sauter, J attaque, K sort chargé, L blocage, O esquive.
- Manette : stick gauche déplacement, Croix saut / valider, Rond esquive / retour, Carré attaque, Triangle sort, L1 blocage.
- Le personnage créé est sauvegardé localement dans le navigateur (`localStorage`). Il n'existe pas encore de compte ni de synchronisation entre appareils.

## Garde-robe modulaire importée

Le pack Quaternius Standard (20 pièces glTF indépendantes, buffers et textures, environ 34 Mo compressés) est hébergé séparément et chargé à la demande depuis le stockage des ressources ASTREA lors de la première utilisation de la garde-robe ; il n’alourdit donc pas le dépôt GitHub Pages. Il contient deux ensembles Peasant et Ranger pour les modèles masculins et féminins. L'interface propose sept emplacements : cheveux/coiffure, tête, torse, jambes, bottes, bras et accessoires. Les préréglages peuvent être appliqués puis modifiés pièce par pièce.

**Limites actuelles à connaître :** les pièces Quaternius sont activées uniquement pour les personnages humains. Leur adaptation aux six autres races reste à vérifier. Le squelette Quaternius (65 os) est raccordé en première approche au squelette ASTREA (24 os), mais le rendu et les poids doivent encore être contrôlés visuellement sur toutes les animations. Enfin, les vêtements d'origine des 14 personnages ASTREA sont fusionnés dans leur mesh de corps : les nouvelles pièces peuvent donc se superposer ou intersecter avec les vêtements intégrés. Une vraie suppression/remplacement de tenue exige des corps neutres ou des zones de corps masquables, ainsi qu'un ajustement par morphologie.

## Ce qui reste avant un MMORPG complet

- Valider visuellement les vêtements, les proportions et les animations sur les personnages humains ; corriger les intersections et la correspondance des os.
- Préparer des corps de base neutres / des zones masquables, puis adapter les vêtements aux elfes, nains, démons, anges, orcs et dragonoïdes.
- Remplacer le terrain provisoire et développer le monde, les interactions et les interfaces de jeu.
- Développer le serveur multijoueur autoritaire, les comptes, la persistance en ligne et la synchronisation.
- Finaliser combat, compétences, inventaire, équipement, progression, économie et systèmes sociaux.
- Effectuer des tests de performance et de compatibilité sur téléphones et ordinateurs réels.

## Contrôles techniques déjà effectués

- Syntaxe JavaScript (`node --check`) et intégrité des différences Git.
- Présence des 20 fichiers glTF, buffers et textures du pack Quaternius.
- Les 14 archives de personnages sont hébergées et leurs manifestes indiquent des modèles riggés/texturés avec neuf animations.
- Le chargement de la page et du modèle humain a été essayé dans Chromium headless ; ce contrôle ne remplace pas les tests visuels et de gameplay sur appareils réels.

## Provenance

La licence CC0 et le fichier Readme du pack Quaternius Standard sont conservés dans `assets/quaternius/`. Les 20 modèles, buffers et textures sont servis depuis une archive distante d’environ 34 Mo, chargée par le navigateur à la première utilisation de la garde-robe. Le navigateur peut la conserver dans son cache. Les personnages ASTREA sont servis depuis l'hébergement d'assets référencé dans `src/main.js`.
