# Couche serveur ASTREA — première fondation

## Dépendance d'exécution

Node.js 22+ et PostgreSQL. Installer `pg` dans le projet serveur. Le dépôt prototype ne possédait pas encore de manifeste serveur ; cette couche est livrée comme modules ES.

## Migrations

Exécuter dans l'ordre :
1. `server/migrations/000_accounts_and_sessions.sql`
2. `server/migrations/001_character_weapon_progression.sql`

La table `characters` doit exister et posséder `id` ainsi qu'un `account_id` de même type que `accounts.id`. Avant d'exécuter en production, les comptes existants et personnages doivent être migrés/rattachés aux nouveaux comptes. La migration 001 ne crée pas la table de personnages.

## Sécurité

- Mot de passe hashé avec scrypt et sel aléatoire.
- Sessions opaques aléatoires ; seul leur SHA-256 est stocké.
- L'ID de compte doit venir de la session authentifiée, jamais du corps de la requête.
- Les transactions verrouillent le personnage et vérifient `id + account_id`.
- Aucun endpoint client ne permet d'attribuer de l'XP. Le moteur serveur appelle le service de progression après résolution autoritaire d'une attaque réussie.
- HTTPS obligatoire en production, limitation de débit à ajouter au reverse proxy/API gateway, politique de récupération de compte et vérification e-mail à intégrer avant ouverture publique.

## État

Cette livraison fournit l'authentification de base et le dépôt PostgreSQL, pas encore le serveur de combat temps réel ni l'intégration au client du prototype. Les secrets, la chaîne PostgreSQL et le cycle de déploiement doivent être configurés dans l'environnement d'hébergement.
