# ADR-001 — Architecture du serveur de monde et intégration FishNet

Date : 16 novembre 2026  
Statut : **décision de prototype**, non décision de production  
Branche : `spike/fishnet-unity-6-3-evaluation`

## Contexte

ASTREA possède déjà un backend Node.js modulaire, une API HTTP versionnée, des migrations PostgreSQL et un prototype temps réel WebSocket à deux clients. Le client natif est Unity 6.3 LTS. FishNet 4.7.4 est déclaré comme dépendance UPM sur cette branche uniquement.

Ces composants ne sont pas interchangeables :
- le WebSocket Node.js actuel est un serveur de démonstration autonome, avec salles et tickets en mémoire ;
- FishNet est un framework de réseau Unity, prévu pour connecter des clients à un serveur Unity ;
- déclarer FishNet dans le manifeste ne prouve ni sa résolution, ni sa compilation, ni son fonctionnement.

Le ticket actuel `POST /v1/realtime/tickets` est conçu pour le serveur WebSocket Node.js et appelle directement son émetteur de tickets. Il ne doit pas être présenté comme compatible FishNet.

## Décision de prototype

### Responsabilités

| Composant | Responsabilité retenue |
|---|---|
| Unity client | rendu, interface, contrôles, prédiction visuelle limitée et envoi d'intentions |
| FishNet sur serveur Unity dédié | connexions de jeu, réplication et simulation temps réel autoritaire par zone |
| Node.js API | comptes, sessions HTTP, personnages, progression persistante, règles métier et émission/validation des tickets de connexion |
| PostgreSQL | comptes, sessions, personnages et états persistants transactionnels |
| WebSocket Node.js existant | référence expérimentale et banc de comparaison, pas transport FishNet |

Le client ne décide jamais des positions finales, dégâts, soins, cooldowns, gains d'expérience, butins, soldes ou récompenses. Le serveur de zone valide et calcule ces résultats.

### Flux d'authentification cible

1. Le client se connecte à l'API Node.js en HTTPS et obtient une session de compte.
2. Le client demande un ticket de connexion pour un personnage dont il est propriétaire.
3. L'API délivre un ticket opaque, aléatoire, à usage unique et de courte durée (objectif initial : 30 secondes).
4. Le client présente uniquement ce ticket au composant Authenticator FishNet. Le jeton Bearer longue durée n'est jamais transmis au transport de jeu.
5. Le serveur Unity valide et consomme le ticket auprès de l'API Node.js par un canal serveur-à-serveur authentifié.
6. L'API confirme l'identité du compte, du personnage, du monde/serveur cible, l'expiration et l'absence de consommation antérieure.
7. FishNet authentifie la connexion seulement après validation positive. Sinon, la connexion est rejetée.

**Sécurité obligatoire avant implémentation publique :** ticket stocké sous forme de hash, consommation atomique à usage unique, TTL vérifié côté serveur, liaison au personnage et à la destination, protection contre rejeu, secret serveur hors dépôt, HTTPS entre serveur Unity et API, limitation de débit et journaux sans jeton. Le mécanisme actuel en mémoire ne répond pas à toutes ces exigences.

### Transport et hébergement

- Le transport FishNet par défaut (Tugboat) est un candidat UDP à qualifier. Aucun port ni protocole n'est déclaré définitif avant les tests.
- Le serveur de jeu devra être un build Unity Dedicated Server sans rendu, séparé du client Android.
- Les API de compte utilisent HTTPS. Le trafic temps réel utilise le transport FishNet sélectionné.
- PostgreSQL ne reçoit pas une écriture par image ou par tick. Les positions et états fréquents restent en mémoire sur le serveur de zone ; les changements persistants sont sauvegardés selon une stratégie transactionnelle et récupérable.
- Le prototype reste un monolithe modulaire côté API. Pas de microservices, Redis, Kubernetes ou service payant sans mesure démontrant leur nécessité.

## Interprétation de l'objectif de population

L'objectif du créateur est d'un million de comptes inscrits par serveur logique, et non d'un million de joueurs simultanés sur un seul processus.

Pour l'architecture, « serveur logique/royaume » doit donc être composé de plusieurs processus de zones/instances, répartis sur plusieurs machines si les mesures l'exigent. Le nombre de connexions simultanées par zone, par machine et par région reste à déterminer par benchmark. Aucun chiffre de capacité n'est garanti à ce stade.

Paliers de qualification proposés : 2 clients, puis 10, 25 et 50 clients par scénario/zone, uniquement si le palier précédent est stable. Mesurer p50/p95/p99, CPU, mémoire, bande passante, fréquence des snapshots, reconnexions et taux de rejet des entrées invalides.

## Pourquoi ne pas connecter FishNet directement au WebSocket actuel ?

Le serveur Node.js existant implémente son propre handshake WebSocket et son propre protocole JSON. FishNet utilise un transport réseau et un cycle d'authentification distincts. Ajouter FishNet au manifeste ne crée aucun pont entre ces deux systèmes. Un pont artisanal qui ferait croire qu'ils partagent le même protocole introduirait une fausse intégration et une surface de sécurité supplémentaire.

La décision de prototype est donc de conserver le WebSocket Node comme baseline et d'évaluer FishNet avec un serveur Unity dédié. L'API Node reste la source d'identité et de persistance.

## Portée et limites de la décision

Cette ADR autorise le prototype FishNet sur la branche isolée uniquement. Elle ne valide pas :
- la résolution UPM par Unity 6.3 ;
- la compilation Editor ;
- un build Linux Dedicated Server ;
- un client Android connecté ;
- un Authenticator connecté à l'API Node ;
- une simulation de combat autoritaire complète ;
- les tests WAN, le mobile physique, la charge ou la capacité de production ;
- la licence pour une distribution publique. Le contrôle juridique FishNet est différé par décision du créateur jusqu'avant publication/distribution.

Le dépôt ne doit pas fusionner cette dépendance dans la branche principale avant les validations techniques et la revue de sortie de phase.

## Critères d'acceptation du prototype FishNet

- [ ] Unity 6000.3.28f1 résout FishNet 4.7.4 et ses dépendances sans erreur.
- [ ] Compilation complète du projet Unity.
- [ ] Build Linux Dedicated Server réussi.
- [ ] Deux clients rejoignent un serveur dédié et se voient.
- [ ] Le serveur valide les déplacements ; un client ne peut pas imposer une position arbitraire.
- [ ] Ticket invalide, expiré, consommé ou lié à un autre personnage rejeté.
- [ ] Reconnexion et déconnexion sans joueur fantôme ni duplication d'identité.
- [ ] Mesures comparables au prototype Node WebSocket.
- [ ] Limites et coûts d'hébergement documentés, sans engagement payant.

**Conclusion :** FishNet est le framework choisi pour le prochain essai Unity dédié, mais le protocole de production et la capacité de charge ne sont pas encore déclarés validés.


## Mise à jour d'implémentation — tickets de connexion (16 novembre 2026)

Une première tranche backend est maintenant intégrée sur la branche isolée :
- migration PostgreSQL `004_realtime_join_tickets.sql` ;
- tickets aléatoires 256 bits, 30 secondes, liés au compte, personnage et serveur ;
- seul le hash SHA-256 est stocké ;
- consommation PostgreSQL atomique à usage unique ;
- route joueur authentifiée `POST /v1/realtime/fishnet/tickets` ;
- route interne `POST /v1/internal/realtime/fishnet/consume`, protégée par `X-Astrea-Server-Key` avec comparaison en temps constant ;
- méthode Unity `AstreaApiClient.RequestFishNetJoinTicket`.

Les tests Node couvrent l'émission, l'ownership, le hash au repos, le rejet de rejeu et le secret serveur. Le test PostgreSQL CI couvre la migration et la consommation atomique sur une vraie instance PostgreSQL.

**Non terminé :** le custom Authenticator FishNet qui enverra le ticket au serveur, le client HTTP serveur-à-serveur, l'identification/spawn du joueur et le test deux clients FishNet. Ces éléments nécessitent une compilation Unity réelle et une validation du contrat exact de la version 4.7.4.


## Mise à jour — Authenticator FishNet (prototype de code)

Le dépôt contient maintenant `AstreaFishNetAuthenticator`, basé sur l'API Authenticator de FishNet 4.7.4 :
- le client transmet un ticket par broadcast fiable après la connexion transport ;
- le serveur refuse les tickets mal formés et les connexions qui n'en présentent pas en 10 secondes ;
- le serveur appelle l'endpoint interne Node en HTTPS avec le secret d'environnement `REALTIME_SERVER_SECRET` ;
- l'identité retournée est liée à la connexion et exposée par l'événement `OnClientIdentityAuthenticated` ;
- les réponses tardives après déconnexion sont ignorées.

Le composant n'a pas encore été compilé par Unity. Il faut encore le placer dans un NetworkManager FishNet, configurer les variables d'environnement du serveur, connecter le retour d'identité au spawn du personnage, puis vérifier le flux avec deux clients réels. L'existence du code et les assertions source CI ne constituent pas une compilation.


## Mise à jour — spawn joueur après authentification

Le composant `AstreaFishNetPlayerSpawner` écoute l'événement émis après que FishNet a accepté le résultat d'authentification. Il crée ensuite un `NetworkObject`, y attache l'identité compte/personnage côté serveur et le spawn avec le `NetworkConnection` propriétaire. Les connexions non authentifiées ne sont donc pas éligibles au spawn. Le prefab doit contenir un `NetworkObject` et être enregistré dans les Spawnable Prefabs du NetworkManager.

Cette étape fournit le point d'accroche serveur pour la création de l'avatar, mais aucun prefab de joueur réseau final n'est encore configuré. Elle n'est pas validée en Play Mode ni sur deux clients.


## Build Linux Dedicated Server

Le point d'entrée `AstreaCloudBuild.BuildLinuxDedicatedServer` et le workflow manuel `unity-linux-server-build.yml` sont ajoutés. Il utilise Unity `6000.3.28f1`, cible `StandaloneLinux64` et définit le sous-cible `StandaloneBuildSubtarget.Server`. Le workflow vérifie la présence du secret `UNITY_LICENSE` avant de lancer le build. Il n'a pas été exécuté à ce stade.


## Test end-to-end deux clients préparé

Le dépôt dispose désormais d'une scène de test isolée construite par `AstreaFishNetPrototypeSceneBuilder`, d'un proxy réseau temporaire avec `NetworkObject` + `NetworkTransform` serveur-autoritaire, et d'un client de test automatisé. Le client 1 envoie une intention de déplacement via ServerRpc ; le client 2 doit constater le déplacement répliqué par le serveur.

Le workflow manuel `unity-fishnet-two-client-integration.yml` orchestre PostgreSQL, les migrations, l'API Node, deux comptes/personnages, deux tickets à usage unique, le serveur Linux dédié et les deux clients Linux. Il n'a pas encore été exécuté ; sa réussite reste une porte bloquante.


## Contrat de consommation de ticket renforcé — 21 novembre 2026

La route interne exige désormais les deux champs `ticket` (43 caractères base64url) et `serverId` explicite. Une valeur serveur absente, mal formée ou différente de la zone configurée est rejetée ; la valeur par défaut JavaScript ne peut donc pas masquer l'absence de cible. Les tests HTTP couvrent le secret absent/incorrect, le serverId absent, le serverId incorrect, le succès et le rejeu.

Le workflow Unity Foundation compile les scripts de réseau contre des stubs isolés .NET et vérifie les signatures de FishNet 4.7.4. Cette vérification attrape les erreurs C# de surface, mais ne remplace pas Unity Editor, la résolution UPM, ni un build player.


## Sécurité du transport temps réel — DTLS ajouté au prototype (21 novembre 2026)

Le ticket de connexion est transmis avant authentification : il doit donc être protégé par le transport, et non seulement par son usage unique et son expiration. Tugboat/UDP par défaut n'est pas chiffré et reste réservé aux essais locaux contrôlés.

### Transport candidat désormais intégré à la branche isolée

- FishyUnityTransport `2.0.0-pre.2`, code sous licence MIT, est maintenant déclaré dans `unity/Packages/manifest.json` uniquement sur `spike/fishnet-unity-6-3-evaluation`.
- Unity Transport `2.7.5` est explicitement épinglé. Unity publie cette version pour Unity Editor 6000.3.
- Le code Fishy active DTLS sur UDP ou TLS sur WebSocket lorsque `UseEncryption` est explicitement activé. Le réglage par défaut du transport est désactivé.
- Le serveur doit fournir un certificat PEM et sa clé privée. Le client vérifie le nom commun du serveur et peut utiliser un certificat CA explicite ou le magasin de certificats du système.
- `AstreaFishNetTransportSecurity` active le chiffrement et charge les éléments privés du serveur depuis les variables d'environnement. Aucun certificat privé ni clé n'est enregistré dans Git.
- Le générateur de scène de test remplace Tugboat par FishyUnityTransport et attache le configurateur DTLS.
- Le workflow deux clients génère une CA et un certificat serveur éphémères, puis les transmet aux processus serveur/client pour un test DTLS local. Ces certificats ne servent qu'au CI et ne sont pas des certificats de production.

### Compatibilité et limites à ne pas masquer

Le manifeste du package FishyUnityTransport 2.0.0-pre.2 déclare encore Unity Transport 1.3.1 comme dépendance, tandis que son assembly définit la branche API UTP 2.x à partir de la version `2.0.0-exp`. ASTREA épingle directement UTP 2.7.5 pour utiliser cette branche. Les sources exposent bien `UseEncryption`, `SetServerSecrets`, `SetClientSecrets` et les paramètres DTLS, et la CI vérifie ces contrats. Cela ne prouve pas encore que le solveur UPM de Unity 6000.3.28f1 résout le graphe sans conflit.

FishyUnityTransport reste un transport tiers avec un tag ancien/pré-release. Son intégration dans le manifeste est une expérience isolée, pas un choix de production. Il faut confirmer le package importé, la compilation Editor, le build Linux Dedicated Server et la connexion de deux clients avec validation de certificat avant de lever la porte sécurité.

Aucun service Unity Relay ou Multiplayer Services n'est ajouté. Le test vise une connexion directe client vers serveur dédié, sans facturation de service multijoueur. L'hébergement du serveur et du trafic réseau aura néanmoins un coût réel lors d'une exploitation publique.

Références techniques vérifiées :
- FishyUnityTransport 2.0.0-pre.2 et code source : https://github.com/ooonush/FishyUnityTransport/tree/2.0.0-pre.2
- FishyUnityTransport release : https://github.com/ooonush/FishyUnityTransport/releases/tag/2.0.0-pre.2
- Unity Transport 2.7.5 pour Unity 6000.3 : https://docs.unity.com/en-us/engine/6000.3/manual/packages-list/packages-all/pack-safe/com-unity-transport
- Unity Transport encrypted communications : https://docs.unity.cn/Packages/com.unity.transport%402.7/manual/client-server-secure.html

**Porte sécurité avant clôture de l'étape 3 :** confirmer résolution UPM et compilation Unity, puis réussir le scénario deux clients en DTLS avec validation du certificat. Le code source et les tests de configuration .NET ne remplacent pas cette preuve.
