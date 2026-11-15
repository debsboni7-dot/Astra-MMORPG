# ASTREA — Architecture technique cible
Version 1.0 — 15 novembre 2026
Statut : proposition d'architecture pour validation ; ce document ne décrit pas une infrastructure déjà déployée.

## 1. Objectifs et contraintes
- Construire un client 3D natif avec Unity 6.3 LTS et URP.
- Préserver le prototype navigateur et le backend Node.js/PostgreSQL pendant la transition.
- Concevoir les règles sensibles pour une validation serveur : combat, progression, inventaire, économie, territoires et identité.
- Priorité de validation actuelle : Android ; desktop ensuite. Les consoles et iOS restent des cibles à qualifier.
- Utiliser des outils et ressources gratuits lorsque possible. Aucun abonnement, hébergement payant, achat ou facturation automatique sans accord explicite.
- Ne pas confondre capacité de développement gratuite et exploitation gratuite : un MMORPG persistant nécessite calcul, stockage, réseau, sauvegardes, sécurité et supervision.

## 2. Architecture logique
### 2.1 Client Unity
Responsabilités :
- rendu 3D, caméra, interface, audio et contrôles ;
- présentation des personnages, animations, effets et environnements ;
- prédiction visuelle locale lorsque cela améliore la réactivité ;
- envoi d'intentions d'action au serveur et affichage des résultats autoritaires ;
- cache temporaire des contenus et données non sensibles.

Le client ne décide jamais seul de la propriété d'un objet, d'un résultat de combat, d'une récompense, d'un solde, d'une progression ou d'une action politique.

### 2.2 Services de compte et de métadonnées
Responsabilités proposées :
- inscription, authentification, sessions et récupération de compte ;
- profils, personnages, pseudonymes et paramètres ;
- inventaire persistant, quêtes, progression et données de compte ;
- API HTTPS versionnée et contrôle d'accès.

Le backend Node.js existant est une base de travail à auditer et à faire évoluer. Il n'est pas considéré comme un service de production tant que les adaptateurs PostgreSQL, les tests de sécurité et le déploiement ne sont pas validés.

### 2.3 Serveur de simulation temps réel
Responsabilités :
- autorité sur les déplacements et interactions critiques ;
- simulation des combats, dégâts, soins, états, projectiles et cooldowns ;
- validation des gains XP, maîtrises, butins et récompenses ;
- synchronisation des joueurs présents dans une zone ;
- arbitrage des transactions et des actions concurrentes.

Proposition : isoler la simulation temps réel dans un service dédié, distinct des API de compte. Le protocole réseau, la technologie serveur et le découpage en zones ne sont pas encore choisis. La décision doit être prise après un prototype de deux joueurs et des mesures de latence.

### 2.4 Persistance
PostgreSQL est la base relationnelle candidate pour les comptes, personnages, inventaires, quêtes, transactions et territoires. Les écritures sensibles doivent être transactionnelles, idempotentes et journalisées. Les sauvegardes doivent être chiffrées, testées en restauration et conservées selon une politique documentée.

Les données de simulation éphémères (positions, états fréquents) ne doivent pas provoquer une écriture SQL à chaque image. Définir des instantanés, événements et sauvegardes périodiques selon les besoins réels.

### 2.5 Contenu et distribution
- Assets source : Blender (.blend), textures sources, fichiers de référence et licences.
- Échange : GLB/glTF pour inspection et transport ; FBX seulement lorsqu'il est nécessaire au pipeline Unity.
- Client : assets importés et Addressables locaux au départ.
- Distribution distante/CDN : option future, uniquement après comparaison des coûts, de la sécurité et des besoins de mise à jour.

## 3. Flux de données critique
1. Le joueur envoie une intention (se déplacer, attaquer, lancer un sort, échanger).
2. Le client peut jouer une réponse visuelle provisoire.
3. Le serveur vérifie identité, état, portée, cooldown, ressources, règles de race et contexte.
4. Le serveur calcule le résultat et l'enregistre lorsque l'action modifie un état persistant.
5. Le serveur diffuse le résultat confirmé aux clients concernés.
6. Le client corrige sa prédiction si le résultat autoritaire diffère.

Les transactions d'inventaire et de monnaie doivent utiliser des identifiants uniques et empêcher les doubles exécutions lors d'une reconnexion ou d'une répétition de requête.

## 4. Domaines métier et frontières
| Domaine | Autorité | Données principales |
|---|---|---|
| Compte/session | Service compte | identité technique, session, sécurité |
| Personnage | Service persistance | race, apparence, nom, pseudonyme |
| Combat | Serveur de simulation | santé, dégâts, effets, cooldowns |
| Progression | Serveur + persistance | niveau, XP, statistiques, maîtrises |
| Inventaire | Service transactionnel | objets, équipements, stockage |
| Économie | Service transactionnel | soldes, prix, échanges, taxes |
| Monde | Simulation + persistance | zones, ressources, états persistants |
| Territoires | Service métier | propriétaires, rôles, budgets, lois |
| Social/modération | Services dédiés | amis, groupes, signalements, sanctions |

Ces frontières sont logiques ; elles ne signifient pas qu'il faut créer immédiatement un microservice par domaine. Commencer avec un monolithe modulaire est recommandé jusqu'à ce que les mesures justifient une séparation.

## 5. Sécurité et résilience
- Authentification sécurisée, secrets uniquement côté serveur.
- Validation stricte des entrées, limites de débit et protections contre rejeu.
- Autorité serveur sur les actions qui ont une valeur de jeu.
- Journal d'audit pour transactions, sanctions, gouvernance et changements administratifs.
- Sauvegardes automatisées et exercices de restauration.
- Gestion des déconnexions, reconnexions, reprise de session et opérations idempotentes.
- Minimisation des données personnelles et politique de conservation à définir.
- Modération, blocage, signalement et outils d'administration avant ouverture publique.

## 6. Performance et montée en charge
Ne pas dimensionner sur l'objectif d'un million de comptes inscrits. Mesurer séparément :
- comptes enregistrés ;
- joueurs simultanés par monde ;
- joueurs simultanés par zone ;
- fréquence des mises à jour ;
- trafic entrant/sortant ;
- temps de réponse API ;
- mémoire et CPU par instance ;
- taux de reconnexion et pertes de paquets.

Proposition de progression des tests : 2 joueurs, 10, 25, 50, puis paliers supérieurs seulement si les mesures le permettent. Les limites par zone et le modèle de transfert entre zones doivent être décidés après les tests. Aucun chiffre de capacité de production n'est garanti aujourd'hui.

## 7. Architecture client et performance mobile
- URP avec profils qualité séparés par catégorie d'appareil.
- LOD, occlusion, instancing, Addressables et streaming par zones lorsque le contenu le justifie.
- Limiter ombres temps réel, particules, transparences et matériaux coûteux sur Android.
- Résolution dynamique et plafonds d'effets à évaluer sur appareil réel.
- Input System unifié pour tactile, manette, clavier/souris.
- Scènes et assets chargés progressivement ; éviter le chargement intégral du monde.

Les budgets chiffrés (FPS, mémoire, draw calls, taille de téléchargement) seront fixés après mesure sur appareils de référence, pas inventés à ce stade.

## 8. Environnements de développement
- Local/cloud : Unity 6.3 LTS, Blender, GitHub.
- CI : validation des métadonnées, tests unitaires disponibles, tests navigateur existants, vérification des exports Blender.
- Unity Editor/Android : workflow cloud seulement si la licence Unity et l'environnement sont disponibles ; un runner standard ne prouve pas une compilation Unity.
- Développement réseau : serveur local ou environnement de test gratuit contrôlé ; aucun service public payant n'est activé automatiquement.

## 9. Décisions techniques encore ouvertes
1. Technologie et protocole du serveur temps réel.
2. Modèle de zones, instances et transferts entre continents.
3. Cible simultanée du premier test réseau et du premier lancement.
4. Schéma de persistance et stratégie d'événements/sauvegardes.
5. Authentification, récupération de compte et politique de données.
6. Stratégie d'hébergement gratuite pour prototype et financement éventuel de production.
7. Plateformes de sortie prioritaires et contraintes de certification.

## 10. Critères d'acceptation de l'architecture
- Diagramme des flux client/API/simulation/base de données approuvé.
- Toutes les actions sensibles ont une autorité clairement désignée.
- Un scénario à deux clients démontre la synchronisation et la résolution serveur.
- Les données persistantes survivent à une déconnexion et à un redémarrage.
- Les tests de transaction empêchent duplication/perte d'objets ou de monnaie.
- Les coûts et limites des environnements sont documentés avant tout déploiement public.
- Les limites de capacité sont appuyées par des mesures reproductibles.

---
**Statut de sortie :** proposition prête pour revue. La mise en œuvre technique et le choix final du protocole sont volontairement réservés à la phase de développement.
