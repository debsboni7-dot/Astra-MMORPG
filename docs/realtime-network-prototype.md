# ASTREA — cahier du prototype réseau comparatif

Statut au 21 novembre 2026 : baseline Node WebSocket à deux clients testée ; FishNet 4.7.4 intégré comme candidat de prototype sur une branche isolée ; scripts réseau compilés contre stubs .NET et API FishNet vérifiée en CI. Aucun build Unity réel ni test deux clients Unity n'a réussi à ce jour. Le protocole de production reste ouvert.

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
- Sur la branche principale, le manifeste reste sans framework réseau. Sur la branche isolée `spike/fishnet-unity-6-3-evaluation`, FishNet 4.7.4 est désormais déclaré comme dépendance UPM épinglée ; NGO, Unity Transport et Mirror ne sont pas installés.
- L'exécution Unity Editor, le build serveur dédié et les tests sur deux clients ne sont pas disponibles dans les validations Chromium/Node existantes.
- Ne pas installer une dépendance réseau ni figer un protocole avant l'étape comparative et la vérification des licences.

## Vérification documentaire initiale (16 novembre 2026)

- **Unity Netcode for GameObjects + Unity Transport :** la documentation officielle décrit NGO comme une couche réseau haut niveau et Unity Transport comme transport sous-jacent. Unity Transport prend en charge UDP et WebSockets ; la documentation Unity indique que NGO vise Unity 6, Android/iOS, PC et certaines plateformes fermées sous réserve de conditions propres aux consoles. Références : [NGO sur GitHub](https://github.com/Unity-Technologies/com.unity.netcode.gameobjects), [Unity Transport](https://github.com/Unity-Technologies/com.unity.multiplayer.docs/blob/main/transport/about.md), [compatibilité NGO](https://docs.unity.cn/Packages/com.unity.netcode.gameobjects%402.5/manual/index.html).
- **Mirror :** le dépôt annonce une licence MIT, des transports interchangeables, et indique Unity 6.0 dans ses versions de démarrage. La compatibilité doit néanmoins être testée avec notre version exacte Unity 6.3 et notre pipeline serveur. Références : [dépôt Mirror](https://github.com/MirrorNetworking/Mirror), [licence MIT](https://github.com/MirrorNetworking/Mirror/blob/master/LICENSE).
- **FishNet :** sa documentation déclare Unity 6 LTS entièrement pris en charge. La licence exacte et les dépendances tierces doivent être auditées dans les fichiers de licence du commit retenu avant intégration. Références : [compatibilité Unity](https://fish-networking.gitbook.io/docs/overview/readme/features/unity-compatibility), [dépôt FishNet](https://github.com/FirstGearGames/FishNet).
- **WebSocket Node.js :** candidat intéressant pour réutiliser l'infrastructure applicative existante et le prototype navigateur, mais la fiabilité, le rythme de simulation, la charge CPU et la latence devront être mesurés ; aucune bibliothèque serveur supplémentaire n'a été choisie.

Cette revue documentaire du 16 novembre confirmait que NGO/Unity Transport et FishNet sont des candidats plausibles sur Unity 6, sans prouver la compatibilité complète ni les performances. Depuis, FishNet 4.7.4 a été déclaré comme dépendance UPM sur la branche isolée ; Unity n'a pas encore résolu le paquet.

## État

- [x] Options candidates et critères d'évaluation documentés.
- [x] Scénario commun et métriques définis.
- [~] API FishNet 4.7.4 vérifiée dans CI et scripts réseau compilés contre stubs .NET ; résolution UPM et compilation Unity 6000.3.28f1 restent à faire.
- [x] Baseline Node WebSocket testée à deux clients en CI.
- [~] Code FishNet de tickets, Authenticator, spawn et test deux clients ajouté sur branche isolée ; exécution Unity réelle bloquée par les secrets de licence absents.
- [~] Transport chiffré identifié comme exigence ; FishyUnityTransport DTLS/TLS est un candidat non intégré, à vérifier.
- [ ] Prototype comparatif FishNet à deux clients Unity exécuté.
- [ ] Rapport de mesures comparables et décision de protocole approuvée.


## Audit complémentaire des licences et versions (16 novembre 2026)

- **FishNet :** le dépôt public contient une licence personnalisée, et non une licence MIT/BSD standard. Elle accorde un usage mondial, sans redevance, pour les jeux développés avec le logiciel, mais contient des exclusions spécifiques aux logiciels concurrents de type networking et renvoie les composants tiers à leurs licences propres. La version publiée sur l'Asset Store est annoncée gratuite, la version 4.7.4R est datée du 19 octobre 2026 et la version Unity d'origine est 6000.3.17, proche de notre Unity 6.3. La documentation officielle affirme l'absence de plafond CCU ou de péage CCU pour FishNet lui-même ; cela ne rend pas l'hébergement ni l'exploitation gratuits. Références : [licence du dépôt](https://github.com/FirstGearGames/FishNet/blob/main/LICENSE.md), [fiche Asset Store](https://assetstore.unity.com/packages/tools/network/fishnet-networking-evolved-207815), [documentation sur les CCU](https://github.com/FirstGearGames/FishNet-Documentation).
- **Mirror :** le code principal est annoncé MIT, mais la documentation officielle actuellement visible recommande Unity 2020/2021 LTS et avertit que les versions au-delà peuvent fonctionner sans garantie de support. Le simple fait que certains exemples mentionnent Unity 6 ne suffit donc pas à valider notre version Unity 6.3. Références : [dépôt Mirror et licence](https://github.com/MirrorNetworking/Mirror), [documentation des versions Unity](https://mirror-networking.gitbook.io/docs).
- **Netcode for GameObjects (NGO) :** la documentation d'installation exige un compte Unity actif avec une licence valide et prend en charge Unity 2021.3+ ainsi qu'Android/iOS, PC et la plupart des consoles sous conditions. La documentation Unity indique que les versions 2.0+ sont sous Unity Companion License, alors que les anciennes versions restent MIT. Il faudra vérifier la version précise et ses conditions d'utilisation, sans supposer que « gratuit » signifie sans condition. Références : [installation officielle](https://github.com/Unity-Technologies/com.unity.multiplayer.docs/blob/main/docs/installation/installation.md), [changement de licence expliqué par Unity](https://discussions.unity.com/t/multiplayer-development-status-and-next-milestones-september-2024/1521688).
- **Unity Transport :** reste la couche transport à examiner avec NGO ; la compatibilité du couple de versions exactes doit être figée ensemble, et pas choisie indépendamment.

**Conséquence pour ASTREA :** FishNet remonte comme candidat technique à examiner en priorité dans le prototype Unity, notamment en raison de la version Unity 6.3 proche de sa version d'origine et de l'absence annoncée de péage CCU. Ce n'est pas encore une décision d'architecture : son contrat de licence personnalisé, les dépendances tierces, l'exécution serveur dédié et les mesures à deux clients restent des portes obligatoires. Mirror descend en priorité tant que son support explicite de Unity 6.3 n'est pas établi. À la date de cette revue, aucun package réseau n'était installé. Depuis, FishNet 4.7.4 a été déclaré uniquement dans le manifeste de la branche isolée `spike/fishnet-unity-6-3-evaluation`. La résolution réelle par Unity reste à effectuer.


## Ordre de priorité proposé pour les essais (sans décision finale)

1. **FishNet + transport gratuit compatible** : premier candidat Unity à qualifier, car la fiche actuelle annonce une version conçue pour Unity 6000.3.17, le modèle serveur autoritaire et l'absence de plafond CCU imposé par FishNet. Conditions bloquantes : valider la licence personnalisée du dépôt ou l'EULA exacte du paquet retenu, l'ensemble des notices tierces, la génération d'un serveur dédié, et le comportement sur deux clients.
2. **Unity NGO + Unity Transport** : candidat de comparaison officiel Unity, pertinent pour un client Unity natif et les plateformes ciblées. Conditions bloquantes : figer des versions de packages compatibles entre elles, confirmer la licence Unity applicable à la version exacte, et vérifier la chaîne de build serveur dédiée.
3. **WebSocket Node.js** : candidat de référence simple pour mesurer la réplication depuis deux navigateurs et réutiliser le backend Node. Il ne doit pas être choisi uniquement parce que son premier prototype est plus facile : la simulation, la sécurité, l'interpolation et le coût CPU restent à démontrer.
4. **Mirror** : candidat mis en attente. Sa licence MIT est attractive, mais sa documentation actuelle recommande Unity 2020/2021 LTS et ne garantit pas le support des versions plus récentes. Ne pas le retenir sans une preuve de compatibilité Unity 6.3.

Ce classement définit l'ordre d'investigation. FishNet 4.7.4 est désormais ajouté uniquement à la branche isolée, conformément à la décision du créateur ; cela ne vaut pas validation de production. Le test comparatif doit conserver les mêmes règles de validation, le même scénario et les mêmes métriques pour chaque candidat.


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


## Résultat du benchmark loopback CI (16 novembre 2026)

Le workflow GitHub Actions `43821673511` a terminé avec succès. Le job `automated-tests` a validé les tests serveur/gameplay, la sauvegarde/restauration PostgreSQL, le benchmark WebSocket et les tests Chromium desktop/mobile.

Mesures du runner CI, sur 20 échanges entre deux clients Node.js connectés en loopback :

- Délai action A → snapshot observé par B : moyenne **0,562 ms**, médiane **0,535 ms**, p95 **0,682 ms**, p99 **0,724 ms**.
- Débit observé pendant cette séquence : **18,84 mises à jour/s**.
- Taille moyenne du snapshot : **297,9 octets**.
- CPU mesuré par le processus pendant le test : **15,72 ms**.
- RSS du processus : **62 808 064 octets** avant et **64 626 688 octets** après.

Ces valeurs caractérisent uniquement ce runner CI et ce test court de loopback. Elles ne sont pas transposables à un réseau WAN, à Android, à Unity, à un serveur dédié de production ou à une capacité de joueurs simultanés. Elles ne permettent pas de choisir le protocole final. Les essais FishNet et NGO à deux clients Unity restent à effectuer.


## Simulation déterministe de conditions réseau (16 novembre 2026)

Un second banc d'essai est ajouté dans `scripts/benchmark-realtime-network-conditions.js`, lancé par `npm run benchmark:realtime:conditions`. Le scénario CI prévu utilise 100 intentions, 25 ms de délai simulé par sens, une gigue déterministe de ±10 ms et la suppression d'un snapshot sur dix.

- Le délai est injecté au niveau applicatif avant l'envoi de l'intention et avant la remise du snapshot au client B.
- La suppression porte sur la remise applicative d'un snapshot, pas sur des paquets IP. WebSocket/TCP retransmet les paquets ; ce test ne doit donc pas être présenté comme une vraie simulation de perte de paquets.
- La mesure « intention → observation autre client » inclut désormais le délai simulé montant et descendant.
- Les résultats ne représentent pas un réseau WAN réel, un appareil Android ou un client Unity. Une future étape devra utiliser un émulateur réseau au niveau système ou des appareils distants pour valider pertes et gigue réseau réelles.

**État :** le script et son intégration CI sont committés. Résultat d'exécution CI à confirmer avant de considérer ce test validé.


### Résultats du banc d'essai avec délai/gigue/suppression (16 novembre 2026)

Le workflow GitHub Actions `43823726449` a terminé avec succès sur le commit `90db3b3ed64d2001874eda12625ae078f4c1d954`. Le benchmark a envoyé 100 intentions depuis le client A avec 25 ms de délai applicatif unidirectionnel, une gigue déterministe de ±10 ms et une suppression volontaire d'un snapshot sur dix.

| Mesure | Résultat |
|---|---:|
| Intentions envoyées | 100 |
| Snapshots livrés | 90 |
| Snapshots supprimés volontairement | 10 |
| Taux de suppression applicative | 10 % |
| Délai action A → observation B, minimum | 40,75 ms |
| Moyenne | 50,89 ms |
| p50 | 50,89 ms |
| p95 | 61,04 ms |
| p99 / maximum | 61,64 ms |
| Débit observé | 11,33 mises à jour/s |
| Durée totale | 7 941,67 ms |

**Interprétation :** le banc confirme que le prototype tolère le scénario déterministe prévu et que le workflow complet passe. Le délai mesuré comprend les délais applicatifs simulés et le traitement local du runner. Ce n'est ni une mesure WAN ni une perte de paquets TCP/IP ; les snapshots supprimés sont écartés au niveau du banc d'essai. Le résultat ne prouve rien sur Android physique, Unity, les réseaux mobiles, la capacité serveur ou la production.

Le workflow complet a également validé les tests Node, PostgreSQL, backup/restore, le benchmark WebSocket loopback et les trois scénarios Chromium desktop/mobile.


## Revue comparative ciblée — Unity 6.3 LTS (16 novembre 2026)

La vérification des sources officielles et des fiches de distribution précise les candidats avant toute installation :

| Critère | FishNet 4.7.4R | Unity Netcode for GameObjects |
|---|---|---|
| Compatibilité Unity | La documentation FishNet indique Unity 6 LTS entièrement pris en charge ; la fiche Asset Store indique une version d'origine 6000.3.17, proche de notre éditeur 6000.3.28f1. | L'installation officielle indique Unity 2021.3+ et Android/iOS/PC ; la page de packages Unity 6000.3 consultée liste NGO 2.14.0 en préversion. |
| Coût du framework | Fiche Unity Asset Store indiquée FREE ; licence de distribution affichée : Standard Unity Asset Store EULA. | Package Unity sans prix d'achat affiché, mais nécessite un compte Unity actif et une licence valide. Les services Unity hébergés ne sont pas nécessaires pour le test auto-hébergé. |
| Transport | Architecture à transports interchangeables ; le transport concret devra être choisi et vérifié avec le serveur dédié. | Unity Transport officiel, couche bas niveau utilisant UDP et WebSockets, avec pipelines de fiabilité, ordre et fragmentation. |
| Plateformes | La compatibilité Unity 6 est déclarée par FishNet ; Android et builds serveur doivent être réellement testés dans notre projet. | Android/iOS et la plupart des consoles indiqués dans les prérequis NGO ; les plateformes fermées ont leurs conditions propres. |
| Licence | Fiche Asset Store : Standard Unity Asset Store EULA. Vérifier les notices et licences de tout transport ou dépendance tierce ajouté. | Vérifier les conditions exactes du package et de la version installée ; ne pas présumer qu'une licence de package équivaut à une licence MIT. |

Sources officielles consultées :
- FishNet : [compatibilité Unity](https://github.com/FirstGearGames/FishNet-Documentation/blob/main/overview/readme/features/unity-compatibility.md), [fiche Asset Store](https://assetstore.unity.com/packages/tools/network/fishnet-networking-evolved-207815), [présentation et modèle serveur](https://fish-networking.gitbook.io/docs).
- Unity NGO : [installation et plateformes](https://github.com/Unity-Technologies/com.unity.multiplayer.docs/blob/main/docs/installation/installation.md), [packages disponibles pour Unity 6000.3](https://docs.unity.com/en-us/engine/6000.3/manual/packages-list/packages-all/pack-preview/com-unity-netcode-gameobjects), [transport officiel](https://github.com/Unity-Technologies/com.unity.multiplayer.docs/blob/main/transport/about.md), [choix des frameworks Unity](https://docs.unity.com/multiplayer/netcode/netcode).

### Décision provisoire de l'investigation

FishNet devient le **premier candidat à prototyper** dans le projet Unity, et NGO reste le comparateur officiel. Raisons : FishNet est distribué gratuitement sur l'Asset Store, annonce explicitement le support Unity 6 LTS et sa version publiée cible une version 6000.3 très proche de notre éditeur. NGO conserve l'avantage de l'intégration officielle et de la documentation transport, mais le catalogue Unity 6000.3 consulté présente NGO 2.14.0 comme préversion ; il faudra identifier une version stable compatible avant le test comparatif.

Cette priorité n'est **pas une décision finale de protocole**. Aucun package n'a été installé et le manifeste Unity reste inchangé. Avant intégration, il faut relever les versions exactes, lire les licences incluses dans les archives de packages, créer un build serveur dédié et faire communiquer deux clients distincts. Le backend Node/PostgreSQL reste responsable des comptes et de la persistance applicative ; le candidat réseau ne doit pas être autorisé à faire confiance aux positions, dégâts ou récompenses fournis par les clients.


## Mise à jour de l'intégration FishNet (16 novembre 2026)

À la demande du propriétaire, FishNet 4.7.4 devient le premier candidat intégré au prototype Unity, sans contact préalable avec FirstGearGames. La dépendance est déclarée uniquement sur la branche isolée, via le Package Manager Git URL épinglé au tag 4.7.4. La question de licence est différée tant qu'ASTREA reste un prototype interne et devra être réexaminée avant toute publication ou distribution externe.

La déclaration UPM n'est pas encore une importation vérifiée : il faut ouvrir le projet sous Unity 6000.3.28f1, résoudre le package, compiler, puis réaliser le test serveur dédié + deux clients. Le backend Node/WebSocket reste inchangé et aucun pont FishNet/backend n'est encore codé.


## Décision d'architecture de prototype (16 novembre 2026)

FishNet 4.7.4 est maintenant le framework choisi pour le prochain essai de serveur Unity dédié, sur la seule branche `spike/fishnet-unity-6-3-evaluation`. Ce choix est une décision de prototype, pas une validation de compatibilité, un protocole de production ou une promesse de capacité.

L'architecture cible du prototype est la suivante :
- Unity/FishNet porte la simulation temps réel autoritaire par zone.
- Node.js reste responsable des comptes, sessions HTTPS, personnages et règles métier persistantes.
- PostgreSQL conserve les données durables ; l'état fréquent de simulation reste en mémoire côté serveur de zone.
- Le client reçoit un ticket opaque à usage unique et de courte durée via HTTPS, puis le présente au FishNet Authenticator. Le serveur Unity doit valider/consommer ce ticket auprès de l'API Node avant d'autoriser la connexion. Le jeton Bearer de compte ne doit jamais être envoyé sur le canal temps réel.
- Le prototype Node WebSocket reste la baseline de mesure ; il n'est pas le transport de FishNet et son ticket actuel n'est pas directement réutilisable.

L'objectif d'un million concerne les comptes inscrits dans un royaume logique, pas un million de connexions simultanées sur un seul processus. Un royaume devra pouvoir répartir les zones et instances sur plusieurs processus/machines, selon les résultats mesurés. Le nombre de joueurs simultanés par zone reste inconnu.

Voir [ADR-001 — Architecture du serveur de monde et intégration FishNet](adr-001-fishnet-world-server-architecture.md) pour les responsabilités, le flux de ticket, les risques et les critères d'acceptation.

### État réel après la décision
- [x] FishNet 4.7.4 déclaré dans le manifeste UPM de la branche isolée.
- [x] Architecture de prototype et frontière Node API / serveur Unity documentées.
- [ ] Résolution du package par Unity 6000.3.28f1 et compilation Editor.
- [ ] Build Linux Dedicated Server.
- [ ] Authenticator FishNet relié à un ticket consommable et vérifié côté Node.
- [ ] Deux clients Unity connectés au serveur dédié.
- [ ] Comparaison des mesures FishNet et Node sur scénarios équivalents.
- [ ] Test sur réseau distant et Android physique.

Le test réseau Node déjà réussi ne ferme aucun de ces critères Unity.

## État actualisé du pont FishNet (16 novembre 2026)

Le pont n'est plus seulement une proposition documentaire : les routes de ticket Node/PostgreSQL, l'adaptateur Unity, l'Authenticator FishNet, le spawner serveur, le proxy de test et le client automatisé sont présents sur la branche isolée. Un workflow manuel construit les deux binaires Linux et tente le scénario réel à deux clients.

Les tests backend et les contrôles de source sont passés. La scène Unity n'a pas encore été ouverte/compilée par Unity Editor et le workflow end-to-end n'a pas été lancé. Le protocole de production et la capacité restent donc non validés.


## État révisé — 21 novembre 2026

- FishNet 4.7.4 est épinglé dans `unity/Packages/manifest.json` sur `spike/fishnet-unity-6-3-evaluation` uniquement. La branche principale n'est pas modifiée.
- L'API du tag FishNet 4.7.4 utilisée par ASTREA est vérifiée en CI ; les scripts réseau et l'adaptateur API client passent une compilation .NET contre stubs isolés. Le test d'URL confirme HTTPS distant et HTTP loopback seulement.
- Le backend FishNet utilise un ticket opaque de 30 secondes, hashé en base, lié au personnage et au serveur, consommé atomiquement. Le champ `serverId` est obligatoire à la consommation. Tests Node/PostgreSQL réussis.
- Un Authenticator, un spawner serveur et un banc de test à deux clients sont présents. La scène et les exécutables sont générés au build Unity.
- Le workflow de deux clients a été tenté, mais s'est arrêté avant le build car les secrets Unity Personal n'étaient pas configurés. La procédure est documentée dans `docs/unity-ci-license-setup.md`.
- Tugboat est réservé aux tests locaux contrôlés. Un transport chiffré est requis avant tout réseau public ; FishyUnityTransport est étudié, mais pas installé.

**Conclusion :** la baseline Node est mesurée ; l'intégration FishNet est préparée et partiellement vérifiée par CI, mais l'étape de validation Unity réelle demeure ouverte. Aucun résultat deux clients FishNet n'est revendiqué.
