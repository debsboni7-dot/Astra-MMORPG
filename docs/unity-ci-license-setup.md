# Activer les builds Unity cloud d'ASTREA

Les workflows de compilation utilisent Unity Personal via GameCI. Aucun achat de licence n'est nécessaire pour un prototype admissible à Unity Personal, mais la licence doit être activée une fois et ses données placées dans les secrets GitHub. Ne jamais committer ces informations dans le dépôt et ne jamais les envoyer dans une conversation.

## 1. Obtenir le fichier de licence

Unity Personal exige une activation manuelle initiale dans Unity Hub selon la procédure actuelle de GameCI :
1. Emprunter temporairement un ordinateur Windows, macOS ou Linux sur lequel [Unity Hub](https://unity.com/download) peut être installé.
2. Ouvrir Unity Hub et se connecter au compte Unity qui sera utilisé pour ASTREA.
3. Ouvrir Preferences / Settings → Licenses → Add → Get a free Personal license.
4. Vérifier que le fichier `.ulf` a bien été créé. Selon le système, Unity Hub peut l'enregistrer dans son dossier de licences.
5. Copier le contenu complet du fichier `.ulf` dans un emplacement privé temporaire. Ne pas le pousser dans Git.
6. Se déconnecter de Unity Hub après l'activation si l'ordinateur emprunté ne doit pas conserver la session/licence.

GameCI documente cette activation Personal comme une étape unique locale. L'ancien workflow automatisé de génération `.alf` est déprécié et ne doit pas être utilisé.

## 2. Ajouter les trois secrets sur GitHub depuis le téléphone

Dans le navigateur Android, ouvrir directement [les secrets Actions du dépôt ASTREA](https://github.com/debsboni7-dot/Astra-MMORPG/settings/secrets/actions) :
1. Choisir New repository secret et créer séparément :
   - `UNITY_LICENSE` : contenu complet du fichier `.ulf`.
   - `UNITY_EMAIL` : adresse du compte Unity.
   - `UNITY_PASSWORD` : mot de passe du compte Unity.
2. Ne jamais publier ces valeurs dans les issues, commits, journaux ou messages.

GameCI reçoit ces valeurs uniquement comme secrets d'environnement au moment du build.

## 3. Lancer le test réseau

Une fois les trois secrets configurés :
1. Ouvrir [Actions](https://github.com/debsboni7-dot/Astra-MMORPG/actions/workflows/unity-fishnet-two-client-integration.yml) → ASTREA FishNet two-client integration.
2. Choisir Run workflow.
3. Sélectionner `yes` pour `confirm_build`.
4. Le workflow construit le serveur Linux dédié et deux clients, prépare deux comptes de test isolés, puis vérifie l'authentification par ticket et la réplication du déplacement.

Le workflow ASTREA Unity 6.3 Linux Dedicated Server build permet aussi de vérifier séparément le build serveur.

## État actuel

Les workflows sont déjà présents et contrôlent explicitement les trois secrets. Tant qu'ils ne sont pas configurés, le build Unity réel et le test deux clients ne peuvent pas démarrer. Les vérifications .NET/stubs et tests Node/PostgreSQL ne nécessitent pas cette licence et continuent de tourner.
