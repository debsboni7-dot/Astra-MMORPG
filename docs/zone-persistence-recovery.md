# ASTREA — persistance et reprise des serveurs de zone

Date : 21 novembre 2026  
Statut : socle PostgreSQL implémenté et testé ; API interne et bootstrap de bail/récupération FishNet ajoutés ; événements gameplay et snapshots réels encore à raccorder

## Objectif

Un monde persistant ne peut pas dépendre uniquement de la mémoire d'un processus Unity. Un crash, une mise à jour ou un redémarrage ne doit pas effacer les comptes, personnages, transactions, territoires ou modifications durables du monde.

## Répartition des états

| État | Autorité | Persistance |
|---|---|---|
| Comptes, sessions, personnages | API Node | PostgreSQL transactionnel |
| XP, maîtrises, équipement, inventaire | règles serveur/API | PostgreSQL, écritures transactionnelles |
| Monnaie, échanges, taxes, récompenses | API transactionnelle | journal d'opérations idempotentes PostgreSQL |
| Position courante et mouvement | FishNet zone server | mémoire ; sauvegarde de position aux points utiles (déconnexion, transfert, checkpoint) |
| Combat instantané, projectiles, cooldowns courts | FishNet zone server | mémoire ; seuls les résultats durables sont enregistrés |
| Ressources récoltables et états persistants de la zone | FishNet zone server | événements durables + snapshots périodiques |
| État politique/territorial | API métier + serveur autoritaire | PostgreSQL transactionnel |

Les états de simulation à haute fréquence ne doivent pas déclencher une écriture SQL par tick. Les opérations qui ont une valeur persistante (achat, échange, récompense, taxe, conquête, création de territoire) doivent être validées et enregistrées avant d'être annoncées comme acquises.

## Modèle proposé

### Journal d'événements durables

Chaque changement durable reçoit un identifiant unique et une séquence monotone par zone. Une opération contient au minimum :
- event_id UUID, unique globalement ;
- zone_id stable ;
- sequence BIGINT monotone par zone ;
- event_type versionné ;
- payload JSONB validé côté serveur ;
- horodatage serveur.

Contraintes obligatoires : unicité de event_id, unicité de (zone_id, sequence), transactions PostgreSQL, et traitement idempotent. Le client ne fournit jamais la séquence ou la preuve qu'un événement a été accepté.

### Snapshots de zone

Un snapshot représente l'état durable agrégé d'une zone à une séquence connue :
- zone_id ;
- snapshot_version ;
- last_event_sequence ;
- schema_version ;
- created_at ;
- payload JSONB.

Le snapshot est créé périodiquement et après les opérations de maintenance importantes. L'intervalle initial doit être choisi par mesure ; 30 à 60 secondes peut servir de première hypothèse de benchmark, pas de garantie de perte maximale.

### Reprise après arrêt

1. Le processus démarre et obtient l'exclusivité d'autorité sur son zone_id.
2. Il charge le dernier snapshot valide.
3. Il rejoue les événements durables après last_event_sequence, dans l'ordre.
4. Il vérifie les invariants et marque la zone prête seulement après reconstruction.
5. Les clients peuvent alors recevoir de nouveaux tickets/rejoindre la zone.
6. À l'arrêt gracieux, le serveur cesse d'accepter de nouvelles connexions, finalise les opérations en cours et écrit un checkpoint.

Si un processus tombe brutalement, PostgreSQL reste la source durable. Les mouvements et effets transitoires peuvent être perdus ; les achats, transactions, récompenses et changements durables ne doivent pas l'être.

## Éviter deux serveurs autoritaires pour la même zone

Le prototype doit garder un seul processus autoritaire par zone. Avant le multi-zone de production, il faudra un bail/lease durable avec expiration et fencing token (epoch) afin qu'un ancien processus ralenti ne continue pas à écrire après qu'un remplaçant a pris la zone.

Une solution initiale peut s'appuyer sur un verrou advisory PostgreSQL ou une table de leases transactionnelle. Le choix définitif dépendra des essais de redémarrage et de la topologie d'hébergement. Aucun Redis ou orchestrateur payant n'est requis pour démontrer ce comportement au prototype.

## Sécurité et cohérence

- L'API valide ownership et règles métier ; le serveur FishNet valide les intentions de simulation.
- Les événements et commandes sensibles sont idempotents.
- Les mises à jour de monnaie/inventaire et leur événement d'audit sont écrits dans une même transaction.
- Les secrets serveur et clés DTLS restent hors des snapshots et des journaux.
- Une sauvegarde PostgreSQL est restaurée dans une base distincte lors des exercices de reprise.

## Tests requis avant de considérer la persistance de zone validée

1. Créer une ressource de zone, produire un événement durable et un snapshot.
2. Arrêter brutalement le serveur, le redémarrer et vérifier que la ressource et la séquence sont restaurées.
3. Rejouer deux fois le même event_id : aucune duplication ne doit apparaître.
4. Simuler un ancien serveur encore actif après expiration de son lease : ses écritures doivent être rejetées.
5. Redémarrer l'API et le serveur de zone séparément, sans perte des données persistantes.
6. Restaurer PostgreSQL depuis une sauvegarde et reconstruire la zone.

## Implémentation du socle PostgreSQL — 21 novembre 2026

La migration `006_world_zone_persistence.sql` crée les tables `world_zone_state`, `world_zone_leases`, `world_zone_events` et `world_zone_snapshots`.

Le dépôt `PostgresRepository` fournit :
- acquisition atomique d'un bail exclusif, avec epoch de fencing croissant ;
- renouvellement uniquement si le propriétaire, l'epoch et l'expiration sont encore valides ;
- vérification des échéances avec `clock_timestamp()` (heure réelle de la vérification, pas l'heure figée au début d'une transaction) afin qu'une attente de verrou ne prolonge pas artificiellement un bail expiré ;
- ajout d'événement dans une transaction, avec séquence monotone par zone ;
- idempotence par UUID global et comparaison JSONB côté PostgreSQL ;
- snapshot qui ne peut pas reculer la séquence ;
- chargement du dernier snapshot puis des événements strictement postérieurs, dans l'ordre, dans une transaction qui exige le bail et l'epoch actifs ;

Le service `ZonePersistenceService` valide les identifiants, UUID, types d'événement, versions de schéma et payloads JSON (objet, limite 256 KiB). Les opérations d'écriture refusent les processus sans bail actif ou avec un ancien fencing epoch.

Une API serveur-à-serveur protégée par `X-Astrea-Server-Key` expose acquisition/renouvellement de bail, ajout d'événements, sauvegarde de snapshots et lecture de reprise. Sur la scène de test, `AstreaFishNetZonePersistence` acquiert le bail, charge le JSON de récupération, puis seulement démarre FishNet. Il renouvelle le bail toutes les 10 secondes et arrête le serveur si le bail ou l'epoch n'est plus valide. Le générateur de scène désactive le démarrage headless automatique de FishNet pour empêcher l'ouverture du port avant la récupération.

Le test PostgreSQL réel couvre :
1. création d'un événement et snapshot à la séquence 1 ;
2. événement 2 non encore inclus dans le snapshot ;
3. reconstitution de l'état à partir du snapshot + événement 2 après simulation de crash ;
4. rejet d'une réémission identique avec contenu différent et acceptation idempotente d'un doublon identique ;
5. expiration du bail et acquisition par un nouveau processus à l'epoch 2 ;
6. refus d'écriture de l'ancien processus ;
7. événement 3, relecture et création d'un nouveau snapshot à la séquence 3 ;
8. acquisition concurrente par deux processus : un seul gagne ; 24 événements parallèles reçoivent des séquences continues ;
9. tentative de lecture de reprise par l'ancien processus après fencing : refusée.

Le workflow de sauvegarde/restauration vérifie également que le snapshot, l'événement et le bail de zone survivent à un dump PostgreSQL restauré dans une base distincte.

**Limites :** le journal n'a pas encore de politique de compaction/archivage ; il faut définir une rétention qui ne supprime jamais les événements nécessaires à la reprise ou à l'audit. Le bootstrap Unity et les routes HTTP sont écrits et vérifiés par compilation .NET isolée, mais pas encore par Unity Editor. Les systèmes de gameplay n'envoient pas encore leurs événements/snapshots réels, et le redémarrage d'un build Linux dédié reste à exécuter après déblocage de la licence Unity.

## État actuel

Déjà présent et testé : comptes, sessions, personnages, progression, état de combat magique, tickets FishNet à usage unique, sauvegarde/restauration PostgreSQL, journal de zone, snapshots, idempotence, bail exclusif et fencing.

En attente : émission des événements/snapshots par les systèmes de gameplay, checkpoint à l'arrêt, validation Unity réelle, restauration après crash d'un serveur Unity dédié et test de deux processus FishNet réels.
