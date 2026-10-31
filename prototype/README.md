# Astra — prototype du moteur maison

Ce dossier contient le premier prototype 3D jouable d'Astra, écrit directement avec JavaScript et l'API graphique WebGL 2 du navigateur. Il ne dépend ni de Unity, ni d'Unreal Engine, ni d'un moteur de jeu tiers.

## Lancer
Ouvrir `index.html` depuis un serveur HTTP local ou un hébergement statique compatible. WebGL 2 est requis.

## Commandes
- ZQSD / WASD : se déplacer
- Flèches : déplacement et rotation de caméra
- Souris : tourner la caméra (clic maintenu + déplacement)
- Écran tactile : joystick virtuel et bouton courir

## État réel
- Rendu 3D WebGL 2 : première base
- Personnage : blocage géométrique provisoire, pas encore un modèle final
- Animation : oscillation procédurale provisoire, pas encore un rig de production
- Monde : terrain de test et arbres géométriques provisoires
- Réseau, comptes, sauvegarde persistante, combat, inventaire, VFX et assets finaux : non implémentés

Ce prototype est un point de départ technique, pas encore un MMORPG ni un moteur complet. Les prochaines étapes sont la séparation des modules, un vrai système de caméra/collision, le chargement des modèles et animations, puis l'architecture réseau autoritaire.
