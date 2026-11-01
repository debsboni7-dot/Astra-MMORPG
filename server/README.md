# Couche serveur ASTREA — première fondation

## Dépendance d'exécution

Node.js 22+ et PostgreSQL. Le manifeste racine définit les modules ES et la dépendance `pg`. Exécuter `npm install`, puis démarrer avec `DATABASE_URL=... npm run start:server`.

## Migrations

Exécuter dans l'ordre :
1. `server/migrations/000_accounts_and_sessions.sql`
2. `server/migrations/001_character_weapon_progression.sql`

La migration 001 crée la table `characters` avec identifiant UUID, propriétaire `account_id`, nom d'affichage et données JSONB, puis ajoute le bloc de progression. Si une table `characters` existe déjà, vérifier et adapter ses types/colonnes avant migration. Les personnages historiques doivent être rattachés à un compte avant production.

## Sécurité

- Mot de passe hashé avec scrypt et sel aléatoire.
- Sessions opaques aléatoires ; seul leur SHA-256 est stocké.
- L'ID de compte doit venir de la session authentifiée, jamais du corps de la requête.
- Les transactions verrouillent le personnage et vérifient `id + account_id`.
- Aucun endpoint client ne permet d'attribuer de l'XP. Le moteur serveur appelle le service de progression après résolution autoritaire d'une attaque réussie.
- HTTPS obligatoire en production, limitation de débit à ajouter au reverse proxy/API gateway, politique de récupération de compte et vérification e-mail à intégrer avant ouverture publique.

## État

Routes HTTP : `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET/POST /v1/characters`, `GET /v1/characters/:id/progression/weapons`. Les routes de personnage/progression exigent un jeton Bearer. La progression n'est attribuée qu'en appelant le service depuis le moteur serveur après résolution de combat autoritaire.

Cette livraison fournit l'authentification de base, la création/liste de personnages et le dépôt PostgreSQL, pas encore le serveur de combat temps réel ni l'intégration au client du prototype. Les secrets, la chaîne PostgreSQL et le cycle de déploiement doivent être configurés dans l'environnement d'hébergement. Les secrets, la chaîne PostgreSQL et le cycle de déploiement doivent être configurés dans l'environnement d'hébergement.
