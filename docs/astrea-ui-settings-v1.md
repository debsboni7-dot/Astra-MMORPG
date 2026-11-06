# ASTREA MMORPG — interface et paramètres v1

## Direction visuelle
- Direction cible : anime semi-réaliste, lisible et lumineuse.
- Couleurs dominantes : blanc ivoire, vert herbe fraîche et vert émeraude.
- Panneaux translucides clairs, contours verts fins, halos discrets et contrastes lisibles sur mobile.
- La scène de création utilise une ambiance lumineuse vert tendre, une lumière principale chaude et un contre-jour vert.

## Paramètres locaux
Les préférences sont stockées dans `localStorage` sous `astrea.settings.v1`. Les valeurs sont validées et bornées dans `prototype/src/settings.js`.

Paramètres actuellement appliqués au prototype :
- limite de rendu 30/40/60 FPS ;
- échelle de résolution ;
- activation des ombres ;
- taille du joystick et des boutons tactiles ;
- sensibilité de la caméra ;
- suivi caméra ;
- échelle d'interface, contraste élevé et réduction des animations.

Les réglages audio, langue, sous-titres, chiffres de dégâts et marqueurs sont persistés, mais certains attendent encore leur branchement aux systèmes correspondants. La qualité graphique est une préférence/préréglage d'interface ; elle ne modifie pas encore tous les niveaux de détail du monde.

## Déplacement et animation
Le joystick fournit des axes caméra-relatifs normalisés. Le personnage pivote progressivement vers le vecteur de déplacement, et joue `walking` ou `running` selon l'entrée. Le calcul est partagé avec les quatre directions cardinales et les diagonales.

## Hubs des systèmes
L'onglet Systèmes présente Personnage, Magie, Compétences, Inventaire, Quêtes, Guildes, Royaumes, Carte et Social. Les statuts affichés distinguent ce qui existe déjà, ce qui est un prototype et ce qui reste à construire. Ces cartes ne constituent pas des services multijoueurs actifs.

## Intégration future
Schéma de préférences versionné : `astrea.settings.v1`. Pour relier une future interface externe au moteur, exposer un adaptateur contrôlé qui valide le schéma avant d'appliquer les préférences ; ne pas laisser une page externe modifier arbitrairement le moteur via `postMessage` sans origine autorisée.
