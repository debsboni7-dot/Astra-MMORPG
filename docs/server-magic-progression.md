# Sauvegarde serveur de la progression magique

Le moteur partagé est défini dans `prototype/src/magic/MagicSkillTree.js`. Le service serveur est `server/progression/MagicProgressionService.js`.

## Contrat de persistance

L'adaptateur doit fournir :
- `withCharacterTransaction(accountId, characterId, callback)` : authentifie le propriétaire via l'identité de session, verrouille le personnage et valide la transaction ;
- `saveMagicProgression(characterId, progression)` : écrit le JSON validé dans `characters.magic_progression`.

L'identifiant du compte doit provenir de la session authentifiée, jamais du corps de requête. Les identifiants de compétences, points et XP envoyés par un client ne constituent jamais une preuve d'acquisition.

## Événements autorisés

- `unlockSkill` vérifie niveau d'école, points disponibles et prérequis avant de sauvegarder.
- `grantPointsFromServerEvent` doit être appelé uniquement par le système de progression de confiance, avec un identifiant d'événement serveur.
- `recordSuccessfulCast` est appelé après validation et résolution du sort par le serveur. Il n'accepte aucun montant d'XP venant du client.
- `getSnapshot` et `getTree` lisent les données du personnage après vérification de propriété.

## Limite actuelle

Le service et la migration PostgreSQL sont des éléments d'intégration. Le dépôt ne possède pas encore d'adaptateur PostgreSQL opérationnel ni de serveur de jeu multijoueur déployé. Il ne faut donc pas présenter cette progression comme déjà synchronisée en production.
