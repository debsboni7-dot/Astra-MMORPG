# Sauvegarde serveur de la progression des armes

La progression n'est pas stockée dans localStorage comme source officielle. Elle appartient au personnage dans la base persistante du serveur. Le compte authentifié et la vérification de propriété du personnage sont obligatoires.

## Contrat serveur

- Appliquer la migration PostgreSQL `server/migrations/001_character_weapon_progression.sql`.
- Fournir au service `createWeaponProgressionService(repository)` un adaptateur dont `withCharacterTransaction(accountId, characterId, callback)` vérifie la propriété du personnage, verrouille sa ligne/document et commit atomiquement les changements retournés par le callback.
- `saveWeaponProgression(characterId, progression)` persiste le JSON validé dans `characters.weapon_progression`.
- Le serveur appelle `recordSuccessfulAttack` uniquement après avoir lui-même validé et résolu une attaque physique réussie. Il fournit catégorie, type d'attaque et technique réellement exécutée depuis son état de combat, jamais depuis un gain XP fourni par le client.
- L'identifiant du compte vient de la session/token authentifié, jamais du corps HTTP. Le service ne donne aucun moyen au client de définir directement XP, rangs ou utilisations.
- Au chargement du personnage, utiliser `getSnapshot`; tous les serveurs de jeu consultent le même stockage central.

## Données sauvegardées

XP et rang par catégorie (épée, hache, marteau, arme d'hast), XP de chaque technique, utilisations totales et par catégorie. Les rangs de techniques sont dérivés de leur XP et des seuils du moteur partagé. Les valeurs historiques de maîtrise sont conservées comme base de migration.

## Limite actuelle

Ce dépôt ne contient pas encore de serveur de jeu, d'authentification ni d'adaptateur PostgreSQL. Le service fournit la logique serveur et son contrat transactionnel, mais ne prétend pas déployer une base ni rendre le prototype navigateur multijoueur. Ne pas considérer localStorage comme sauvegarde autoritaire.
