# ASTREA — feuille de route générale et inventaire des éléments restants

> Document de suivi vivant. État établi à partir du dépôt et des décisions de conception disponibles au 6 novembre 2026. Il ne remplace pas les tests en jeu ni la validation du créateur.

## Légende des statuts

- [x] **Intégré (base)** : fonctionnalité présente dans le dépôt et raccordée au moins dans une première forme.
- [~] **Partiel** : une partie existe, mais le système n'est pas complet ou pas encore raccordé partout.
- [ ] **À développer** : fonctionnalité définie ou souhaitée, mais pas encore implémentée de manière exploitable.
- [?] **À vérifier** : le code ou les assets sont référencés, mais leur fonctionnement/qualité doit être confirmé dans le jeu ou sur appareils réels.

Ne jamais passer un élément à « intégré » sur la seule présence d'un document, d'une interface fictive ou d'un module isolé. Ajouter une preuve (test, capture, scénario de jeu ou déploiement) lors de chaque changement de statut.

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
- [~] Prototype navigateur Three.js et chargement du créateur de personnage.
- [~] Déplacement clavier, manette et tactile raccordé.
- [?] Vérifier sur téléphone réel : joystick haut = avancer, bas = reculer, gauche/droite cohérents.
- [?] Vérifier caméra, orientation, saut, collisions, limites du monde et retour après perte de focus.
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
- [ ] Construire le serveur de simulation temps réel autoritaire.
- [ ] Synchroniser positions, animations, combats, projectiles, états et interactions.
- [ ] Persister personnages, inventaires, quêtes, économie, territoires et monde.
- [ ] Gérer zones, instances, transferts, reconnexions et déconnexions.
- [ ] Mettre en place anti-triche, validation serveur, limitation de débit et journalisation.
- [ ] Prévoir sauvegardes, restauration, supervision et reprise après incident.

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
