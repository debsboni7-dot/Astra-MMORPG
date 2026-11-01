# ASTREA MMORPG

ASTREA est un projet de MMORPG fantasy en développement. Ce dépôt rassemble le prototype web jouable, les systèmes de jeu en construction, les ressources artistiques, la documentation et une première fondation backend.

## Jouer dans le navigateur

Le prototype est prévu pour être publié sur **GitHub Pages** : aucune installation ni archive du jeu à télécharger n'est nécessaire. Le navigateur charge l'application, les modèles 3D et les animations à la demande. Une connexion Internet et un navigateur récent compatible WebGL 2 sont nécessaires.

- Application : `prototype/`
- Guide du prototype : [`prototype/README.md`](prototype/README.md)
- Documentation technique : [`docs/`](docs/)

## Systèmes présents dans la branche de développement

- Créateur de personnage et garde-robe du prototype.
- Prototype Three.js avec déplacement et caméra.
- Moteur de combat initial : dégâts physiques et magiques, défenses, effets, IA ennemie et techniques d'armes.
- Progression de maîtrise des quatre catégories d'armes physiques.
- Socle de progression magique pour 16 écoles, avec 75 emplacements par école, prérequis, points, maîtrise individuelle et sauvegarde JSONB.
- Première fondation backend Node.js/PostgreSQL : comptes, sessions, personnages, dépôt PostgreSQL et routes de progression des armes et de magie.

## État du projet

ASTREA n'est **pas encore un MMORPG en production**. La fondation backend et les services de progression sont en place dans la branche de développement, mais l'hébergement, la base PostgreSQL réelle, le serveur de combat temps réel, la synchronisation multijoueur, le client connecté et le monde complet restent à intégrer et à valider.

Les 1 200 emplacements magiques ont une structure de progression commune ; les fiches d'effet détaillées de chaque sort (dégâts, portée, coût, durée, recharge, contres et interactions) restent à définir et équilibrer avant leur activation dans les combats.

## Licence des ressources

Les ressources Quaternius importées proviennent de l'édition Standard du pack Modular Character Outfits - Fantasy ; sa licence CC0 est conservée dans `prototype/assets/quaternius/License_Standard.txt`. Les autres ressources conservent leur hébergement et leurs conditions propres.
