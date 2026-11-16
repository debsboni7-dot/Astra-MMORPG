# ASTREA — feuille de route générale et inventaire des éléments restants

> Document de suivi vivant. État établi à partir du dépôt et des décisions de conception disponibles au 6 novembre 2026. Il ne remplace pas les tests en jeu ni la validation du créateur.

## Légende des statuts

- [x] **Intégré (base)** : fonctionnalité présente dans le dépôt et raccordée au moins dans une première forme.
- [~] **Partiel** : une partie existe, mais le système n'est pas complet ou pas encore raccordé partout.
- [ ] **À développer** : fonctionnalité définie ou souhaitée, mais pas encore implémentée de manière exploitable.
- [?] **À vérifier** : le code ou les assets sont référencés, mais leur fonctionnement/qualité doit être confirmé dans le jeu ou sur appareils réels.

Ne jamais passer un élément à « intégré » sur la seule présence d'un document, d'une interface fictive ou d'un module isolé. Ajouter une preuve (test, capture, scénario de jeu ou déploiement) lors de chaque changement de statut. Les tests Chromium automatisés couvrent des viewports desktop et mobile émulé ; ils ne remplacent pas la validation sur téléphone physique.

## Décisions de conception à préserver

- Nom du jeu : **ASTREA** (projet/repository : Astra-MMORPG).
- MMORPG médiéval-fantastique en monde ouvert, lumineux, semi-réaliste, orienté exploration et vie du monde.
- Sept races : humains, elfes, nains, démons, anges, orcs et dragonoïdes.
- Neuf écoles magiques : feu, eau, vent, terre, glace, foudre, nature, lumière et démoniaque.
- Progression des compétences par utilisation réussie ; aucun point de compétence à distribuer.
- Cinq emplacements de techniques : trois normales et deux ultimes.
- Nom de joueur immuable après création ; pseudonyme d'aventurier modifiable une fois tous les 30 jours.
- Niveau maximal prévu : 9 999 ; XP conservée à la mort.
- Armes d'hast exclues des décisions de conception les plus récentes. Toute ancienne donnée ou interface les proposant doit être harmonisée.
- Continents : Astrea, Van, Burg, Night et Noir.
- Monde persistant ; objectif d'environ un million de comptes inscrits par serveur, et non un million de connexions simultanées.
- Cibles de plateformes : Android, iPhone/tablettes, PC/Mac, PS4/PS5 et Switch 2. Le prototype web n'est pas une certification de compatibilité de ces plateformes.

---

## P0 — Fiabiliser le prototype jouable

### Client, contrôles et caméra
- [x] Prototype navigateur Three.js et chargement du créateur de personnage — validé en Chromium desktop et mobile (412 × 915) : HTTP 200, menu, ouverture du créateur, sept races, modèle GLB chargé, absence d’erreur JavaScript/console et absence de débordement du viewport. Test automatisé ajouté dans `tests/browser/prototype-smoke.test.js` et exécuté par GitHub Actions.
- [~] Déplacement clavier, manette et tactile raccordé ; axes combinés normalisés pour éviter une vitesse diagonale excessive. Tests unitaires et scénario Chromium mobile interactif réussis (joystick vers l’avant, relâchement, caméra tactile).
- [~] Perte de focus : axes, touches, état de caméra et position visuelle du joystick remis à zéro ; couvert par le test Chromium mobile.
- [?] Vérifier sur téléphone réel : joystick haut = avancer, bas = reculer, gauche/droite cohérents et absence de dérive tactile.
- [~] Caméra : suivi arrière et rotation souris existants ; rotation par glissement tactile ajoutée sur le canvas libre et testée en Chromium mobile. Validation sur téléphone physique encore nécessaire.
- [?] Vérifier saut, collisions, limites du monde et retour après perte de focus.
- [ ] Ajouter un système complet de collisions et de navigation pour les environnements définitifs.
- [ ] Valider les performances réelles sur plusieurs gammes Android et PC.
- [ ] Préparer les adaptations natives/console après stabilisation du client.

### Personnages et garde-robe
- [~] Sept races et références de modèles masculins/féminins dans le prototype.
- [~] Créateur de personnage avec aperçu 3D et réglages de base.
- [~] Pack modulaire Quaternius de 20 pièces et sept emplacements de garde-robe, actuellement limité aux personnages humains.
- [?] Vérifier visuellement les 14 modèles, leurs textures, riggings et animations.
- [?] Corriger les intersections entre vêtements et corps ainsi que les correspondances de squelettes.
- [ ] Préparer des corps neutres ou des zones masquables pour remplacer réellement les vêtements intégrés aux meshes.
- [ ] Adapter et tester les pièces de garde-robe sur elfes, nains, démons, anges, orcs et dragonoïdes.
- [ ] Compléter les options de personnalisation et les différences morphologiques des races.
- [ ] Finaliser la persistance serveur du personnage et les règles du nom/pseudonyme.

### Environnement de départ
- [~] Continent Astrea documenté à l'échelle de conception 1 200 × 900 km et huit régions.
- [~] Plaine d'Aube : terrain streamé par cellules, fleuve, routes, pont, village, marché, forge, fontaine, parcelles agricoles, végétation et points d'activité.
- [~] Points de collecte et monuments procéduraux dans les sept autres régions.
- [?] Faire une revue visuelle complète : trous de terrain, objets flottants, densité, lisibilité et zones de circulation.
- [?] Mesurer le budget de rendu et la mémoire sur téléphones réels.
- [ ] Compléter les villes, villages, bâtiments intérieurs et lieux habités.
- [ ] Ajouter saisons, météo, sons d'ambiance et cycles de vie des PNJ.
- [ ] Développer les sites scénarisés, donjons, ruines, zones secrètes et événements régionaux.

---

## P1 — Systèmes de jeu fondamentaux

### Combat physique et hybride
- [~] Moteur de combat initial : dégâts, défense, résistances, soins, boucliers, effets temporaires et contrôles.
- [~] IA de démonstration : approche, télégraphie, attaque, récupération, interruption et défaite.
- [~] Combos physiques/magiques hybrides et profils de combos par race.
- [~] Clips procéduraux de combos pour les sept races.
- [~] Profils de finishers physiques et hybrides pour 11 familles : épée, dague, sabre, hache, marteau, masse, arc, arbalète, bâton, baguette et grimoire.
- [!] Les clips de finishers générés dans le code sont des animations squelettiques procédurales à clés, pas des animations motion-capture ni des fichiers GLB artisanaux.
- [?] Tester les poses, contacts au sol, prises d'armes et silhouettes avec les modèles et armes définitifs.
- [ ] Acquérir/créer et intégrer progressivement de véritables animations 3D finales.
- [ ] Ajouter animations d'attaque ennemie, réactions, incantations et transitions dédiées.
- [ ] Développer IA de groupe, tactiques, élites et boss.
- [ ] Définir puis simuler l'équilibrage officiel PvE/PvP.
- [ ] Retirer/harmoniser les anciennes catégories d'armes d'hast dans les données, interfaces et progressions.

### Magie et techniques
- [~] Neuf écoles et restrictions raciales définies dans le moteur.
- [~] Un sort de démonstration jouable par école dans le prototype.
- [~] Moteur de progression magique et règles de déblocage par utilisation.
- [~] Cinq emplacements de techniques (trois normales, deux ultimes) définis par le système.
- [ ] Concevoir les 75 techniques de chaque école : 20 offensives, 20 défensives, 20 de contrôle, 10 de soutien et 5 ultimes (675 au total).
- [ ] Définir pour chaque technique : conditions, portée, ciblage, dégâts/effets, coût, durée, recharge, contre-jeu et progression.
- [ ] Développer les animations d'incantation, projectiles, impacts, zones et effets visuels finaux.
- [ ] Compléter l'interface des arbres, de la maîtrise et de l'équipement des techniques.
- [ ] Tester les interactions entre écoles, résistances, immunités et boss.
- [ ] Raccorder tous les effets au résolveur de combat serveur.

### Progression et statistiques
- [~] Progression initiale des maîtrises d'armes et de magie.
- [~] Règles de progression par utilisation et XP conservée à la mort documentées.
- [ ] Valider la liste officielle des attributs physiques, magiques et secondaires.
- [ ] Raccorder les bonus raciaux aux statistiques réelles (ex. défense naine, force/feu orc, affinités raciales).
- [ ] Définir les courbes complètes jusqu'au niveau 9 999 et les seuils de maîtrise.
- [ ] Définir les récompenses, titres, rangs, réputations et distinctions.
- [ ] Créer une fiche de personnage complète et l'interface de progression.
- [ ] Simuler les progressions longues et contrôler les écarts entre joueurs.

### Inventaire, équipements et artisanat
- [~] Garde-robe modulaire initiale ; équipement d'arme raccordé au runtime de démonstration.
- [ ] Inventaire avec catégories, poids/capacité, tri, recherche et objets empilables.
- [ ] Équipement complet : armes, armures, accessoires et statistiques.
- [ ] Coffres, stockage personnel et dépôts.
- [ ] Raretés, niveaux, durabilité, réparation et amélioration.
- [ ] Ressources, recettes et fabrication d'armes/armures/consommables.
- [ ] Récolte, extraction minière, coupe du bois, pêche et cueillette.
- [ ] Marché d'objets et échanges sécurisés entre joueurs.

### Quêtes, métiers et vie du monde
- [~] Premières activités de collecte régionales documentées et partiellement intégrées.
- [ ] Quêtes principales, secondaires, répétables et événements dynamiques.
- [ ] Métiers et spécialisations avec progression.
- [ ] PNJ avec routines, dialogues, services et réactions au monde.
- [ ] Agriculture, élevage, pêche et production.
- [ ] Faune, flore, ressources renouvelables et écologie locale.
- [ ] Réputation locale, relations et conséquences des actions.
- [ ] Activités criminelles et conséquences spécifiques au continent Night.

---

## P2 — Monde complet, économie et systèmes sociaux

### Continents
- [~] Identité et rôle des cinq continents définis.
- [~] Astrea possède une première base géographique et environnementale.
- [ ] Construire Van : forêts, filière bois, villages et ressources.
- [ ] Construire Burg : désert, oasis, ruines, minerais et monstres de difficulté moyenne.
- [ ] Construire Night : villes, criminalité, justice et activités sans monstres.
- [ ] Construire Noir : régions dangereuses, monstres agressifs, donjons et défis avancés.
- [ ] Créer les liaisons, moyens de transport et transitions entre continents.

### Économie et commerce
- [ ] Définir les monnaies, unités, émissions et mécanismes de change.
- [ ] Développer marchés locaux, commerce intercontinental et échanges entre joueurs.
- [ ] Développer banques, coffres, transferts et protections contre la fraude.
- [ ] Mettre en place offre/demande, prix dynamiques et circulation des ressources.
- [ ] Développer fiscalité, taxes et recettes publiques.
- [ ] Simuler inflation, déflation et stabilité économique avant activation en production.

### Territoires, pays et royaumes
- [~] Règles de création par vérification publique TikTok et seuils de communauté documentés.
- [~] Seuils de followers précédemment définis : ville 2 000/5 000 ; pays 10 000/50 000/100 000/1 000 000 selon taille.
- [~] Seuils de monnaie de jeu précédemment définis pour certaines créations : 500 000, 1 000 000 et 5 000 000 selon le type.
- [~] Gouvernance prévue : fondateur/dirigeant, jusqu'à quatre notables, ministères, salaires publics, fiscalité hebdomadaire et part personnelle du roi plafonnée à 1 %.
- [ ] Concevoir les formulaires, contrôles anti-fraude et processus d'approbation des territoires.
- [ ] Développer villes/pays/royaumes, frontières, propriétés et constructions.
- [ ] Développer gouvernements, ministères, nominations et budgets publics.
- [ ] Développer diplomatie, alliances, conflits et guerres.
- [ ] Connecter les finances publiques au système économique persistant.
- [ ] Définir les recours, changements de dirigeants et mécanismes anti-abus.

### Social et communautés
- [ ] Comptes, profils publics et gestion des pseudonymes.
- [ ] Amis, groupes, guildes, alliances et invitations.
- [ ] Chat privé, groupe, proximité et canaux de royaume.
- [ ] Commerce et activités de groupe.
- [ ] Signalement, modération, blocage et sanctions.
- [ ] Outils d'administration et journalisation des actions sensibles.

---

## P3 — MMORPG en ligne et production

### Serveur et persistance
- [~] Fondation backend Node.js, routes d'authentification et sessions.
- [~] Routes personnages et services de progression d'armes/magie.
- [~] Migrations PostgreSQL et règles de validation de propriété documentées.
- [!] Le serveur HTTP et les services de progression ne constituent pas encore un serveur de jeu temps réel en production.
- [ ] Déployer PostgreSQL et configurer les secrets dans un hébergement sécurisé.
- [ ] Créer l'adaptateur transactionnel PostgreSQL complet.
- [ ] Connecter le client navigateur aux routes serveur.
- [~] Premier prototype de référence Node.js WebSocket : test automatisé à deux clients, snapshots autoritaires et rejet des déplacements/dégâts falsifiés ; pas de client Unity, de matchmaking, de persistance monde ni de mesures réseau WAN.
- [ ] Construire le serveur de simulation temps réel autoritaire de production après comparaison des candidats et validation de l'architecture.
- [ ] Synchroniser positions, animations, combats, projectiles, états et interactions.
- [ ] Persister personnages, inventaires, quêtes, économie, territoires et monde.
- [ ] Gérer zones, instances, transferts, reconnexions et déconnexions.
- [~] Validation serveur et limitation de débit de prototype présentes sur l'authentification ; anti-triche de gameplay, limites distribuées et journalisation complète restent à développer.
- [x] Tests d'intégration PostgreSQL : isolation des lectures de progression d'armes, progression magique et état de combat entre comptes distincts, validée dans GitHub Actions.
- [~] Classification HTTP sûre (400/413/500) et tests des routes authentifiées de progression/magie ; journaux structurés, alertes et observabilité restent à développer.
- [~] Test CI PostgreSQL 16 de sauvegarde/restauration et reconnexion du pool réussi ; politique de sauvegarde de production, chiffrement, rétention, stockage externe, supervision et reprise après incident restent à définir.

### Échelle, sécurité et lancement
- [ ] Définir une cible réaliste de joueurs simultanés par zone/instance et la capacité par serveur.
- [ ] Effectuer tests de charge, latence, résilience et montée en charge.
- [ ] Mettre en place récupération de compte, vérification e-mail et protections d'authentification.
- [ ] Définir politique de confidentialité, modération et assistance.
- [ ] Réaliser tests fermés, alpha, bêta et équilibrage avec de vrais joueurs.
- [ ] Préparer builds et certification par plateforme.
- [ ] Préparer lancement, monitoring et mises à jour sans réinitialisation du monde.

---

## Registre des risques et incohérences à traiter

1. **Armes d'hast :** certaines anciennes pages et données en parlent encore alors que la décision de conception la plus récente les exclut. Nettoyer les catégories, profils et interfaces avant de considérer l'équipement comme final.
2. **Animations :** les 154 finishers ajoutés sont générés par le code à partir de poses squelettiques. Ils ne remplacent pas des animations finales validées sur les modèles et armes.
3. **Vêtements :** les pièces modulaires sont principalement validées sur les humains ; la compatibilité des six autres races et le masquage des vêtements fusionnés restent à faire.
4. **Combat serveur :** les tests locaux du moteur ne prouvent pas la sécurité d'un combat multijoueur. Les dégâts et récompenses doivent être résolus par le serveur.
5. **Progression :** certains documents décrivent des services et contrats de persistance, mais l'adaptateur PostgreSQL et le serveur de simulation doivent encore être déployés.
6. **Contenu :** les 675 techniques sont une cible de conception, pas 675 sorts déjà implémentés.
7. **Échelle du monde :** la superficie de conception et le streaming de cellules ne prouvent pas encore que le monde peut supporter les populations visées.
8. **Plateformes :** le prototype web mobile ne prouve pas la compatibilité native PS4/PS5/Switch 2/iOS/Android/PC.

## Règles de mise à jour de cette feuille de route

- Mettre à jour les cases dans le même PR que la fonctionnalité.
- Pour [x], fournir un test ou une preuve de fonctionnement.
- Pour [?], noter précisément le scénario et l'appareil à vérifier.
- Ne pas confondre « documenté », « présent dans le code », « visible en jeu », « testé » et « déployé ».
- Conserver les décisions de conception les plus récentes et signaler explicitement les anciennes règles devenues obsolètes.


---

## Jalons officiels de préproduction — 15 novembre 2026

Ce registre complète la feuille de route historique et suit le cadre de production en 18 étapes adopté pour ASTREA. Les statuts décrivent les documents et preuves présents dans le dépôt, pas une validation implicite du créateur.

| Étape | Livrable attendu | État documentaire |
|---|---|---|
| 1. Vision et concept | Vision officielle | [x] Version 1.0 rédigée ; validation finale du créateur encore attendue |
| 2. GDD | Règles et systèmes complets | [~] Version 0.4 structurée ; plusieurs paramètres et décisions restent ouverts |
| 3. Faisabilité et architecture | Architecture technique | [~] Architecture cible documentée ; protocole temps réel, hébergement et capacité restent à choisir |
| 4. Direction artistique | Bible artistique | [~] Bible et standards visuels rédigés ; planches de référence et validation finale à produire |
| 5. Outils et pipeline | Pipeline reproductible | [~] Outils, formats, licences, CI et cycle de vie documentés ; plusieurs étapes Unity Editor restent à exécuter |
| 6. Prototypes techniques et gameplay | Prototypes fonctionnels | [ ] Cahier P0 à P5 préparé ; génération/modification de code et tests réels pas encore lancés dans cette séquence |
| 7. Vertical Slice | Démo représentative et polie | [ ] Périmètre proposé ; dépend des prototypes et de l'approbation du créateur |

### Porte d'entrée vers le développement
La préparation documentaire est suffisamment structurée pour ouvrir le travail de prototype, mais elle n'est pas une approbation automatique des règles ouvertes. Avant le premier changement de code de cette séquence :
- le créateur doit approuver ou corriger les choix de conception marqués « proposition » ;
- le premier prototype à coder doit être P0 (personnage, caméra, commandes) ;
- les critères d'acceptation doivent être conservés dans `docs/prototype-specification.md` ;
- les tests Unity Editor et Android doivent être distingués des contrôles statiques et des tests Chromium.

### Règle d'arrêt appliquée
La présente séquence s'arrête **avant toute génération ou modification de code**. Les livrables sont des documents de préparation. Les prototypes P0 à P5 et le Vertical Slice ne sont pas déclarés réalisés.


## Alignement avec la feuille de route officielle et ordre du développement 3D

La progression doit suivre les étapes numérotées du cadre de production, pas sauter directement vers la création de contenu 3D :
- **Étape 3 — Faisabilité et architecture : en cours.** Les tests HTTP, PostgreSQL, sauvegarde/restauration, Chromium desktop/mobile et les benchmarks du prototype Node WebSocket passent en CI. FishNet 4.7.4 est déclaré sur la branche isolée, et l'ADR-001 définit la séparation entre serveur Unity/FishNet autoritaire par zone et API Node/PostgreSQL pour comptes et persistance. Cela reste une décision de prototype : résolution UPM, compilation Unity, serveur dédié, authentification par ticket et deux clients Unity restent à valider. Les mesures loopback Node ne prouvent ni la performance WAN ni la capacité de production.
- **Étape 4 — Direction artistique : ensuite.** Compléter les références visuelles, matériaux, silhouettes, éclairage et validation de style.
- **Étape 5 — Outils et pipeline : ensuite.** Rendre reproductibles les imports, formats, licences, génération d'assets et contrôles.
- **Étape 6 — Prototypes techniques et gameplay : ensuite.** P0 personnage/caméra/contrôles, puis les prototypes prévus dans le cahier de spécification.
- **Étape 7 — Vertical Slice : ensuite.** Une petite portion jouable représentative et validée.
- **Étape 8 — Personnages et animations : étape de production 3D.** C'est ici que commence la production structurée des personnages et de leurs animations finales.
- **Étape 9 — Monde et environnements 3D : étape de production 3D.** C'est ici que commence la construction structurée des environnements et du monde.
- Les étapes 10 et 11 développent ensuite combat/armes et magie/techniques, en cohérence avec les prototypes et le Vertical Slice.

**Règle impérative :** tant que l'étape 3 n'est pas validée, continuer les travaux prévus à l'étape 3. Après sa validation, passer à l'étape suivante de la feuille de route, sans anticiper les étapes 8 et 9. Le développement 3D reste bien prévu dans ASTREA, aux étapes 8 et 9 ; il n'est ni supprimé ni oublié, seulement réalisé à son tour.


## Preuve CI du benchmark réseau (16 novembre 2026)

- [x] Benchmark WebSocket loopback à deux clients exécuté dans GitHub Actions, workflow `43821673511` : job complet réussi, incluant tests serveur/gameplay, PostgreSQL, backup/restore et Chromium desktop/mobile.
- [x] Mesures enregistrées dans `docs/realtime-network-prototype.md` et `docs/architecture.md` : 20 échanges, 0,535 ms p50, 0,682 ms p95, 0,724 ms p99, 18,84 mises à jour/s observées.
- [~] Banc d'essai déterministe de délai/gigue et suppression applicative de snapshots ajouté ; exécution CI à confirmer. Ce n'est pas une simulation de perte de paquets IP.
- [ ] Répéter les mesures avec latence, gigue et pertes contrôlées.
- [ ] Mesurer depuis deux appareils distants, dont Android.
- [ ] Exécuter le scénario équivalent avec deux clients Unity pour FishNet et NGO.
- [ ] Comparer les résultats et licences avant toute décision de protocole.

Cette validation ne ferme pas l'étape d'architecture et ne constitue pas une preuve de capacité de production.


### Résultat du benchmark réseau avec conditions contrôlées (16 novembre 2026)

- [x] Workflow GitHub Actions `43823726449` réussi sur le commit `90db3b3ed64d2001874eda12625ae078f4c1d954` : tests serveur/gameplay, PostgreSQL, backup/restore, benchmark WebSocket loopback, benchmark avec délai/gigue/suppression et Chromium desktop/mobile.
- [x] Banc applicatif : 100 intentions, délai unidirectionnel simulé 25 ms, gigue ±10 ms, 10 snapshots supprimés sur 100. Délai action A → observation B : moyenne/p50 50,89 ms, p95 61,04 ms, p99 61,64 ms ; 90 snapshots livrés, débit observé 11,33 mises à jour/s.
- [!] La suppression est effectuée dans le banc applicatif : ce n'est pas une perte de paquets IP/TCP, une mesure WAN ou un test Android/Unity. Ne pas extrapoler ces chiffres à la production.
- [ ] Tester depuis deux appareils distants, dont Android.
- [ ] Exécuter le scénario équivalent avec deux clients Unity pour FishNet et NGO.
- [ ] Comparer les résultats, licences et coûts avant toute décision de protocole.

La validation CI renforce la preuve du prototype Node, mais ne ferme pas l'étape 3 : le choix du protocole et l'intégration Unity/API restent ouverts.


### Architecture réseau et décision FishNet — 16 novembre 2026

- [x] Sources officielles consultées pour FishNet, NGO, Unity Transport et la compatibilité Unity 6.3.
- [x] Audit du package FishNet 4.7.4R fourni par le créateur : archive et SHA-256 vérifiés, manifeste du package et notices tierces examinés.
- [x] FishNet 4.7.4 déclaré via UPM uniquement dans `spike/fishnet-unity-6-3-evaluation`, avec Newtonsoft JSON 3.2.1.
- [x] Architecture de prototype écrite dans `docs/adr-001-fishnet-world-server-architecture.md`.
- [x] Séparation documentée : FishNet/Unity dédié pour la simulation temps réel par zone ; Node.js pour comptes, sessions et règles persistantes ; PostgreSQL pour stockage durable.
- [x] Rôle du million d'inscrits clarifié : royaume logique distribué, sans le confondre avec un million de joueurs simultanés.
- [x] Workflow de validation des fondations Unity étendu à la branche d'évaluation et contrôle statique du manifeste FishNet ajouté.
- [ ] Résoudre FishNet dans Unity 6000.3.28f1 et compiler le projet.
- [ ] Construire un serveur Linux Dedicated Server.
- [ ] Implémenter et tester l'authentification FishNet avec tickets éphémères à usage unique validés côté Node.
- [ ] Connecter deux clients Unity au serveur dédié et vérifier la simulation autoritaire.
- [ ] Comparer FishNet avec la baseline Node sur des mesures équivalentes, puis tester réseau distant et Android physique.
- [ ] Confirmer les contraintes de licence avant toute distribution publique ; revue différée à la demande du créateur.

Le workflow CI de serveur et navigateur ne remplace pas Unity Editor. Le workflow Unity Android existant est manuel, nécessite le secret de licence `UNITY_LICENSE` et n'a pas été lancé. Aucune compilation Unity ni aucun build serveur dédié ne sont revendiqués.



### Mise à jour intégration FishNet — 16 novembre 2026

- [x] API Node d'émission de tickets FishNet liés au compte/personnage/serveur, durée 30 s.
- [x] Hash SHA-256 uniquement stocké en base PostgreSQL.
- [x] Consommation atomique à usage unique, liée au serveur attendu.
- [x] Route interne protégée par secret serveur et comparaison en temps constant.
- [x] Méthode `AstreaApiClient.RequestFishNetJoinTicket`.
- [x] Première implémentation `AstreaFishNetAuthenticator` basée sur l'API FishNet 4.7.4, avec timeout et validation stricte de l'URL API.
- [ ] Compilation Unity 6.3 et validation des signatures API exactes.
- [ ] Configuration d'un NetworkManager et d'un serveur Linux dédié.
- [ ] Spawn autoritaire du personnage après authentification.
- [ ] Test à deux clients, reconnexion et mesures de latence.


### Spawn réseau après authentification FishNet — 16 novembre 2026

- [x] Composant de spawn serveur ajouté : le joueur n'est instancié qu'après validation du ticket et authentification FishNet.
- [x] Identité compte/personnage attachée côté serveur, non fournie par le client.
- [ ] Créer/configurer un prefab réseau avec NetworkObject et l'enregistrer dans Spawnable Prefabs.
- [ ] Compiler et tester le spawn en Unity Play Mode.
- [ ] Vérifier qu'un deuxième client voit le premier joueur et inversement.


### Rapport consolidé de faisabilité — 16 novembre 2026

Le rapport [`docs/feasibility-stage-3.md`](feasibility-stage-3.md) rassemble la faisabilité par plateforme, l'architecture cible, le modèle de montée en charge, les exigences numériques pour les statistiques à 10 milliards, les exigences non fonctionnelles, le registre des risques et les portes de sortie. Il confirme que l'étape reste ouverte jusqu'à la compilation Unity 6.3, au build serveur dédié, au test deux clients FishNet et à la validation réseau distante/Android.


### Build serveur Unity dédié

- [x] Point d'entrée Unity Editor pour Linux Dedicated Server ajouté.
- [x] Workflow manuel protégé par confirmation et secret de licence Unity ajouté.
- [ ] Exécuter le workflow avec une licence Unity valide.
- [ ] Corriger toute erreur de résolution/compilation et obtenir un build Linux serveur réussi.


### Banc de test FishNet deux clients

- [x] Scène Unity de test isolée générée par code Editor.
- [x] Proxy réseau temporaire avec NetworkObject et NetworkTransform en mode serveur autoritaire.
- [x] Client harness CI : client 1 envoie un déplacement, client 2 doit observer le déplacement distant.
- [x] Script de migrations PostgreSQL et préparation de deux comptes/tickets CI.
- [x] Workflow manuel end-to-end ajouté, avec PostgreSQL, API Node, serveur dédié et deux clients Linux.
- [ ] Exécuter le workflow avec le secret Unity Personal `UNITY_LICENSE`.
- [ ] Corriger les éventuelles erreurs réelles de résolution/compilation/build et valider le scénario.


### Cohérence budget / faisabilité — 16 novembre 2026

Le rapport de faisabilité conserve l'enveloppe de référence de **2 000 000 EUR sur 10 mois pour le prototype**, et non pour le MMORPG complet. La ventilation antérieure est reprise dans `docs/feasibility-stage-3.md`. Les coûts récurrents d'exploitation restent séparés et ne seront estimés qu'après les mesures de concurrence, de zones et de bande passante.
