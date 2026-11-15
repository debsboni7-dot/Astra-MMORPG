# ASTREA — Journal de tests des prototypes
Dernière mise à jour : 15 novembre 2026

## P0 — Personnage, caméra et commandes

### Implémentation source
- [x] Déplacement relatif à la caméra.
- [x] Vitesse diagonale plafonnée à la vitesse maximale.
- [x] Rotation progressive du personnage vers la direction de déplacement.
- [x] Contrôle de la caméra avec inclinaison verticale bornée.
- [x] Saut et gravité via CharacterController.
- [x] Marche/course : Shift sur clavier, clic stick gauche sur manette.
- [x] Commande mobile de course maintenue, relâchée au PointerUp/PointerExit.
- [x] Contrôles partagés entre clavier, manette et HUD tactile.

### Vérification automatisée
- Workflow : [ASTREA Unity foundation checks #98](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43722488782)
- Commit vérifié : `6d9def1283bf0c765a94f1286e2055453f5b81c0`
- Résultat : **succès**.
- Portée : métadonnées Unity, présence des scripts, équilibre des accolades et contrats statiques du contrôleur, des entrées et du bouton de course.

### Dernière vérification CI
- Workflow Unity : [ASTREA Unity foundation checks](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43723004765)
- Commit vérifié : `e41eaf63f03fc100c74e8038f5eb154ccbe3c191`
- Résultat : **succès**. Les contrôles statiques valident aussi le workflow d'import de l'artefact Meshy et la présence de l'asset FBX d'environnement.

### Tests non exécutés / blocages
- [ ] Import du projet dans Unity 6.3 Editor.
- [ ] Compilation C# réelle par Unity.
- [ ] Génération de la scène `ASTREA_Starter_Plains`.
- [ ] Vérification Play Mode du déplacement, du saut, de la caméra et des collisions.
- [ ] Test tactile sur téléphone Android.
- [ ] Test de la course maintenue sur écran tactile.
- [ ] Import d'un humanoïde riggé et test des animations.

### Verdict
**P0 : code de contrôle initial ajouté ; prototype non validé en jeu.** Le modèle humanoïde Meshy actuellement disponible est un mesh statique sans squelette. Il ne permet donc pas encore de démontrer un vrai personnage animé. Le contrôle source est prêt pour la prochaine session Unity Editor, mais aucune jouabilité n'est revendiquée.


## P3 — Magie : correction de consommation des ressources

### Correction source
- Un sort de soin ne consomme plus de mana si aucun soin effectif n'est appliqué.
- Un sort offensif ne consomme plus de mana et ne démarre plus son cooldown lorsqu'aucune cible valide n'est touchée.
- Le coût et le cooldown sont désormais engagés via une seule méthode après réussite de l'effet.
- Le sort de bouclier engage ses ressources après application du bouclier.
- Fichier : `unity/Assets/Scripts/Combat/AstreaSpellCombatController.cs`
- Commit : `135a3259656b40a317aacc2baf58fe2ba38230ba`

### Vérification automatisée ajoutée
- Le workflow Unity vérifie statiquement que l'échec d'un sort offensif retourne avant l'engagement des ressources.
- Commit du contrôle CI : `de75b9192d492b89aaab179ee1efe64474e59837`
- Résultat : en attente d'exécution GitHub Actions.

### Limites
- Ce contrôle statique ne remplace pas un test Play Mode dans Unity.
- Les restrictions raciales et l'autorité serveur restent non implémentées.


## P2 — Combat physique : sécurité des impacts et cohérence de maîtrise

### Règles d'armes
- Les armes d'hast ont été retirées des catégories de maîtrise et d'équipement. Le runtime les refuse comme définition d'arme.
- Le plafond de maîtrise d'une famille d'armes est aligné sur la règle du GDD : **1 000**.
- La courbe XP reste provisoire ; avec la formule actuelle, le plafond correspond à 1 011 000 XP. Ce chiffre décrit la courbe prototype, pas une décision d'équilibrage définitive.
- Les sauvegardes serveur bornent les niveaux et l'XP à ces plafonds.
- Tests Node.js gameplay réussis dans [la CI du commit de progression](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43727223826).

### Résolution des coups Unity
- Un coup peut être résolu par événement d'animation ; un délai de secours de 0,22 s permet aussi au prototype de fonctionner si le clip n'a pas encore d'événement d'impact.
- Un seul calcul d'impact est autorisé par frappe, même si l'événement d'animation et le secours se déclenchent tous les deux.
- Chaque cible est vérifiée par ligne de vue avec un raycast non allouant ; un obstacle entre l'origine de frappe et la cible bloque les dégâts.
- Vérification statique Unity réussie : [ASTREA Unity foundation checks](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43727393365).

### Limites
- Le code C# n'a pas encore été compilé par Unity Editor.
- La scène et les collisions n'ont pas été testées en Play Mode ; le blocage réel par les murs doit être confirmé dans Unity.
- Le combat reste local/prototype. Les dégâts et récompenses devront être validés par le serveur pour le MMORPG.


## P2/P3 — Défenses intégrées au combat et affinité dragonoïde

### Combat
- Le runtime de combat fait maintenant passer les attaques par le résolveur défensif commun.
- Blocage, parade, esquive, absorption du feu, boucliers et résistances sont donc pris en compte par `executeAttack`, au lieu d'être contournés.
- Les attaques peuvent appliquer un cooldown déclaré par leur définition (`cooldownMs`).
- Tests ajoutés pour le blocage, la parade, l'esquive et le cooldown.
- La suite gameplay et les tests navigateur de la CI [#43727639311](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43727639311) ont réussi.

### Magie raciale
- Le bonus dragonoïde de +15 % est désormais réservé à la magie de destruction via un modificateur dédié.
- Il n'augmente plus artificiellement les dégâts de toutes les neuf écoles actuelles.
- Tant que la destruction n'est pas définie comme école ou mécanique distincte, ce modificateur reste disponible mais n'est pas appliqué aux sorts feu/eau/vent/terre/glace/foudre/nature/lumière/démoniaque.
- Tests de règles raciales inclus dans la suite gameplay ; voir [CI #43727639311](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43727639311).


## Progression d'arme — Protection contre les événements rejoués

- Le service serveur de maîtrise exige maintenant un identifiant d'événement d'attaque valide.
- Les 1 000 derniers événements traités sont conservés dans la progression ; un même événement rejoué ne donne pas une deuxième récompense et n'incrémente pas les utilisations.
- Le journal d'événements est nettoyé et limité lors de la lecture des sauvegardes.
- Test ajouté : rejouer exactement le même événement ne double ni l'XP ni le compteur d'utilisations.
- Les tests unitaires de la CI [#43727777031](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43727777031) ont réussi ; Chromium était encore en cours d'installation au moment de cette note.
- L'identifiant doit être généré par la couche de combat serveur de confiance ; cette protection ne rend pas sûr un endpoint qui accepterait aveuglément un identifiant fourni par le client.
