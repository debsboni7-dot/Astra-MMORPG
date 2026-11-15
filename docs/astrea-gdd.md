# ASTREA — Game Design Document (GDD)
Version 0.2 — 15 novembre 2026
Statut : première base consolidée, **brouillon à valider**. Les points non décidés sont signalés comme tels.

## 0. Contrôle du document
Ce GDD transforme les décisions de conception existantes en spécifications organisées. Il distingue :
- **Décidé** : règle déjà donnée ou confirmée par le créateur.
- **À détailler** : principe connu, paramètres encore manquants.
- **À valider** : proposition de structuration qui ne doit pas être traitée comme une décision définitive.

Aucun contenu marqué « à détailler » ou « à valider » ne doit être codé comme règle finale sans confirmation.

## 1. Fiche d'identité
| Élément | Spécification |
|---|---|
| Titre | ASTREA |
| Projet | ASTREA MMORPG |
| Genre | MMORPG d'action médiéval-fantastique |
| Structure | Monde ouvert persistant |
| Caméra | Troisième personne |
| Combat | Action en temps réel, armes et magie |
| Orientation | Exploration, progression par la pratique, vie du monde |
| Moteur de production actuel | Unity 6.3 LTS, URP |
| Cibles envisagées | Android, iOS/tablettes, PC, Mac, PS4/PS5, Switch 2 |
| Multijoueur | Obligatoire dans la vision du jeu |
| Modèle économique | À valider ; aucune monétisation ne doit être supposée |

## 2. Boucle de jeu principale
### 2.1 Boucle macro
1. Explorer une région et découvrir ses lieux, ressources, activités et dangers.
2. Récolter, combattre, fabriquer, commercer ou participer à la vie sociale.
3. Gagner de l'expérience et améliorer les compétences réellement utilisées.
4. Obtenir ou fabriquer de meilleurs équipements et développer sa maîtrise.
5. Accéder à de nouvelles activités, régions et responsabilités.
6. Contribuer à l'évolution du monde persistant et des communautés.

### 2.2 Boucle minute par minute
Déplacement et observation, interaction avec le monde, choix d'une activité, résolution de l'action, retour d'information, récompense et décision suivante. La durée et les fréquences exactes restent à définir.

## 3. Création de personnage
### 3.1 Parcours
- Écran initial : Continuer / Nouvelle partie.
- Nouvelle partie : création du compte/personnage et choix de l'identité.
- Aperçu plein corps du personnage pendant la personnalisation.
- Sélection verticale des races.
- Personnalisation de l'apparence et choix du nom de joueur.
- Création d'un pseudonyme d'aventurier distinct.

### 3.2 Identité
- Le nom de joueur est choisi à la création et ne peut plus être changé.
- Le pseudonyme d'aventurier est distinct du nom de joueur.
- Le pseudonyme d'aventurier peut être modifié gratuitement une fois tous les 30 jours.
- Les règles de disponibilité, de modération, de longueur et de caractères des noms sont à définir.

## 4. Races jouables
Toutes les races restent globalement humanoïdes, avec des teintes de peau proches de la diversité humaine. Les démons et les anges doivent rester proches de l'apparence humaine ; les cornes sont optionnelles pour les démons.

| Race | Bonus confirmé | Restrictions confirmées |
|---|---|---|
| Humain | Polyvalence, accès général aux types de capacités | Aucune restriction raciale particulière définie |
| Elfe | +10 % magie de nature | Ne peut pas utiliser la magie sombre/démoniaque |
| Nain | +15 % défense | Magie de base uniquement ; pas de magie sombre, lumineuse ou naturelle complexe |
| Démon | +20 % magie sombre/démoniaque | Ne peut pas utiliser lumière ou nature |
| Ange | +20 % magie lumineuse | Ne peut pas utiliser magie démoniaque |
| Orc | +14 % force physique et +14 % magie de feu | Ne peut pas utiliser lumière ou nature |
| Dragonoïde | +15 % magie de destruction | Restrictions complémentaires à définir |

Les valeurs exactes de calcul, les cumuls, les plafonds, les exceptions et la définition de « magie de base » restent à spécifier. Pour le dragonoïde, le bonus de +15 % en magie de destruction est une affinité raciale ; la destruction ne doit pas être ajoutée comme dixième école générale tant que le créateur n'a pas confirmé cette architecture.

## 5. Progression
### 5.1 Niveaux et expérience
- Niveau maximal prévu : 9 999.
- Objectif de rythme : un joueur extrêmement intensif met environ un an pour atteindre le niveau 5 000.
- Après le niveau 5 000, la progression doit devenir extrêmement lente.
- Le joueur conserve toute son XP lorsqu'il meurt.

### 5.2 Progression par utilisation
- Les compétences progressent par leur utilisation réussie.
- Pas de distribution de points de compétence dans un arbre classique.
- Les techniques se débloquent par la pratique de leur école ou famille.
- Les courbes, seuils, conditions de réussite, anti-farming et règles de progression hors ligne sont à définir.

### 5.3 Statistiques
Le plafond précédemment demandé pour les statistiques est de 10 milliards. La liste officielle des attributs, leurs effets, les formules, les interactions et les plafonds individuels doivent encore être validés. Ne pas créer arbitrairement une liste finale d'attributs.

## 6. Combat
### 6.1 Principes
- Combat d'action en temps réel.
- La puissance d'une arme dépend à la fois de la maîtrise de cette famille et des caractéristiques physiques requises.
- Une arme mythique légère peut être maniable avec une force moindre ; une arme mythique lourde peut rester inutilisable sans les caractéristiques nécessaires.
- Une maîtrise élevée dans une arme de haut rang facilite l'utilisation des armes de rang inférieur, même sans entraînement séparé complet.
- Les armes d'hast sont exclues de la conception actuelle.

### 6.2 Techniques équipées
- Cinq emplacements : 1 à 3 pour les techniques normales ; 4 et 5 pour les ultimes.
- Pas de combos avancés imposés sous forme de séquences prédéfinies : le joueur doit pouvoir construire ses enchaînements.
- Les règles de délai, interruption, animation, portée, coût et contre doivent être définies.

### 6.3 Maîtrise
Le plafond de maîtrise d'arme envisagé est de 1 000. Les gains, seuils de rang, conditions de maniement et bonus exacts restent à détailler.

## 7. Magie
### 7.1 Écoles
Les neuf écoles officielles sont :
1. Feu
2. Eau
3. Vent
4. Terre
5. Glace
6. Foudre
7. Nature
8. Lumière
9. Démoniaque / sombre

Les anciennes catégories arcane, spirituelle, mentale, gravité, sang et transmutation ne font pas partie de la liste actuelle.

### 7.2 Restrictions raciales
Appliquer les restrictions du tableau des races. Les bonus raciaux sont des multiplicateurs à préciser dans la formule de puissance magique.

### 7.3 Règle de feu
Pour absorber ou intensifier une attaque élémentaire hostile, le niveau de feu du joueur doit être supérieur au niveau de feu de l'attaquant. Les cas limites, les attaques combinées et les interactions entre écoles restent à préciser.

### 7.4 Fiches de sorts
Chaque sort final devra documenter : école, nom, type, cible, portée, coût en mana, temps d'incantation, recharge, durée, dégâts/soins, effets, conditions, résistances, contre-jeu, progression et animation/VFX. Les sorts actuellement présents dans les prototypes sont des démonstrations et ne constituent pas la liste finale.

## 8. Équipement, inventaire et artisanat
### 8.1 Équipement
Les familles d'armes retenues dans des prototypes incluent épée, dague, sabre, hache, marteau, masse, arc, arbalète, bâton, baguette et grimoire. Les armes d'hast sont exclues. La liste définitive et les catégories d'armures/accessoires restent à confirmer.

### 8.2 Garde-robe
- Équipement modulaire envisagé avec plusieurs emplacements.
- Le système actuel de garde-robe est partiel et principalement validé sur les humains.
- Les vêtements doivent être vérifiés sur les sept races, avec masquage du corps et compatibilité des squelettes.

### 8.3 Systèmes à spécifier
Inventaire, poids/capacité, raretés, durabilité, réparation, amélioration, stockage, recettes, ressources, métiers, commerce et échanges sécurisés.

## 9. Monde et continents
### 9.1 Continents
| Continent | Identité | Danger / contenu |
|---|---|---|
| Astrea | Plaines, agriculture, élevage, vie simple | Très faible ; presque aucun monstre |
| Van | Forêts, bois, construction et commerce du bois | Peu de monstres agressifs |
| Burg | Désert et ressources difficiles | Danger moyen |
| Night | Villes, criminalité et vie sociale | Aucun monstre |
| Noir | Territoire avancé et hostile | Monstres agressifs, difficulté proche du hardcore |

### 9.2 Monde et géographie
Le monde doit favoriser l'exploration, les espaces naturels et des lieux habités. Une échelle de conception de 1 200 × 900 km a été évoquée pour Astrea dans la documentation technique, mais la superficie réellement jouable, les distances, le streaming, les frontières de zones et la densité du contenu doivent être validés.

### 9.3 Environnement
Terrain, végétation, eau, routes, villages, villes, intérieurs, météo, saisons, cycle jour/nuit, faune, flore et navigation doivent être spécifiés continent par continent.

## 10. Ressources, métiers et activités
Activités envisagées : agriculture, élevage, récolte, extraction minière, coupe du bois, pêche, cueillette, artisanat, commerce et exploration. Les ressources doivent être cohérentes avec les biomes et l'économie. Les métiers, recettes, temps de production, outils, rendements et limites anti-farming restent à concevoir.

## 11. Économie
L'économie doit être persistante et connectée aux ressources, à la production, aux échanges, aux taxes et aux territoires. Une valeur de monnaie dynamique liée à la richesse/population des royaumes a été évoquée. Les unités monétaires, formule de valeur, émission, destruction, taux de change, fiscalité, protections anti-fraude et mécanismes anti-inflation doivent être documentés avant implémentation.

## 12. Territoires et gouvernance
### 12.1 Création
La conception prévoit une vérification fondée sur un compte TikTok public et un code/vidéo de preuve, sans demande de pièce d'identité. Le processus réel, les contrôles de fraude, la confidentialité, les recours et les règles de modération restent à spécifier.

### 12.2 Seuils précédemment définis
- Villes : 2 000 abonnés pour une petite ville ; 5 000 pour une grande ville.
- Pays : 10 000, 50 000, 100 000 et 1 000 000 d'abonnés selon la taille.
- Seuils de monnaie de jeu évoqués : 500 000, 1 000 000 et 5 000 000 selon le type de territoire.

Ces seuils sont consignés comme décisions historiques à revalider avant codage ; leur application exacte à chaque taille doit être documentée.

### 12.3 Gouvernance
- Le fondateur devient le dirigeant initial.
- Un royaume peut compter jusqu'à quatre notables nommés par le dirigeant.
- Le nombre de ministères n'est pas limité par la règle actuelle.
- Les salaires publics sont fixés par les notables.
- La part personnelle du roi est plafonnée à 1 % selon la règle la plus récente.
- Fiscalité hebdomadaire prévue.

Les compétences des fonctions, budgets, élections/successions, destitutions, contrôles, audits et conflits de gouvernance restent à définir.

## 13. Multijoueur et persistance
- Le jeu est conçu comme multijoueur, et non comme une expérience solo avec multijoueur facultatif.
- Monde persistant sans réinitialisation générale.
- Objectif de l'ordre d'un million de comptes inscrits par serveur, pas d'un million de connexions simultanées.
- Les positions, combats, inventaires, récompenses, échanges et actions de gouvernance doivent être validés par le serveur.
- Les zones, instances, transferts, reconnexions, latence, anti-triche, sauvegardes et restauration restent à spécifier techniquement.

## 14. Interface et commandes
L'interface doit être claire, moderne, lisible et adaptée à la manette et au tactile. Une inspiration console est souhaitée, avec commandes tactiles non superposées et indicateurs cohérents. Les écrans requis incluent : connexion, menu initial, création de personnage, HUD, inventaire, équipement, carte, quêtes, compétences, magie, social, commerce et gouvernance. Les maquettes finales, navigation, accessibilité et règles de mise à l'échelle restent à concevoir.

## 15. Audio et retours sensoriels
Musique, ambiances, sons d'armes, magie, interface, environnement, voix et accessibilité sonore sont à définir. Chaque son doit être attribué à un événement de jeu et mixé selon les priorités de lisibilité.

## 16. Direction artistique et technique
- Direction visuelle : fantasy médiévale semi-réaliste, lumineuse et détaillée.
- Personnages humanoïdes, silhouettes lisibles et équipements cohérents.
- Environnements variés, végétation et matériaux adaptés aux biomes.
- Effets de magie expressifs mais lisibles et performants.
- Pipeline de production actuel : Unity 6.3 LTS, URP, C#, Blender, GitHub.
- Le prototype web et le backend existants sont conservés pendant la transition.
- Les ressources externes doivent être gratuites, traçables et compatibles avec l'utilisation commerciale.

## 17. Contraintes de qualité
- Aucun système déclaré terminé sans intégration et test.
- Distinguer code présent, fonctionnalité jouable, test automatisé, test sur appareil et déploiement.
- Les tests navigateur ne prouvent pas la compilation Unity.
- Les contrôles locaux ne prouvent pas la sécurité multijoueur.
- Les modèles blockout/procéduraux ne doivent pas être présentés comme assets artistiques finaux.
- Préserver les systèmes fonctionnels et éviter les réécritures sans justification.

## 18. Périmètre de la première version jouable (à valider)
Proposition de cadrage, non encore approuvée :
- une portion représentative du continent Astrea ;
- une race jouable au départ, avec architecture extensible aux sept ;
- déplacement troisième personne, caméra et contrôles tactiles ;
- une boucle de combat physique et un sort représentatif ;
- un ennemi avec IA simple ;
- une petite zone habitée ou un village ;
- inventaire/équipement minimal ;
- sauvegarde et connexion multijoueur de démonstration si le prototype réseau le permet.

Ce périmètre devra être validé avant de devenir la cible officielle du Vertical Slice.

## 19. Décisions ouvertes à résoudre
1. Liste complète et formules des statistiques.
2. Courbes XP/niveaux et progression de maîtrise.
3. Catalogue et règles détaillées des armes, armures et équipements.
4. Spécifications de sorts et des 675 techniques envisagées.
5. Systèmes d'inventaire, artisanat, métiers et ressources.
6. Quêtes, PNJ, activités et contenu de lancement.
7. Économie, monnaie, marchés, fiscalité et anti-abus.
8. Règles précises des territoires et de la gouvernance.
9. Capacité simultanée, architecture réseau et exploitation des serveurs.
10. Périmètre exact du premier Vertical Slice et de la première version publique.

---
**Règle de production :** ce GDD est une base structurée. Les décisions confirmées doivent rester traçables ; les propositions et paramètres ouverts nécessitent validation du créateur avant implémentation définitive.


## 20. Détail des neuf écoles et sorts de démonstration
Le tableau suivant reprend les neuf sorts de la tranche prototype. **Ces valeurs ne sont pas les valeurs d'équilibrage final** et ne doivent pas être considérées comme des coûts/dégâts officiels.

| École | Sort prototype | Fonction prototype | Mana | Recharge |
|---|---|---|---:|---:|
| Feu | Trait ardent | Projectile, dégâts et brûlure périodique | 8 | 0,9 s |
| Eau | Jet d'eau | Projectile et ralentissement temporaire | 8 | 0,8 s |
| Vent | Onde de vent | Dégâts de zone et recul | 9 | 1,4 s |
| Terre | Égide de pierre | Bouclier temporaire personnel | 12 | 5 s |
| Glace | Éclat de givre | Projectile et immobilisation temporaire | 9 | 1,2 s |
| Foudre | Arc électrique | Dégâts, décharge périodique et bref étourdissement | 10 | 1,3 s |
| Nature | Sève réparatrice | Soin personnel | 10 | 1,5 s |
| Lumière | Lueur purificatrice | Soin personnel et purification | 10 | 1,8 s |
| Démoniaque | Ponction démoniaque | Dégâts et vol de vie | 12 | 1,5 s |

Paramètres communs du prototype : réserve initiale de 100 mana, régénération de 4 mana par seconde ; rayon de zone du vent de 4,5 m ; portée maximale prototype de 12 m pour les cibles directes. Les sorts interdits, sans cible valide, en recharge ou sans mana ne doivent pas consommer de mana. La progression ne doit être accordée que si l'effet est réellement appliqué. Ces paramètres restent à rééquilibrer et à valider pour chaque race, niveau et mode de jeu.

La tranche Unity actuellement codée est plus limitée que le tableau de démonstration : elle applique les neuf définitions de base, les dégâts directs, les soins de nature/lumière et un bouclier de terre. Les effets brûlure, ralentissement, gel, étourdissement, purification et vol de vie ne sont pas tous implémentés dans le client Unity actuel. Le prototype local ne constitue pas une implémentation multijoueur autoritaire.

## 21. Règles détaillées de maîtrise des armes
### 21.1 Familles de démonstration
Les familles déjà utilisées dans les prototypes sont : épée, dague, sabre, hache, marteau, masse, arc, arbalète, bâton, baguette et grimoire. Cette liste sert de base de travail ; les variantes, sous-familles et armes de départ restent à décider. Les armes d'hast restent exclues.

### 21.2 Maîtrise et attributs
- Plafond de maîtrise envisagé : 1 000.
- La maîtrise doit représenter l'expérience pratique de la famille d'arme.
- Les caractéristiques physiques doivent limiter l'utilisation des armes trop lourdes ou trop exigeantes.
- Une arme de haut rang et légère peut être maniable par un personnage moins fort qu'un personnage qui tente de manier une arme lourde.
- Une maîtrise très élevée dans une famille doit faciliter l'usage des armes de rang inférieur de cette famille.

Les seuils exacts de maîtrise, les exigences par arme, les coefficients, la vitesse d'attaque, la précision, la consommation d'endurance et les formules de dégâts sont **à définir**. Ne pas inventer de barème final dans le code.

## 22. Statistiques : registre de spécification
La décision de conception la plus récente fixe le plafond visé de chaque statistique à **10 milliards**. Le catalogue officiel des attributs n'est pas encore validé. Chaque attribut devra avoir une définition fonctionnelle, une unité, une formule d'effet, ce plafond, une source de progression et une règle de synchronisation serveur.

Fiche à compléter pour chaque attribut :
- Identifiant stable et nom affiché.
- Définition et effet exact sur le gameplay.
- Valeur de base par race.
- Bonus/malus raciaux et règles de cumul.
- Progression par niveau, équipement et utilisation.
- Plafond, arrondis et limites anti-exploit.
- Effets sur PvE, PvP et activités non combattantes.

Les valeurs d'HP, mana, endurance, force, défense, vitesse, résistance et puissance magique doivent être spécifiées séparément. Le plafond cible s'applique à chaque statistique ; les valeurs de départ, les vitesses de progression et les conditions d'atteinte restent à équilibrer.

## 23. Mort, réapparition et perte
- Règle confirmée : la mort ne retire pas l'expérience déjà acquise.
- Les pénalités éventuelles sur équipement, durabilité, ressources transportées, monnaie, position ou temps de réapparition ne sont pas définies.
- Le lieu de réapparition, les règles de résurrection, les soins alliés et les conséquences de mort en PvP doivent être décidés avant implémentation finale.

Aucune pénalité supplémentaire ne doit être ajoutée implicitement : seule la conservation de l'XP est actuellement une règle certaine.

## 24. Contrat de comportement multijoueur
Les systèmes suivants doivent être autoritaires côté serveur avant une sortie MMORPG :
- Validation de l'identité, de la propriété des personnages et des sessions.
- Validation des déplacements, interactions et changements d'état importants.
- Calcul des dégâts, soins, boucliers, effets, temps de recharge et consommations de ressources.
- Attribution d'XP, progression des maîtrises, butin et récompenses.
- Transactions d'inventaire, commerce, monnaie, taxes et propriété territoriale.
- Horodatage et persistance des changements importants.

Le client peut prédire et afficher les actions pour la réactivité, mais il ne doit pas pouvoir décider seul d'un résultat sensible. Les règles de latence, correction de position, fréquence de synchronisation, anti-triche et réconciliation restent à spécifier dans le document d'architecture.

## 25. Matrice de traçabilité des décisions
| Sujet | État | Règle ou décision actuelle |
|---|---|---|
| Genre et caméra | Décidé | MMORPG d'action fantasy, monde ouvert, troisième personne |
| Monde | Décidé | Cinq continents : Astrea, Van, Burg, Night, Noir |
| Races | Décidé | Sept races et bonus/restrictions listés au chapitre 4 |
| Écoles | Décidé | Neuf écoles listées au chapitre 7 |
| Progression | Décidé | Progression des compétences par utilisation |
| Niveau | Décidé, courbe ouverte | Maximum 9 999 ; niveau 5 000 visé après environ un an de jeu extrêmement intensif |
| Mort | Décidé partiellement | XP conservée ; autres pénalités non définies |
| Statistiques | Partiel | Plafond souhaité de 10 milliards ; catalogue et formules ouverts |
| Maîtrise d'arme | Partiel | Plafond envisagé de 1 000 ; seuils et formules ouverts |
| Techniques équipées | Décidé | Cinq emplacements, trois normaux et deux ultimes |
| Armes d'hast | Décidé | Exclues de la direction actuelle |
| Sorts prototype | Référence technique | Coûts/temps du chapitre 20 non définitifs |
| Économie | À détailler | Monnaie, prix, émission, destruction, fiscalité et protections |
| Territoires | Partiel | TikTok public, seuils et règles de gouvernance à revalider et préciser |
| Population serveur | Objectif à préciser | Environ un million de comptes inscrits, pas de connexions simultanées |
| Première version jouable | À valider | Proposition du chapitre 18 non approuvée |

## 26. Critères de validation du GDD
Le GDD pourra passer en version 1.0 lorsque :
1. Toutes les règles confirmées sont relues et acceptées par le créateur.
2. Les statistiques, niveaux, XP et maîtrises ont des formules explicites ou sont volontairement reportés hors du premier prototype.
3. Les règles de combat et les neuf écoles ont des fiches cohérentes, avec valeurs clairement classées comme provisoires ou définitives.
4. Les systèmes d'équipement, inventaire, artisanat et activités ont un périmètre de première version.
5. Les systèmes économiques et territoriaux ont des règles sans contradictions ni exploit évident.
6. Le périmètre du Vertical Slice est validé.
7. Les dépendances techniques et les exigences serveur sont reliées à l'architecture technique.

Tant que ces points ne sont pas tous résolus, le document reste un GDD de travail et ne constitue pas une spécification finale verrouillée.


## 27. Règles d'interface confirmées
- L'interface doit rester claire, moderne et lisible, avec une inspiration console de qualité PlayStation.
- Les indications de commandes doivent pouvoir afficher des glyphes de manette adaptés, notamment les repères de type PlayStation.
- Les bordures et états de sélection doivent être visibles et suffisamment contrastés.
- Les commandes tactiles doivent être disposées pour éviter les chevauchements et préserver la visibilité du personnage et du monde.
- Le HUD doit éviter les éléments décoratifs inutiles et les informations qui masquent l'action.
- Les dispositions exactes, tailles, couleurs, animations, raccourcis et règles d'accessibilité restent à définir dans les maquettes UX/UI.

## 28. Conditions de validation des systèmes de progression
Avant de figer les chiffres de progression, les simulations devront inclure au minimum :
- un joueur occasionnel, un joueur régulier et un joueur extrêmement intensif ;
- une progression sur plusieurs semaines, puis une projection jusqu'au niveau 5 000 et 9 999 ;
- les gains par activité et par combat, les interruptions et les activités répétables ;
- les différences raciales et les bonus d'équipement ;
- les risques de farming automatisé, de groupe organisé et de personnages secondaires ;
- la conservation intégrale de l'XP à la mort ;
- les plafonds de 10 milliards par statistique et la maîtrise d'arme de 1 000.

Les simulations doivent vérifier que le niveau 5 000 reste un objectif d'environ un an pour un joueur extrêmement intensif, sans transformer cette cible en promesse de temps identique pour tous les profils.
