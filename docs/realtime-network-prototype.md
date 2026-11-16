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


## Ordre de priorité proposé pour les essais (sans décision finale)

1. **FishNet + transport gratuit compatible** : premier candidat Unity à qualifier, car la fiche actuelle annonce une version conçue pour Unity 6000.3.17, le modèle serveur autoritaire et l'absence de plafond CCU imposé par FishNet. Conditions bloquantes : valider la licence personnalisée du dépôt ou l'EULA exacte du paquet retenu, l'ensemble des notices tierces, la génération d'un serveur dédié, et le comportement sur deux clients.
2. **Unity NGO + Unity Transport** : candidat de comparaison officiel Unity, pertinent pour un client Unity natif et les plateformes ciblées. Conditions bloquantes : figer des versions de packages compatibles entre elles, confirmer la licence Unity applicable à la version exacte, et vérifier la chaîne de build serveur dédiée.
3. **WebSocket Node.js** : candidat de référence simple pour mesurer la réplication depuis deux navigateurs et réutiliser le backend Node. Il ne doit pas être choisi uniquement parce que son premier prototype est plus facile : la simulation, la sécurité, l'interpolation et le coût CPU restent à démontrer.
4. **Mirror** : candidat mis en attente. Sa licence MIT est attractive, mais sa documentation actuelle recommande Unity 2020/2021 LTS et ne garantit pas le support des versions plus récentes. Ne pas le retenir sans une preuve de compatibilité Unity 6.3.

Ce classement définit l'ordre d'investigation, pas un choix de protocole ni une autorisation d'ajouter un paquet. Le test comparatif doit conserver les mêmes règles de validation, le même scénario et les mêmes métriques pour chaque candidat.


## Contrat de messages neutre au transport (proposition de test)

Ce contrat sert à comparer les candidats sans préjuger du protocole final. Il décrit le comportement observable attendu dans le test à deux clients ; il ne constitue pas encore une API implémentée.

### Enveloppe commune

Chaque message applicatif utilise une enveloppe versionnée :
- `version` : entier, valeur initiale `1`.
- `type` : nom d'un message autorisé.
- `sequence` : entier strictement croissant par client pour ses intentions.
- `clientTime` : horodatage indicatif du client, jamais utilisé seul pour valider une action.
- `payload` : données propres au type, validées côté serveur.

Le serveur ajoute ses propres `serverTick` et `serverTime`. L'horloge client ne décide jamais de la position, des dégâts, du mana, des temps de recharge ni des récompenses.

### Messages client vers serveur

| Type | Payload minimal | Règle serveur |
|---|---|---|
| `AUTH` | ticket de connexion à usage unique | authentifier avant toute action de jeu ; refuser les tickets expirés ou déjà consommés |
| `INPUT` | axes de déplacement bornés, orientation souhaitée, séquence | valider fréquence, taille, séquence et limites de déplacement ; simuler côté serveur |
| `ACTION` | identifiant d'action, identifiant de requête | vérifier état, portée, recharge, coût et conditions dans le serveur de simulation |
| `PING` | nonce | répondre sans modifier l'état du jeu |

Le jeton de session HTTP longue durée ne doit pas apparaître dans l'URL, les journaux ou les messages d'erreur. Le candidat navigateur devra obtenir un ticket éphémère par une route HTTPS authentifiée avant la connexion temps réel.

### Messages serveur vers client

| Type | Payload minimal | Règle |
|---|---|---|
| `WELCOME` | identifiant de session, tick courant, identifiant joueur | envoyé après authentification |
| `SNAPSHOT` | tick serveur, séquence acquittée, entités visibles et états autoritaires | source de vérité pour la réplication |
| `ACTION_RESULT` | identifiant de requête, résultat accepté/refusé, état utile | le client n'invente pas le résultat |
| `REJECT` | code générique, séquence concernée | ne pas exposer les détails internes |
| `PONG` | nonce, temps serveur | mesure de latence |
| `DISCONNECT` | code contrôlé | fermeture propre et reconnexion explicite |

### Garde-fous communs aux candidats

- Taille maximale initiale d'un message de test : 4 Kio.
- Fréquence initiale d'envoi des intentions de mouvement : plafonnée à 20 messages/s/client pour le scénario comparatif ; cette valeur est un paramètre de test, pas une fréquence de production approuvée.
- Refuser les séquences répétées, les types inconnus, les valeurs non finies, les vecteurs hors bornes et les actions envoyées avant authentification.
- Ne jamais accepter une position finale, des dégâts, de l'XP ou un résultat de sort fournis comme faits par le client.
- Le serveur calcule la position et diffuse un snapshot ; le client peut interpoler visuellement mais ne modifie pas l'état persistant.
- À la reconnexion, recharger l'état depuis le serveur et reprendre depuis un snapshot autoritaire ; ne pas restaurer la dernière position déclarée par le client.
- Les tickets de connexion doivent être aléatoires, à usage unique, à durée courte, stockés sous forme hachée et consommés atomiquement.
- Les données de test et logs doivent exclure mots de passe, jetons de session et tickets en clair.

### Critère d'acceptation additionnel

Le test comparatif doit vérifier que les deux clients reçoivent le même état serveur après les intentions validées, et qu'une tentative d'usurpation de position ou de dégâts est rejetée sans altérer la persistance. Les limites de débit et la fréquence de 20 Hz doivent être identiques pour tous les candidats.


## Premier prototype exécutable — Node.js WebSocket (16 novembre 2026)

Un premier candidat de référence est maintenant présent dans `server/realtime/NodeWebSocketPrototypeServer.js`. Il utilise le serveur HTTP natif de Node et un petit sous-ensemble de trames WebSocket pour éviter toute dépendance supplémentaire dans ce prototype. Il ne s'agit pas encore d'un choix de protocole.

### Comportements couverts par les tests automatisés

- Deux clients WebSocket distincts s'authentifient et reçoivent le même snapshot autoritaire après un déplacement.
- Le ticket d'entrée est aléatoire, à usage unique, haché en mémoire et expire après 30 secondes.
- Les messages de jeu sont refusés avant authentification ; une connexion non authentifiée est fermée après 10 secondes.
- Les séquences répétées ou en retard sont rejetées.
- Les entrées de déplacement sont limitées à 20 messages par seconde et à des axes finis compris entre -1 et 1.
- Les vecteurs diagonaux sont normalisés ; le client ne peut pas imposer sa position, ses dégâts ou ses récompenses.
- Les actions non implémentées et les tickets expirés/rejoués sont rejetés.
- Le temps de déplacement est calculé depuis l'horloge serveur et plafonné ; un client ne peut pas accumuler un déplacement arbitraire en envoyant une rafale.

Les tests sont dans `tests/node-websocket-prototype.test.js` et sont inclus dans `npm test`. La suite Node.js et le contrôle PostgreSQL ont réussi dans le run CI du commit `293908d1ce620058bd60f56a179818022b66c122` ; la validation Chromium de ce run doit encore se terminer avant de déclarer le workflow complet réussi.

### Limites explicites

- Les tickets, sessions et positions sont en mémoire ; redémarrage du processus = perte de l'état de test.
- La route HTTP authentifiée `POST /v1/realtime/tickets` délivre désormais un ticket éphémère après vérification du propriétaire du personnage. Le jeton de session HTTP reste hors du canal WebSocket. La route utilise une salle de prototype commune, pas un matchmaking.
- La reconnexion dans le même processus est testée : un nouveau ticket du même compte/personnage restaure la dernière position et la dernière séquence autoritaires ; les anciennes séquences sont rejetées. La reconnexion après redémarrage ou entre plusieurs instances n'est pas implémentée.
- Le test utilise deux clients Node.js sur loopback, pas deux clients Unity ni deux appareils distants. Un test vérifie aussi que l'upgrade WebSocket peut partager le même port HTTP/API.
- Le ticket de reconnexion est également lié au compte et au personnage d'origine ; un ticket qui tente de réutiliser le même emplacement de joueur avec un autre personnage est rejeté.

- Aucune mesure réseau de performance, de latence WAN, de charge, de pertes ou de capacité n'est encore produite.
- Le serveur est un prototype de comparaison contrôlé, pas un service prêt à exposer sur Internet. Avant toute exposition : remplacer le parseur WebSocket minimal par une implémentation éprouvée, ajouter TLS/reverse proxy, contrôle d'origine, limites distribuées, observabilité et tests de sécurité.

**Statut candidat :** première preuve fonctionnelle de réplication autoritaire Node WebSocket. FishNet et NGO restent à comparer dans Unity ; aucune décision finale n'est prise.


### Liaison au backend HTTP — en cours de validation

Le backend expose maintenant `POST /v1/realtime/tickets`. Le compte vient exclusivement du Bearer authentifié ; le personnage est recherché avec le couple `account_id + character_id` en PostgreSQL. Un ticket de 30 secondes est délivré et le serveur WebSocket peut attacher son gestionnaire d'upgrade au même serveur HTTP que l'API. Le point d'entrée de production de prototype initialise ces deux composants ensemble.

Les tests ajoutés couvrent la route HTTP, le refus d'un personnage appartenant à un autre compte, le service de ticket et le partage du port HTTP/WebSocket. La validation CI de ces derniers changements doit être terminée avant de considérer le raccordement validé. Le test n'est pas encore un test Unity ni un test sur deux appareils.


## Microbenchmark reproductible du candidat Node.js — 16 novembre 2026

Le script `scripts/benchmark-realtime-websocket.js` mesure le délai entre l'envoi d'une intention par le client A et la réception du snapshot correspondant par le client B, avec deux clients indépendants sur loopback. Il calcule min, moyenne, p50, p95, p99, max, débit observé, taille des messages, temps CPU du processus et RSS avant/après. Il est lancé automatiquement dans la CI et peut être exécuté avec `npm run benchmark:realtime` (20 échantillons par défaut) ou `npm run benchmark:realtime -- 100`.

**Limite importante :** cette mesure est un microbenchmark local sur runner CI, sans réseau WAN, sans téléphone Android, sans client Unity, sans perte ni gigue artificielle. Elle ne mesure pas une capacité de joueurs simultanés et ne permet pas à elle seule de choisir le protocole. Les résultats doivent être comparés sur une machine et une configuration identiques pour les candidats concurrents.
