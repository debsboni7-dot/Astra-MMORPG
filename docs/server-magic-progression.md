# ASTREA — persistance serveur de la magie v2

Le moteur partagé est `prototype/src/magic/MagicSkillTree.js`. Le service transactionnel est `server/progression/MagicProgressionService.js`.

## Contrat

L'adaptateur de dépôt doit fournir `withCharacterTransaction(accountId, characterId, callback)`, vérifier la propriété du personnage et sauvegarder le JSON de progression dans la transaction. La race est lue depuis la fiche du personnage ; à défaut, la valeur de race déjà contenue dans la progression est conservée.

## Progression autorisée

- `recordSuccessfulCast` est appelé seulement après validation et résolution d'un sort réussi par le moteur de combat serveur.
- L'identifiant d'événement est obligatoire et les événements rejoués sont ignorés.
- L'école est validée contre les restrictions de race avant tout gain d'XP.
- Les techniques se débloquent automatiquement à travers les utilisations confirmées et les niveaux d'école. Aucun point de compétence n'existe.
- `equipTechnique` ne permet d'équiper qu'une technique déjà débloquée dans un emplacement de catégorie correspondante.
- Le client ne peut pas envoyer de montant d'XP, de niveau ou de progression.

## API HTTP

- `GET /v1/characters/:id/progression/magic` : snapshot après authentification et vérification de propriété.
- `GET /v1/characters/:id/progression/magic/:school` : arbre d'une école.
- `POST /v1/characters/:id/progression/magic/equip` : équipement d'une technique déjà acquise. Le compte vient de la session authentifiée.

Le gain d'expérience par sort réussi doit rester un appel interne du moteur de combat serveur, pas une route publique contrôlée par le client.

## Limite de déploiement

Le service et les tests de contrat sont dans le dépôt, mais l'adaptateur PostgreSQL complet et le serveur de simulation multijoueur ne sont pas déployés. Le prototype web actuel utilise une sauvegarde locale pour permettre l'essai des règles sans prétendre à une synchronisation multijoueur.
