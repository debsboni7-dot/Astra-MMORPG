# ASTREA — modèle de menace réseau (étape 3)

Date : 21 novembre 2026  
Portée : prototype FishNet + API Node.js + PostgreSQL  
Statut : contrôles de prototype définis ; validation Unity/DTLS réelle encore bloquante

## Actifs à protéger

| Actif | Impact en cas de compromission |
|---|---|
| Session de compte HTTP | prise de contrôle du compte et de ses personnages |
| Ticket FishNet | connexion frauduleuse au serveur ciblé pendant sa courte validité |
| Identité compte/personnage | usurpation, accès à la progression d'un autre joueur |
| État de simulation de zone | triche, duplication, dégâts/récompenses falsifiés |
| Secret serveur API | émission d'identités de connexion non autorisées |
| Clé privée DTLS | interception ou usurpation du serveur réseau |
| PostgreSQL | perte ou falsification des données persistantes |

## Frontières de confiance

1. **Client Unity → API Node :** HTTPS, session Bearer, contrôle d'ownership.
2. **Client Unity → serveur FishNet :** UDP protégé par DTLS via FishyUnityTransport ; le ticket de connexion est envoyé après le handshake DTLS.
3. **Serveur FishNet → API Node :** HTTPS, secret serveur distinct du jeton joueur, timeout de 5 secondes.
4. **API Node → PostgreSQL :** réseau privé, requêtes paramétrées et transactions.
5. **CI GitHub Actions :** secrets temporaires ou repository secrets ; aucune clé privée de production dans les artefacts ou logs.

## Menaces et contrôles retenus

| Menace | Contrôle du prototype | Preuve disponible / manque |
|---|---|---|
| Vol du ticket par écoute réseau | DTLS obligatoire ; ticket 256 bits, durée 30 s, usage unique | sources et tests de configuration vérifiés ; handshake Unity réel non exécuté |
| Rejeu d'un ticket | consommation atomique PostgreSQL et champ consumed_at IS NULL | test PostgreSQL concurrent : un seul consommateur gagne |
| Ticket pour un autre personnage | émission après authentification HTTP et vérification d'ownership | tests Node et PostgreSQL |
| Ticket présenté à une autre zone | serverId lié au ticket et vérifié lors de la consommation | tests Node ; registre multi-zone et secrets distincts par serveur non construits |
| Interception/modification du trafic | DTLS, validation du nom DNS et de la chaîne CA | code Fishy vérifié ; build/handshake Android/Linux à faire |
| Triche client | serveur de zone autoritaire ; le client envoie des intentions | proxy de test utilise ServerRpc et NetworkTransform non client-authoritative ; pas encore de test Unity réel |
| Fuite de clé serveur | variables d'environnement, jamais de clé dans les builds clients ou Git | contrôles source CI ; gestionnaire de secrets de production et rotation à définir |
| Abus des endpoints de connexion | limitation de débit sur inscription, connexion et demande de ticket | test HTTP ; limite actuelle en mémoire, non distribuée |
| Injection SQL | requêtes paramétrées, transactions pour les états de personnage | tests PostgreSQL ; revue de sécurité complète non effectuée |
| Saturation/DDoS | filtrage et protection en périphérie avant exposition publique | non déployé ; exigera un fournisseur/une infrastructure et un budget validés |
| Accumulation des tickets obsolètes | purge des tickets consommés/expirés après 5 minutes, tous les 100 tickets émis | tests Node et PostgreSQL |

## Règles avant exposition Internet

- Ne jamais exposer Tugboat/UDP non chiffré comme transport de joueurs.
- Ne pas lancer de serveur public avant un handshake DTLS réussi avec vérification du certificat.
- Ne jamais inclure ASTREA_DTLS_SERVER_KEY ou REALTIME_SERVER_SECRET dans un client, une scène, un prefab, un commit ou un artefact téléchargeable.
- Utiliser des certificats de production avec SAN DNS correspondant au nom utilisé par les clients ; surveiller leur expiration et planifier la rotation.
- Garder l'API interne inaccessible publiquement autant que possible ; limiter l'accès réseau aux serveurs de zone autorisés.
- Ajouter des secrets distincts par serveur/zone et un registre de serveurs avant le multi-zone public. Le secret partagé actuel ne constitue qu'un secret de prototype.
- Déplacer la limitation de débit vers une couche distribuée avant la mise en ligne.
- Journaliser les décisions d'authentification et les erreurs sans jamais enregistrer de ticket, Bearer token, clé privée ou secret serveur.
- Tester les paquets malformés, les reconnexions, la rotation des certificats, l'expiration, le rejeu, les déconnexions et les redémarrages de zone.

## Portes de validation restantes

1. Résolution UPM et compilation Unity 6000.3.28f1.
2. Build serveur dédié Linux et build client.
3. Handshake DTLS réel avec certificat CA, DNS/SAN et clé privée chargés depuis l'environnement.
4. Deux clients authentifiés et réplication serveur-autoritaire.
5. Répéter le test sur Android physique et sur un réseau distant.
6. Définir les secrets par zone, la rotation, la protection DDoS et la limitation de débit distribuée avant bêta publique.

Ce modèle réduit le risque de confondre une source C# compilée contre des stubs avec une pile réseau réellement sûre. Tant que les portes ci-dessus ne sont pas passées, le prototype est réservé aux tests contrôlés.
