# ASTREA — cahier du prototype réseau comparatif

Statut : préparation technique de l'étape 3. Aucun protocole n'est encore choisi et aucun serveur temps réel n'est déclaré opérationnel.

## Objectif

Comparer les solutions adaptées à un client Unity 6.3, à un backend applicatif Node.js/PostgreSQL déjà présent et à la contrainte de ne rien payer pour les prototypes. Le test doit déterminer comment deux clients voient un même état de jeu autoritaire, sans confier les dégâts, positions validées ou récompenses au client.

## Solutions à évaluer

| Option | Modèle | Atouts | Risques / coûts à vérifier |
|---|---|---|---|
| WebSocket avec serveur Node.js dédié au prototype | TCP, messages applicatifs JSON ou binaires | Réutilise l'écosystème Node existant ; facile à instrumenter et à tester depuis navigateur et Unity | TCP peut provoquer du head-of-line blocking ; réplication, interpolation, prédiction et sécurité à développer ; charge Node à mesurer |
| Unity Netcode for GameObjects + Unity Transport | Transport UDP, modèle Unity | Intégration native au client Unity ; transport auto-hébergé possible ; adapté à une simulation Unity autoritaire | Le serveur de simulation devient un processus Unity distinct ; déploiement et tests Unity réels indispensables ; vérifier les conditions d'usage/licence et les contraintes plateformes |
| FishNet (transport UDP selon configuration) | Framework réseau Unity | Framework orienté jeux, options de synchronisation et prédiction | Dépendance et architecture supplémentaires ; vérifier compatibilité Unity 6.3, maintenance, licence, builds serveur et plateformes |
| Mirror | Framework réseau Unity | Projet open source et écosystème documenté | Compatibilité exacte Unity 6.3, transport, maintenance et modèle serveur à vérifier ; pas de preuve de performance pour ASTREA |

Photon Fusion, services Relay hébergés et services commerciaux ne sont pas retenus pour le prototype tant que leur coût total et leurs limites gratuites ne sont pas établis. Aucun service payant ne doit être activé.

## Scénario identique pour chaque candidat

1. Deux clients distincts rejoignent une même session de test.
2. Le serveur crée et possède l'état de la session.
3. Le client A envoie une intention de déplacement ; le serveur valide et diffuse un état horodaté.
4. Le client B observe A se déplacer ; B peut également se déplacer et A reçoit sa mise à jour.
5. Un client tente d'envoyer une position impossible ou une valeur de dégâts arbitraire ; le serveur rejette l'entrée et conserve l'état valide.
6. Simuler perte de connexion, reconnexion, latence et perte de paquets lorsque le transport le permet.
7. Enregistrer les métriques brutes et le matériel/runner utilisé.

## Mesures obligatoires

- Latence aller-retour médiane, p95 et p99.
- Délai entre action locale et état observé par l'autre client.
- Fréquence d'envoi/réception et taille moyenne/maximale des messages.
- CPU et mémoire du serveur, CPU client, nombre d'entités répliquées.
- Comportement sous latence, gigue, perte et reconnexion.
- Résistance aux valeurs client invalides et à la répétition de messages.
- Complexité d'intégration, licence, coût d'hébergement et possibilité d'auto-hébergement sans abonnement.

Les mesures doivent préciser la machine, la région réseau, la version du moteur, le nombre de clients et la configuration. Un résultat obtenu dans un runner CI n'est pas une mesure de performance sur téléphone.

## Critères de décision

Aucun protocole n'est choisi sur la seule popularité ou facilité de prise en main. La décision doit être justifiée par :
- un prototype réellement exécuté avec deux clients ;
- un serveur autoritaire ;
- les mesures comparables ci-dessus ;
- une vérification des licences et coûts ;
- une trajectoire réaliste vers des zones et instances, sans prétendre qu'un test à deux clients prouve une capacité à grande échelle.

## Dépendances et limites actuelles

- L'adaptateur Unity HTTP actuel couvre l'authentification et les personnages, pas la simulation temps réel.
- Le backend Node.js existant reste le backend applicatif et la persistance ; il n'est pas encore le serveur de monde.
- Le manifeste Unity ne contient actuellement ni Netcode for GameObjects, ni Unity Transport, ni FishNet, ni Mirror.
- L'exécution Unity Editor, le build serveur dédié et les tests sur deux clients ne sont pas disponibles dans les validations Chromium/Node existantes.
- Ne pas installer une dépendance réseau ni figer un protocole avant l'étape comparative et la vérification des licences.

## Vérification documentaire initiale (16 novembre 2026)

- **Unity Netcode for GameObjects + Unity Transport :** la documentation officielle décrit NGO comme une couche réseau haut niveau et Unity Transport comme transport sous-jacent. Unity Transport prend en charge UDP et WebSockets ; la documentation Unity indique que NGO vise Unity 6, Android/iOS, PC et certaines plateformes fermées sous réserve de conditions propres aux consoles. Références : [NGO sur GitHub](https://github.com/Unity-Technologies/com.unity.netcode.gameobjects), [Unity Transport](https://github.com/Unity-Technologies/com.unity.multiplayer.docs/blob/main/transport/about.md), [compatibilité NGO](https://docs.unity.cn/Packages/com.unity.netcode.gameobjects%402.5/manual/index.html).
- **Mirror :** le dépôt annonce une licence MIT, des transports interchangeables, et indique Unity 6.0 dans ses versions de démarrage. La compatibilité doit néanmoins être testée avec notre version exacte Unity 6.3 et notre pipeline serveur. Références : [dépôt Mirror](https://github.com/MirrorNetworking/Mirror), [licence MIT](https://github.com/MirrorNetworking/Mirror/blob/master/LICENSE).
- **FishNet :** sa documentation déclare Unity 6 LTS entièrement pris en charge. La licence exacte et les dépendances tierces doivent être auditées dans les fichiers de licence du commit retenu avant intégration. Références : [compatibilité Unity](https://fish-networking.gitbook.io/docs/overview/readme/features/unity-compatibility), [dépôt FishNet](https://github.com/FirstGearGames/FishNet).
- **WebSocket Node.js :** candidat intéressant pour réutiliser l'infrastructure applicative existante et le prototype navigateur, mais la fiabilité, le rythme de simulation, la charge CPU et la latence devront être mesurés ; aucune bibliothèque serveur supplémentaire n'a été choisie.

Cette revue confirme que NGO/Unity Transport et FishNet sont des candidats plausibles sur Unity 6, mais ne valide ni la compatibilité exacte de notre projet Unity 6.3, ni la licence complète de chaque dépendance, ni les performances. Aucun paquet n'a été installé.

## État

- [x] Options candidates et critères d'évaluation documentés.
- [x] Scénario commun et métriques définis.
- [~] Compatibilité générale Unity 6 vérifiée pour NGO/Unity Transport, FishNet et Mirror ; compatibilité exacte Unity 6.3, audit complet des licences et dépendances encore à confirmer.
- [ ] Prototype comparatif à deux clients exécuté.
- [ ] Rapport de mesures et décision de protocole approuvée.


## Audit complémentaire des licences et versions (16 novembre 2026)

- **FishNet :** le dépôt public contient une licence personnalisée, et non une licence MIT/BSD standard. Elle accorde un usage mondial, sans redevance, pour les jeux développés avec le logiciel, mais contient des exclusions spécifiques aux logiciels concurrents de type networking et renvoie les composants tiers à leurs licences propres. La version publiée sur l'Asset Store est annoncée gratuite, la version 4.7.4R est datée du 19 octobre 2026 et la version Unity d'origine est 6000.3.17, proche de notre Unity 6.3. La documentation officielle affirme l'absence de plafond CCU ou de péage CCU pour FishNet lui-même ; cela ne rend pas l'hébergement ni l'exploitation gratuits. Références : [licence du dépôt](https://github.com/FirstGearGames/FishNet/blob/main/LICENSE.md), [fiche Asset Store](https://assetstore.unity.com/packages/tools/network/fishnet-networking-evolved-207815), [documentation sur les CCU](https://github.com/FirstGearGames/FishNet-Documentation).
- **Mirror :** le code principal est annoncé MIT, mais la documentation officielle actuellement visible recommande Unity 2020/2021 LTS et avertit que les versions au-delà peuvent fonctionner sans garantie de support. Le simple fait que certains exemples mentionnent Unity 6 ne suffit donc pas à valider notre version Unity 6.3. Références : [dépôt Mirror et licence](https://github.com/MirrorNetworking/Mirror), [documentation des versions Unity](https://mirror-networking.gitbook.io/docs).
- **Netcode for GameObjects (NGO) :** la documentation d'installation exige un compte Unity actif avec une licence valide et prend en charge Unity 2021.3+ ainsi qu'Android/iOS, PC et la plupart des consoles sous conditions. La documentation Unity indique que les versions 2.0+ sont sous Unity Companion License, alors que les anciennes versions restent MIT. Il faudra vérifier la version précise et ses conditions d'utilisation, sans supposer que « gratuit » signifie sans condition. Références : [installation officielle](https://github.com/Unity-Technologies/com.unity.multiplayer.docs/blob/main/docs/installation/installation.md), [changement de licence expliqué par Unity](https://discussions.unity.com/t/multiplayer-development-status-and-next-milestones-september-2024/1521688).
- **Unity Transport :** reste la couche transport à examiner avec NGO ; la compatibilité du couple de versions exactes doit être figée ensemble, et pas choisie indépendamment.

**Conséquence pour ASTREA :** FishNet remonte comme candidat technique à examiner en priorité dans le prototype Unity, notamment en raison de la version Unity 6.3 proche de sa version d'origine et de l'absence annoncée de péage CCU. Ce n'est pas encore une décision d'architecture : son contrat de licence personnalisé, les dépendances tierces, l'exécution serveur dédié et les mesures à deux clients restent des portes obligatoires. Mirror descend en priorité tant que son support explicite de Unity 6.3 n'est pas établi. Aucun package n'a été installé.
