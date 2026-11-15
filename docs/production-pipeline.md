# ASTREA — Pipeline de production
Version 1.0 — 15 novembre 2026
Statut : procédure de production proposée ; aucun service payant n'est activé.

## 1. Principes
- GitHub est la source de vérité du projet et de ses documents.
- Toute modification passe par une branche dédiée, un commit explicite et des vérifications.
- Ne pas écraser les systèmes déjà fonctionnels ; préférer des changements petits et réversibles.
- Les ressources doivent être gratuites, utilisables commercialement et accompagnées de leur preuve de licence.
- Les crédits gratuits existants peuvent être utilisés uniquement dans la limite d'une autorisation explicite. Aucun achat ou abonnement.
- Les assets générés ne sont jamais considérés comme intégrés au jeu avant inspection, import et test.

## 2. Outils retenus
| Domaine | Outil / format | Usage |
|---|---|---|
| Moteur | Unity 6.3 LTS | client natif 3D |
| Rendu | URP | profils mobile et desktop |
| Code | C# | gameplay et client |
| Modélisation | Blender | modèles, UV, rigging, scènes et exports |
| Assets | GLB/glTF, FBX, PNG | interchange et import |
| Versionnement | GitHub | sources, documents, historique |
| Automatisation | GitHub Actions | contrôles et builds si environnement/licence |
| Backend actuel | Node.js + PostgreSQL | fondation API/persistance à auditer |
| Animation | Mixamo ou animations libres | clips Humanoid, licence à vérifier |

Ne pas ajouter d'outil simplement parce qu'il est populaire. Il doit fonctionner avec les contraintes mobiles, le dépôt et les coûts autorisés.

## 3. Cycle de vie d'un asset
1. Brief : usage, silhouette, dimensions, plateforme, niveau de détail et contraintes.
2. Référence : moodboard et sources avec provenance.
3. Création ou acquisition : Blender, génération autorisée ou ressource gratuite.
4. Inspection : géométrie, normales, UV, textures, échelle, orientation, rig, collisions.
5. Licence : vérifier l'autorisation commerciale, attribution et restrictions.
6. Optimisation : LOD, textures, matériaux, collisions et budgets mesurés.
7. Export : conserver la source .blend et exporter GLB/FBX selon destination.
8. Import : Unity et vérification des matériaux, animations et échelle.
9. Test : rendu réel, déformation, collisions, performance et lisibilité.
10. Promotion : asset validé, versionné et référencé dans le registre.

## 4. Registre obligatoire
Chaque asset doit avoir : identifiant, nom, catégorie, auteur/source, URL ou référence, licence, attribution, date d'acquisition, fichier source, formats exportés, version, dimensions, nombre de triangles, textures, rig/animations, statut, tests et limitations connues.

Statuts normalisés :
- proposé ;
- en cours ;
- généré/acquis ;
- inspecté ;
- optimisé ;
- importé ;
- visible en jeu ;
- testé ;
- approuvé pour production.

## 5. Pipeline personnage
- Référence de silhouette et proportions pour chaque race/sexe.
- Modèle propre, UV et matériaux PBR.
- Topologie adaptée aux déformations.
- Rig Humanoid cohérent, poids vérifiés et hiérarchie documentée.
- Clips d'animation séparés ou retargetables.
- Tests de déformation : épaules, coudes, hanches, genoux, mains, visage si applicable.
- Test d'équipement modulaire et masquage du corps.
- Import Unity, Avatar Humanoid, Animator et test en scène.

Le Meshy 6 humanoïde généré le 15 novembre 2026 est un mesh statique sans squelette ni animations selon l'inspection GLB consignée. Il doit être riggé et vérifié avant usage animé. Sa génération est réussie ; son intégration au projet Unity n'est pas confirmée.

## 6. Pipeline environnement
- Définir le biome et la fonction de gameplay.
- Construire terrain, matériaux, végétation, rochers, eau, routes et bâtiments.
- Définir les modules réutilisables et règles d'assemblage.
- Préparer collisions, navigation, LOD et points de streaming.
- Contrôler les objets flottants, trous, répétitions et chemins de circulation.
- Tester densité, visibilité, mémoire et frame time sur Android.
- Garder les sources Blender et les exports validés.

## 7. Pipeline animation et VFX
- Animation : clip source, rig cible, retargeting, transitions, événements de contact et tests sur le vrai modèle.
- VFX : palette par école, lisibilité du danger, durée, pooling, plafonds d'instances et variante mobile.
- SFX : événement déclencheur, priorité de mixage, distance, répétition et option d'accessibilité.
- Aucun générateur de contrôleur ou de particules ne remplace la revue dans Unity Play Mode.

## 8. Intégration continue
Contrôles prévus :
- cohérence des fichiers Unity et versions de packages ;
- tests automatisés existants ;
- tests navigateur desktop/mobile du prototype historique ;
- validation des scripts/outils Blender et des exports ;
- détection des références d'assets manquantes ;
- vérification des licences et fichiers de registre.

Un succès CI statique n'est pas une compilation Unity. Une compilation Unity n'est pas un test Android réel. Un test local n'est pas un test multijoueur. Chaque niveau doit être annoncé séparément.

## 9. Branches et validation
- Branche de fonctionnalité courte pour chaque sujet.
- Commit descriptif.
- Contrôles automatiques avant fusion.
- Revue des fichiers modifiés et des assets binaires.
- Fusion vers la branche de référence seulement après vérification.
- Ne jamais pousser des secrets, clés API, licences ou fichiers privés dans le dépôt.

## 10. Règle de coût
Les étapes de conception, de documentation, Blender open source et GitHub peuvent être préparées sans achat. Les builds Unity automatisés peuvent nécessiter une licence Unity valide. Les serveurs publics et la bande passante d'un MMORPG à grande échelle ne sont pas garantis gratuits. Toute dépense ou activation de service payant nécessite une autorisation distincte.

## 11. Critères d'acceptation du pipeline
- Un asset peut être reproduit à partir de ses sources et de ses instructions.
- La licence et la provenance sont traçables.
- L'import ne casse pas les matériaux, l'échelle ou le rig.
- Les tests sont reproductibles et leurs limites sont consignées.
- Les étapes manuelles dans Unity sont explicitement identifiées.
- Les coûts éventuels sont connus avant activation.
