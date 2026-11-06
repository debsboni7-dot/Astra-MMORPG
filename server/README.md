# Couche serveur ASTREA — première fondation

## Dépendance d'exécution

Node.js 22+ et PostgreSQL. Le manifeste racine définit les modules ES et la dépendance `pg`. Exécuter `npm install`, puis démarrer avec `DATABASE_URL=... npm run start:server`.

## Migrations

Exécuter dans l'ordre :
1. `server/migrations/000_accounts_and_sessions.sql`
2. `server/migrations/001_character_weapon_progression.sql`
3. `server/migrations/002_character_magic_progression.sql`
4. `server/migrations/003_character_magic_combat_state.sql`

La migration 001 crée la table `characters` avec identifiant UUID, propriétaire `account_id`, nom d'affichage et données JSONB, puis ajoute le bloc de progression. Si une table `characters` existe déjà, vérifier et adapter ses types/colonnes avant migration. Les personnages historiques doivent être rattachés à un compte avant production.

## Sécurité

- Mot de passe hashé avec scrypt et sel aléatoire.
- Sessions opaques aléatoires ; seul leur SHA-256 est stocké.
- L'ID de compte doit venir de la session authentifiée, jamais du corps de la requête.
- Les transactions verrouillent le personnage et vérifient `id + account_id`.
- Aucun endpoint client ne permet d'attribuer de l'XP. Le moteur serveur appelle le service de progression après résolution autoritaire d'une attaque réussie.
- HTTPS obligatoire en production, limitation de débit à ajouter au reverse proxy/API gateway, politique de récupération de compte et vérification e-mail à intégrer avant ouverture publique.

## État

Routes HTTP : `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET/POST /v1/characters`, `GET /v1/characters/:id/progression/weapons`, `GET /v1/characters/:id/progression/magic`, `GET /v1/characters/:id/progression/magic/:school`, `POST /v1/characters/:id/progression/magic/equip`, `GET /v1/characters/:id/combat/magic` et `POST /v1/characters/:id/combat/magic/cast`. Les routes de personnage/progression exigent un jeton Bearer. Les points et XP magiques sont attribués uniquement par des événements internes de progression/jeu, jamais par une route client. La progression n'est attribuée qu'en appelant le service depuis le moteur serveur après résolution de combat autoritaire.

La race du personnage est maintenant enregistrée dans `character_data.race`. La ressource de combat magique (PV, mana, recharge et effets temporaires) est persistée séparément dans `magic_combat_state`. Les sorts offensifs nécessitent encore un résolveur de cibles détenu par le serveur de monde : tant qu'il n'est pas branché, le service refuse proprement les cibles offensives au lieu de faire confiance aux dégâts ou aux statistiques envoyés par le client. Cette livraison ne constitue pas encore un serveur de combat temps réel et le prototype navigateur n'est pas encore connecté à ces routes. Les secrets, la chaîne PostgreSQL et le cycle de déploiement doivent être configurés dans l'environnement d'hébergement. Les secrets, la chaîne PostgreSQL et le cycle de déploiement doivent être configurés dans l'environnement d'hébergement.
