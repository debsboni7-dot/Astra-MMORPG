# Couche serveur ASTREA — première fondation

## Dépendance d'exécution

Node.js 22+ et PostgreSQL. Le manifeste racine définit les modules ES et la dépendance `pg`. Exécuter `npm install`, puis démarrer avec `DATABASE_URL=... npm run start:server`.

## Migrations

Exécuter dans l'ordre :
1. `server/migrations/000_accounts_and_sessions.sql`
2. `server/migrations/001_character_weapon_progression.sql`
3. `server/migrations/002_character_magic_progression.sql`
4. `server/migrations/003_character_magic_combat_state.sql`
5. `server/migrations/004_realtime_join_tickets.sql`

La migration 001 crée la table `characters` avec identifiant UUID, propriétaire `account_id`, nom d'affichage et données JSONB, puis ajoute le bloc de progression. Si une table `characters` existe déjà, vérifier et adapter ses types/colonnes avant migration. Les personnages historiques doivent être rattachés à un compte avant production.

## Sécurité

- Mot de passe hashé avec scrypt et sel aléatoire.
- Sessions opaques aléatoires ; seul leur SHA-256 est stocké.
- L'ID de compte doit venir de la session authentifiée, jamais du corps de la requête.
- Les transactions verrouillent le personnage et vérifient `id + account_id`.
- Aucun endpoint client ne permet d'attribuer de l'XP. Le moteur serveur appelle le service de progression après résolution autoritaire d'une attaque réussie.
- HTTPS obligatoire en production. L'API applique maintenant une limite mémoire par IP et par route d'inscription/connexion (10 requêtes par fenêtre de 60 secondes par défaut, réponse 429 + Retry-After). Cette protection de prototype ne remplace pas une limite distribuée au reverse proxy/API gateway : les compteurs sont réinitialisés au redémarrage et chaque instance possède ses propres compteurs. Politique de récupération de compte et vérification e-mail à intégrer avant ouverture publique.

## État

Routes HTTP : `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET/POST /v1/characters`, `POST /v1/realtime/tickets`, `GET /v1/characters/:id/progression/weapons`, `GET /v1/characters/:id/progression/magic`, `GET /v1/characters/:id/progression/magic/:school`, `POST /v1/characters/:id/progression/magic/equip`, `GET /v1/characters/:id/combat/magic` et `POST /v1/characters/:id/combat/magic/cast`. Les routes de personnage/progression exigent un jeton Bearer. Les points et XP magiques sont attribués uniquement par des événements internes de progression/jeu, jamais par une route client. La progression n'est attribuée qu'en appelant le service depuis le moteur serveur après résolution de combat autoritaire.

La race du personnage est maintenant enregistrée dans `character_data.race`. La ressource de combat magique (PV, mana, recharge et effets temporaires) est persistée séparément dans `magic_combat_state`. Les sorts offensifs nécessitent encore un résolveur de cibles détenu par le serveur de monde : tant qu'il n'est pas branché, le service refuse proprement les cibles offensives au lieu de faire confiance aux dégâts ou aux statistiques envoyés par le client. Cette livraison ne constitue pas encore un serveur de combat temps réel et le prototype navigateur n'est pas encore connecté à ces routes. Les secrets, la chaîne PostgreSQL et le cycle de déploiement doivent être configurés dans l'environnement d'hébergement. Les secrets, la chaîne PostgreSQL et le cycle de déploiement doivent être configurés dans l'environnement d'hébergement.


## Limitation de débit : portée et limites
La limitation intégrée protège les routes d'inscription et de connexion avec un compteur à fenêtre fixe, basé sur l'adresse IP de la connexion TCP et la route. La limite par défaut est de 10 requêtes par fenêtre de 60 secondes. Les dépassements reçoivent HTTP 429 et un en-tête `Retry-After`. La table mémoire est bornée à 5 000 clés et les entrées les plus anciennes sont évincées lorsque cette limite est atteinte.
Cette protection convient aux tests et à une première exposition contrôlée, pas à un lancement public : elle n'est ni partagée entre plusieurs processus, ni persistante, et ne doit pas faire confiance à `X-Forwarded-For` sans configuration explicite d'un proxy de confiance. Avant production, ajouter une limite distribuée au niveau du reverse proxy/API gateway, surveiller les faux positifs et tester les scénarios multi-instance.


## Classification des erreurs HTTP
Les erreurs de validation et de format de requête retournent un statut client (400, ou 413 pour un corps trop volumineux). Les erreurs métier connues conservent leurs statuts dédiés. Toute exception inattendue d'un service ou de la base retourne HTTP 500 avec le code générique `INTERNAL_SERVER_ERROR`, sans exposer le message interne. Une journalisation structurée et une supervision opérationnelle restent à ajouter avant production.


## Prototype réseau temps réel (comparatif, non production)

Un premier candidat Node.js WebSocket est disponible dans `server/realtime/NodeWebSocketPrototypeServer.js`. Ses tests à deux clients sont lancés par `npm test` via `tests/node-websocket-prototype.test.js`. Le prototype vérifie tickets à usage unique, autorité serveur sur le déplacement, snapshots partagés, séquences, limitation de débit et rejet des positions/dégâts falsifiés.

Ce module est une base expérimentale : tickets, salles et positions sont en mémoire ; la reconnexion dans le même processus restaure position et séquence, mais aucun matchmaking, endpoint public de ticket, persistance après redémarrage, client Unity ou déploiement TLS n'est fourni. Ne pas l'exposer en production. Voir `docs/realtime-network-prototype.md` pour le scénario, les métriques et les limites.


## Tickets de connexion temps réel (prototype)

Après connexion HTTP, le client peut demander `POST /v1/realtime/tickets` avec un Bearer valide et un `characterId`. Le serveur vérifie que le personnage appartient au compte authentifié, puis délivre un ticket aléatoire à usage unique valable 30 secondes. Le jeton de session HTTP n'est pas transmis au canal WebSocket. Le client utilise ensuite ce ticket sur `/realtime/v1`, sur le même port HTTP, pour le prototype Node WebSocket.

La route ne permet pas de choisir un compte, un identifiant de joueur ou une salle depuis le corps. Le prototype place actuellement les personnages dans une salle de test commune en mémoire. Cette salle n'est ni un système de matchmaking ni un monde persistant. Les tickets et états sont perdus au redémarrage ; la route et le parseur WebSocket ne sont pas prêts pour une exposition publique. TLS, contrôle d'origine, limitation distribuée, nettoyage de salles, persistance et audit de sécurité restent requis.


## Tickets FishNet (prototype en cours)

Les routes dédiées au futur Authenticator FishNet sont distinctes du ticket WebSocket existant :
- `POST /v1/realtime/fishnet/tickets` : session Bearer requise, personnage vérifié comme appartenant au compte, ticket opaque valable 30 secondes.
- `POST /v1/internal/realtime/fishnet/consume` : route serveur-à-serveur protégée par l'en-tête `X-Astrea-Server-Key`, retourne l'identité seulement si le ticket est valide, non expiré, non consommé et lié au serveur attendu.

Le hash SHA-256 du ticket est stocké dans PostgreSQL ; le ticket brut n'est retourné qu'une seule fois au client. La consommation utilise un UPDATE conditionnel atomique, ce qui empêche deux serveurs de valider simultanément le même ticket. Configurer `REALTIME_SERVER_SECRET` (au moins 32 caractères aléatoires) et `REALTIME_SERVER_ID` dans l'environnement serveur, jamais dans le dépôt. Le secret ne doit être connu que de l'API et du processus Unity dédié.

L'adaptateur Unity `AstreaApiClient.RequestFishNetJoinTicket` peut demander le ticket. Le custom Authenticator FishNet et l'appel serveur-à-serveur de consommation ne sont pas encore implémentés. La route de ticket WebSocket historique reste inchangée.
