# ASTREA — Cahier des prototypes et du Vertical Slice
Version 1.0 — 15 novembre 2026
Statut : plan de validation proposé ; périmètre à approuver avant développement.

## 1. Objectif
Prouver progressivement les risques majeurs avant d'investir dans le contenu complet. Chaque prototype doit répondre à une question mesurable et avoir une condition de réussite/échec. Les prototypes ne sont pas encore une promesse de contenu de lancement.

## 2. Ordre des prototypes
### P0 — Personnage, caméra et commandes
Objectif : prouver le déplacement troisième personne sur Android et desktop.
- personnage humanoïde riggé temporaire ;
- caméra follow/orbit, collisions caméra et limites ;
- clavier/souris, manette et joystick/touch-look ;
- marche, course, saut et collisions simples.
Acceptation : commandes cohérentes, aucun axe inversé, pas de dérive après relâchement, caméra lisible, performance mesurée sur appareil réel.

### P1 — Petite zone d'Astrea
Objectif : prouver une scène ouverte lisible et performante.
- prairie, relief doux, chemin, eau, végétation, rochers et petit village ;
- collisions, navigation et points d'intérêt ;
- chargement/déchargement d'une cellule simple.
Acceptation : pas de trous ni objets flottants bloquants, circulation claire, rendu stable sur appareils de référence, temps/mémoire mesurés.

### P2 — Combat physique
Objectif : prouver la boucle attaque, impact, défense et réaction.
- une arme de mêlée de base ;
- une cible ennemie avec approche, télégraphie, attaque, récupération et défaite ;
- hitbox/hurtbox et événements de contact ;
- santé, dégâts, interruption et réapparition.
Acceptation : impacts cohérents avec l'animation, pas de dégâts à travers obstacles, cooldown fiable, tests reproductibles.

### P3 — Magie
Objectif : prouver l'architecture commune des neuf écoles sans produire les 675 techniques.
- un sort représentatif par école en prototype technique ;
- pour le Vertical Slice, choisir deux ou trois sorts complémentaires ;
- coût, portée, recharge, ciblage, effets, restrictions raciales et contre-jeu ;
- VFX lisibles et plafonnés sur mobile.
Acceptation : règles cohérentes, coûts non consommés lors d'un échec, effets confirmés, interdictions raciales appliquées côté serveur à terme.

### P4 — Récolte, artisanat et commerce
Objectif : prouver une boucle non combattante.
- une ressource locale ;
- une interaction de collecte ;
- une recette simple ;
- un objet fabriqué ;
- un marchand de test.
Acceptation : ressource consommée une seule fois, recette vérifiée, résultat persistant, transaction atomique dans le prototype serveur.

### P5 — Réseau à deux joueurs
Objectif : prouver l'autorité serveur avant de prétendre faire un MMORPG.
- deux clients connectés à la même zone de test ;
- positions et états visibles des deux côtés ;
- attaque et dégâts validés par le serveur ;
- déconnexion/reconnexion et persistance.
Acceptation : les deux clients convergent sur le même état, un client modifié ne peut pas s'attribuer dégâts/objets/XP, reconnexion sans duplication/perte.

## 3. Vertical Slice recommandé
Une zone compacte et soignée du continent Astrea, un personnage humain, un village, un ennemi, une arme, deux ou trois sorts, une ressource, une recette, un marchand, inventaire minimal, sauvegarde et session réseau à deux joueurs.

Le Vertical Slice doit représenter la qualité finale visée sur un périmètre réduit. Il ne doit pas tenter de simuler cinq continents, sept races, 675 techniques ou un million de comptes.

## 4. Scénario de démonstration
1. Le joueur crée un personnage et entre dans Astrea.
2. Il explore la prairie et rejoint le village.
3. Il récolte une ressource.
4. Il fabrique un objet simple ou le vend au marchand.
5. Il affronte une créature avec une arme et un sort.
6. Un deuxième joueur rejoint la zone et voit les états importants synchronisés.
7. Le premier joueur se déconnecte puis revient ; son personnage et ses objets sont conservés.

## 5. Plan de test
Pour chaque prototype, conserver :
- version du client et du serveur ;
- appareil, OS, résolution et mode de contrôle ;
- scénario exact et étapes de reproduction ;
- résultats attendus et obtenus ;
- FPS/frame time, mémoire et latence si concernés ;
- logs, captures et défauts connus ;
- statut : non testé, test partiel, réussi, échec.

## 6. Hors périmètre des premiers prototypes
- cinq continents entièrement construits ;
- sept races entièrement animées et équipées ;
- 675 techniques complètes ;
- économie mondiale et gouvernance à grande échelle ;
- guerre de royaumes, diplomatie et criminalité systémique ;
- capacité de production d'un million de comptes ou grand nombre de connexions simultanées.

## 7. Porte de sortie vers le code
La phase de préparation est terminée lorsque :
1. Vision et GDD sont relus et leurs points ouverts sont explicitement acceptés, corrigés ou reportés.
2. Architecture client/serveur et limites de coût sont approuvées.
3. Bible artistique et standards d'assets sont approuvés.
4. Pipeline reproductible et licences sont documentés.
5. Prototypes P0 à P5 ont objectifs, dépendances et critères d'acceptation.
6. Le Vertical Slice est approuvé.
7. Un backlog priorisé est prêt.

Après cette porte, la première tâche de code doit être choisie dans P0, sans commencer tous les systèmes à la fois.
