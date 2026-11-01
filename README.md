# ASTREA MMORPG

ASTREA est un projet de MMORPG fantasy en développement. Ce dépôt rassemble le prototype web jouable, les systèmes de jeu en construction, les ressources artistiques et la documentation.

## Jouer dans le navigateur

Le prototype est prévu pour être publié sur **GitHub Pages** : aucune installation ni archive du jeu à télécharger n'est nécessaire. Le navigateur charge l'application, les modèles 3D et les animations à la demande. Une connexion Internet et un navigateur récent compatible WebGL 2 sont nécessaires.

- Application : `prototype/`
- Guide du prototype : [`prototype/README.md`](prototype/README.md)
- Suivi du projet : `docs/`

## Contenu actuellement présent

- Créateur de personnage avec les sept races et les deux sexes.
- Quatorze modèles 3D de personnages avec animations, chargés depuis l'hébergement des ressources.
- Interface de garde-robe avec sept emplacements et 20 pièces modulaires Quaternius Standard, actuellement proposées aux personnages humains.
- Prototype Three.js avec déplacement de base, caméra, clavier et manette.

## État du projet

ASTREA n'est pas encore un MMORPG en production : le prototype ne dispose pas encore d'un serveur multijoueur, de comptes, d'une sauvegarde en ligne, d'un monde complet ni de systèmes de combat et de progression finalisés. Les limites connues et les vérifications restantes sont détaillées dans [`prototype/README.md`](prototype/README.md).

## Licence des ressources

Les ressources Quaternius importées proviennent de l'édition Standard du pack Modular Character Outfits - Fantasy ; sa licence CC0 est conservée dans `prototype/assets/quaternius/License_Standard.txt`. Les autres ressources conservent leur hébergement et leurs conditions propres.
