# ASTREA — cahier du prototype réseau comparatif

Statut : préparation technique de l'étape 3. Aucun protocole n'est encore choisi et aucun serveur temps réel n'est déclaré opérationnel.

## Objectif

Comparer les solutions adaptées à un client Unity 6.3, à un backend applicatif Node.js/PostgreSQL déjà présent et à la contrainte de ne rien payer pour les prototypes. Le test doit déterminer comment deux clients voient un même état de jeu autoritaire, sans confier les dégâts, positions validées ou récompenses au client.

## Solutions à évaluer

| Option | Modèle | Atouts | Risques / coûts à vérifier |
|---|---|---|---|
| WebSocket avec serveur Node.js dédié au prototype | TCP, messages applicatifs JSON ou binaires | Réutilise l'écosystème Node existant ; facile à instrumenter et à tester depuis navigateur et Unity | TCP peut provoquer du head-of-line blocking ; réplication, interpolation, prédiction et sécurité à développer ; charge Node à mesurer |
| Unity Netcode for GameObjects + Unity Transport | Transport UDP, modèle Unity | Intégration native au client Unity ; transport auto-hébergé possible ; adapté à une simulation Unity autoritaire | Le serveur de simulation devient un processus Unity distinct ; déploiement et tests Unity réels indispensables ; vérifier les conditions d'usage/licence et les contraintes plateformes |
| FishNet (transport UDP selon configuration) | Framework réseau Unity | Framework orienté jeux, options de synchronisation et prédiction | Dépendance et architecture supplémentaires ; vérifier compatibilité Unity 6.3, maintenance, licence, builds serveur et plateformes |
| Mirror | Framework réseau Unity | Projet open source et écosystème documenté | Compatibilité exacte Unity 6.3, transport, maintenance et modèle serveur à vérifier ; pas de preuve de performance pour ASTREA |

Photon Fusion, services Relay hébergés et services commerciaux ne sont pas retenus pour le prototype tant que leur coût total et leurs limites gratuites ne sont pas établis. Aucun service payant ne doit être activé.

## Scénario identique pour chaque candidat

1. Deux clients distincts rejoignent une même session de test.
2. Le serveur crée et possède l'état de la session.
3. Le client A envoie une intention de déplacement ; le serveur valide et diffuse un état horodaté.
4. Le client B observe A se déplacer ; B peut également se déplacer et A reçoit sa mise à jour.
5. Un client tente d'envoyer une position impossible ou une valeur de dégâts arbitraire ; le serveur rejette l'entrée et conserve l'état valide.
6. Simuler perte de connexion, reconnexion, latence et perte de paquets lorsque le transport le permet.
7. Enregistrer les métriques brutes et le matériel/runner utilisé.

## Mesures obligatoires

- Latence aller-retour médiane, p95 et p99.
- Délai entre action locale et état observé par l'autre client.
- Fréquence d'envoi/réception et taille moyenne/maximale des messages.
- CPU et mémoire du serveur, CPU client, nombre d'entités répliquées.
- Comportement sous latence, gigue, perte et reconnexion.
- Résistance aux valeurs client invalides et à la répétition de messages.
- Complexité d'intégration, licence, coût d'hébergement et possibilité d'auto-hébergement sans abonnement.

Les mesures doivent préciser la machine, la région réseau, la version du moteur, le nombre de clients et la configuration. Un résultat obtenu dans un runner CI n'est pas une mesure de performance sur téléphone.

## Critères de décision

Aucun protocole n'est choisi sur la seule popularité ou facilité de prise en main. La décision doit être justifiée par :
- un prototype réellement exécuté avec deux clients ;
- un serveur autoritaire ;
- les mesures comparables ci-dessus ;
- une vérification des licences et coûts ;
- une trajectoire réaliste vers des zones et instances, sans prétendre qu'un test à deux clients prouve une capacité à grande échelle.

## Dépendances et limites actuelles

- L'adaptateur Unity HTTP actuel couvre l'authentification et les personnages, pas la simulation temps réel.
- Le backend Node.js existant reste le backend applicatif et la persistance ; il n'est pas encore le serveur de monde.
- Le manifeste Unity ne contient actuellement ni Netcode for GameObjects, ni Unity Transport, ni FishNet, ni Mirror.
- L'exécution Unity Editor, le build serveur dédié et les tests sur deux clients ne sont pas disponibles dans les validations Chromium/Node existantes.
- Ne pas installer une dépendance réseau ni figer un protocole avant l'étape comparative et la vérification des licences.

## État

- [x] Options candidates et critères d'évaluation documentés.
- [x] Scénario commun et métriques définis.
- [ ] Vérification actuelle des versions, licences et compatibilités candidates.
- [ ] Prototype comparatif à deux clients exécuté.
- [ ] Rapport de mesures et décision de protocole approuvée.
