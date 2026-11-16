# ASTREA — rapport de faisabilité technique, étape 3

Date de référence : 16 novembre 2026  
Statut : **architecture de prototype définie, validation technique Unity encore ouverte**  
Branche d'investigation réseau : `spike/fishnet-unity-6-3-evaluation`

## 1. Objet de l'étape

L'étape 3 doit démontrer que les exigences d'ASTREA peuvent être traduites en une architecture cohérente, mesurable, sécurisable et évolutive, sans engager de dépenses prématurées. Elle ne consiste pas à produire les modèles 3D ou le contenu final : ces travaux appartiennent aux étapes suivantes.

Ce rapport distingue :
- ce qui existe dans le dépôt et a été testé ;
- les décisions retenues pour le prototype ;
- les hypothèses encore non démontrées ;
- les portes qui empêchent de déclarer l'étape terminée.

## 2. Faisabilité générale

| Domaine | Évaluation | Décision |
|---|---|---|
| Client 3D Unity | Faisable, compilation exacte non encore prouvée | Unity 6.3 LTS + URP, Android en première cible de validation |
| PC / Mac | Faisable sous réserve des builds et profils qualité | Même client Unity, contrôles clavier/souris et manette |
| iPhone / iPad | Faisable sous réserve de build, signatures et tests physiques | À qualifier après la chaîne Android |
| PS4 / PS5 / Switch 2 | Conditionnel | Kits, accès éditeur, SDK et certifications requis ; aucune compatibilité garantie par le prototype |
| Backend comptes et progression | Fondation présente et testée en CI | Node.js 22+ modulaire, API HTTPS versionnée |
| Stockage persistant | Fondation PostgreSQL testée en CI | PostgreSQL transactionnel pour données durables |
| Multijoueur temps réel | Architecture de prototype définie, intégration FishNet non compilée | FishNet 4.7.4 sur branche isolée, serveur Unity dédié à qualifier |
| Monde persistant de grande échelle | Faisable par étapes, non démontré | Zones/instances, streaming et sauvegardes ; aucune capacité chiffrée promise |
| Un million de comptes inscrits | Objectif d'architecture, pas une charge simultanée | Royaume logique réparti sur plusieurs processus/zones |
| 40–60 FPS | Objectif de qualité, pas une mesure | Profils Android/PC et tests sur appareils physiques obligatoires |
| Production sans aucun coût | Non réaliste | Prototype sans facturation automatique ; production nécessitera calcul, réseau, stockage, sécurité et exploitation |

## 3. Architecture cible du prototype

### Client
Unity 6.3 LTS et URP gèrent le rendu, l'interface, les contrôles, les animations, les effets et la présentation. Le client envoie des intentions ; il ne décide pas des résultats sensibles.

### API applicative
Node.js 22+ reste le service de comptes, sessions, personnages, progression, règles métier et émission des tickets. L'API reste un monolithe modulaire au début. Aucun microservice n'est ajouté sans mesure qui justifie sa séparation.

### Simulation temps réel
FishNet 4.7.4 est le framework retenu pour le prochain prototype de serveur Unity dédié. Le serveur de zone sera autoritaire sur les déplacements validés, combats, dégâts, soins, ressources et récompenses. La dépendance n'est déclarée que sur la branche d'évaluation.

Le prototype Node WebSocket reste une référence de comparaison. Il ne partage pas le même transport ni le même handshake que FishNet.

### Persistance
PostgreSQL stocke les comptes, sessions, personnages et états durables. Les positions et états de simulation très fréquents restent en mémoire sur le serveur de zone. Les sauvegardes persistantes doivent être transactionnelles, idempotentes et restaurables.

Le serveur Unity ne doit pas écrire une ligne SQL à chaque image ou tick. Il doit passer par des opérations internes contrôlées pour les changements durables.

### Authentification réseau
Le client demande un ticket de 30 secondes après authentification HTTP. Le ticket est opaque, lié au compte, au personnage et au serveur cible ; seul son hash SHA-256 est stocké. Le serveur Unity le consomme une seule fois via une route Node interne protégée par secret serveur. Le jeton Bearer de compte ne transite jamais dans FishNet.

La route Node, la migration PostgreSQL, l'adaptateur HTTP Unity, l'Authenticator FishNet et le spawner conditionnel sont présents sur la branche isolée. La compilation et l'exécution réelle de ces composants restent à prouver.

## 4. Modèle de monde et montée en charge

Le monde ne doit pas être chargé comme une seule scène géante. Les continents et régions sont divisés en cellules/secteurs streamés, avec des instances pour les lieux ou événements nécessitant une population distincte.

Un « serveur » au sens du créateur désigne un royaume logique pouvant contenir de nombreux processus de zone. Il ne désigne pas un seul processus Unity capable de gérer un million de connexions simultanées.

Stratégie d'évaluation :
1. Deux clients sur une même zone.
2. Dix clients.
3. Vingt-cinq clients.
4. Cinquante clients.
5. Augmenter uniquement si les paliers précédents restent stables.

Chaque palier doit relever CPU, RAM, bande passante entrante/sortante, taille des snapshots, fréquence d'updates, latence p50/p95/p99, déconnexions, reconnexions et taux de rejet des entrées invalides. Les résultats loopback CI ne sont pas transposables au WAN.

La séparation des zones et le transfert entre zones sont des besoins d'architecture futurs, mais ne doivent pas être implémentés avant de connaître la charge et le modèle de visibilité réels.

## 5. Données et précision numérique

Les règles de progression d'ASTREA prévoient des statistiques pouvant atteindre 10 milliards. Un entier signé 32 bits ne suffit pas.

Décisions à préserver :
- niveau et compteurs bornés : type entier adapté à leur plage ;
- XP, monnaie, statistiques, dégâts cumulés et valeurs persistantes pouvant dépasser 2 147 483 647 : entier 64 bits côté C# (`long`) et `BIGINT` côté PostgreSQL ;
- ne pas utiliser `float` ou `double` pour les soldes, prix ou transactions financières ;
- stocker les monnaies en unités entières minimales ; utiliser une arithmétique décimale contrôlée pour les taux de conversion ;
- les valeurs de gameplay envoyées par le client sont des intentions, jamais une preuve de dégâts, de récompense ou de solde.

Ces règles devront être reflétées dans les schémas, sérialiseurs réseau, calculs de combat et tests de limites avant d'implémenter les systèmes économiques complets.

## 6. Exigences non fonctionnelles

- **Sécurité :** HTTPS hors boucle locale, secrets hors dépôt, tickets à usage unique, validation serveur, contrôle d'accès par propriétaire, limites de débit distribuées avant exposition publique, protection contre le rejeu et journaux sans jetons.
- **Persistance :** migrations versionnées, transactions, idempotence, sauvegardes chiffrées, restauration périodiquement testée et politique de rétention à définir.
- **Mobile :** URP, streaming, LOD, limitation des ombres/particules, profils qualité et tests sur téléphones de référence. Le navigateur mobile n'est pas une preuve de performance Unity native.
- **Réseau :** interpolation/prédiction à limiter au visuel ; l'autorité de simulation reste serveur.
- **Observabilité :** métriques par zone, journaux structurés, alertes, suivi des erreurs et outils d'administration avant bêta publique.
- **Économie :** journal de transactions et protections contre double dépense, duplication et rejeu.
- **Monde persistant :** sauvegarde/reprise, versionnement des données et migration sans effacer les royaumes.
- **Coûts :** aucune infrastructure payante ni facturation automatique sans accord explicite. L'absence de coût du framework ne signifie pas absence de coût d'hébergement.

## 7. Registre des risques

| Risque | Gravité | État / réponse |
|---|---|---|
| FishNet n'a pas encore été résolu par Unity | Élevée | Dépendance UPM épinglée ; résolution Editor obligatoire |
| Projet Unity non compilé sous 6000.3.28f1 | Élevée | Workflow de build licencié existant ; exécution encore nécessaire |
| Authenticator FishNet non compilé | Élevée | API exacte du tag 4.7.4 contrôlée par CI source ; compilation Editor toujours requise |
| Prefab NetworkManager et prefab joueur non configurés | Élevée | Spawner source ajouté ; scène et prefab réseau restent à créer/valider |
| Deux clients FishNet pas encore testés | Élevée | Critère bloquant de sortie |
| Performance WAN / Android inconnue | Élevée | Tests distants et appareil physique obligatoires |
| Capacité à grande échelle inconnue | Élevée | Ne pas annoncer de CCU avant benchmarks progressifs |
| Licence FishNet personnalisée | Moyenne | Revue différée selon la décision du créateur, à effectuer avant distribution publique |
| Consoles et certifications | Élevée | Dépend d'accès éditeur et SDK, hors preuve actuelle |
| Coût d'exploitation de production inconnu | Élevée | Modèle de charge et devis à établir avant déploiement public |

## 8. Preuves déjà obtenues

- Tests serveur, gameplay, HTTP, PostgreSQL 16, sauvegarde/restauration et Chromium desktop/mobile réussis dans GitHub Actions.
- Prototype Node WebSocket à deux clients avec état de déplacement autoritaire et rejet d'entrées invalides.
- Benchmark Node loopback et simulation applicative de délai/gigue/suppression de snapshots exécutés en CI. Ces résultats ne simulent pas une perte de paquets IP et ne mesurent pas le WAN.
- Tickets FishNet : tests d'émission, liaison au personnage, stockage du hash, rejeu, serveur cible, expiration et consommation concurrente atomique testés.
- Contrôles de source Unity et de métadonnées exécutés dans le workflow Unity Foundation.
- Le workflow de vérification source peut comparer les API utilisées avec le tag FishNet 4.7.4 exact ; cela ne remplace pas le compilateur Unity.

## 9. Portes obligatoires avant clôture de l'étape 3

- [x] Architecture logique client / API / simulation / persistance documentée.
- [x] Responsabilités serveur autoritaire et frontières des domaines définies.
- [x] Interprétation de l'objectif d'un million de comptes clarifiée.
- [x] Politique de coûts sans dépense automatique documentée.
- [x] Prototype Node WebSocket à deux clients testé.
- [x] Tickets FishNet durables, à usage unique et liés au serveur testés côté Node/PostgreSQL.
- [x] Adaptateur Unity pour demander le ticket ajouté.
- [x] Authenticator FishNet et point de spawn serveur ajoutés en code sur branche isolée.
- [x] Contrat API FishNet 4.7.4 vérifié statiquement dans CI.
- [ ] Résolution réelle UPM et compilation Unity 6000.3.28f1.
- [ ] Build Linux Dedicated Server réussi.
- [ ] Configuration d'un NetworkManager et d'un prefab NetworkObject de test dans une scène.
- [ ] Connexion de deux clients Unity, authentification par ticket et spawn réciproquement visible.
- [ ] Mesures FishNet comparables à la référence Node.
- [ ] Test WAN et au moins un appareil Android physique.
- [ ] Validation de la stratégie de persistance après arrêt/redémarrage du serveur de zone.

## 10. Conclusion

L'architecture est suffisamment définie pour poursuivre l'intégration, et plusieurs risques backend ont été réduits par des tests réels PostgreSQL/Node. Toutefois, l'étape 3 **n'est pas terminée** : l'intégration FishNet n'a pas encore passé le compilateur Unity, le build serveur dédié et le scénario de deux clients Unity.

La prochaine tâche reste donc une validation technique Unity, pas le démarrage de l'étape 4. Les critères non cochés sont des preuves manquantes, pas des tâches que l'on peut remplacer par davantage de documentation.


## Mise à jour build serveur dédié

Le projet contient maintenant un point d'entrée Unity Editor `AstreaCloudBuild.BuildLinuxDedicatedServer` qui demande explicitement le sous-cible `StandaloneBuildSubtarget.Server`, ainsi qu'un workflow manuel `.github/workflows/unity-linux-server-build.yml`. Le workflow exige `confirm_build=yes` et le secret `UNITY_LICENSE`, puis produit un artefact Linux Dedicated Server.

Le workflow est préparé, pas exécuté. Le dépôt ne prétend donc pas encore que le projet compile ou qu'un build serveur a réussi. La documentation Unity 6.3 confirme que le sous-cible Dedicated Server se sélectionne via `BuildPlayerOptions.subtarget = (int)StandaloneBuildSubtarget.Server`.
