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
