# ASTREA — hypothèses de capacité et modèle de montée en charge

Date : 21 novembre 2026  
Statut : modèle de planification, **pas une capacité validée ni un devis d'hébergement**.

## 1. Clarifier l'objectif

L'objectif de conception est jusqu'à 1 000 000 de comptes inscrits par royaume/serveur logique. Cela ne signifie pas 1 000 000 de connexions simultanées sur un même processus.

Le modèle retenu est un royaume logique composé de nombreux processus de zones. Les joueurs présents dans une zone sont simulés par un seul serveur de zone autoritaire ; les API de compte et PostgreSQL restent séparés du trafic de simulation fréquent. Les transferts entre zones, la réservation d'instance et le placement régional restent à prototyper.

## 2. Scénarios de concurrence à tester

Les pourcentages ci-dessous sont des hypothèses de sensibilité, pas des prévisions d'audience.

| Comptes inscrits | Pic simultané hypothétique | Joueurs simultanés |
|---:|---:|---:|
| 1 000 000 | 1 % | 10 000 |
| 1 000 000 | 3 % | 30 000 |
| 1 000 000 | 5 % | 50 000 |
| 1 000 000 | 10 % | 100 000 |

## 3. Nombre de processus de zone

Le tableau calcule `ceil(joueurs simultanés / capacité mesurée par zone)`, puis ajoute 20 % de marge opérationnelle. La capacité par zone est un objectif de test, pas une promesse.

| Joueurs simultanés | 50 joueurs/zone | 100 joueurs/zone | 150 joueurs/zone |
|---:|---:|---:|---:|
| 10 000 | 200 (240 avec marge) | 100 (120) | 67 (81) |
| 30 000 | 600 (720) | 300 (360) | 200 (240) |
| 50 000 | 1 000 (1 200) | 500 (600) | 334 (401) |
| 100 000 | 2 000 (2 400) | 1 000 (1 200) | 667 (801) |

Ce nombre représente des processus de zone, pas des machines. La densité de processus par hôte dépendra du build Linux réel, du CPU, de la mémoire, du trafic, de la région, des pics de combat et de la politique de redondance. Aucun nombre de joueurs par machine n'est actuellement garanti.

## 4. Sensibilité de bande passante à partir du prototype

Le benchmark WebSocket de boucle locale a précédemment mesuré un snapshot moyen d'environ 298 octets et environ 18,84 mises à jour observées par seconde. Cela représente environ 5,6 kB/s (45 kbit/s) de payload par flux de joueur, avant en-têtes, chiffrement, retransmissions et messages annexes.

Pour une zone de 50 joueurs, un modèle théorique de diffusion de chaque flux à tous les autres joueurs donnerait environ 110 Mbit/s de payload sortant agrégé. Avec une liste d'intérêt limitée à 20 destinataires par joueur, le modèle descend autour de 45 Mbit/s. Ces chiffres sont des sensibilités mathématiques basées sur le prototype WebSocket, pas une mesure FishNet/DTLS ni une prévision de trafic réel.

Conséquence : l'architecture doit prévoir une gestion d'intérêt spatiale (ne transmettre qu'aux joueurs qui ont besoin de voir l'entité), une fréquence de mise à jour adaptée à la distance et à l'état, une compression des snapshots et une limitation des effets de foule. Un broadcast global par joueur n'est pas une stratégie acceptable à grande échelle.

## 5. Paliers de validation

1. 2 clients : authentification, autorité serveur, DTLS, réplication.
2. 10 clients : stabilité de connexion, mouvement, combat de base et reconnexion.
3. 25 clients : p95/p99, CPU, mémoire, trafic et files d'attente.
4. 50 clients : premier palier de densité par zone.
5. 100 puis 150 clients : seulement si le palier précédent passe avec marge et sans dégradation de l'expérience.

Chaque palier doit mesurer au minimum : latence aller-retour et action-observation, p50/p95/p99, tick rate, jitter, pertes/retransmissions, CPU par cœur, RSS, allocation mémoire, bande passante entrante/sortante, taille des snapshots, nombre de connexions, déconnexions et temps de reprise après crash.

## 6. Architecture de déploiement cible

- Répartiteur/API d'entrée pour les sessions et la sélection de zone.
- Plusieurs serveurs Unity Linux Dedicated Server, chacun propriétaire d'une zone via bail exclusif et fencing epoch.
- PostgreSQL pour comptes, personnages, tickets, transactions et persistance durable des zones.
- Sauvegardes PostgreSQL chiffrées, testées en restauration, et stockage hors hôte.
- Supervision et alertes pour l'expiration des baux, l'échec des snapshots, la saturation CPU/mémoire, la latence et les reconnexions.
- Protection DDoS et filtrage réseau avant toute ouverture publique.
- Déploiement régional et transfert de zone à concevoir avant la bêta.

Ne pas ajouter Redis, Kubernetes, un broker ou un service multijoueur payant tant qu'un benchmark ne démontre pas le besoin. Le prototype conserve un monolithe modulaire Node et une simulation FishNet séparée.

## 7. Coût d'exploitation

Aucun coût mensuel fiable ne peut être annoncé avant de connaître : concurrence de pointe, densité réelle par hôte, régions, trafic sortant, rétention des données, disponibilité attendue, protection DDoS, sauvegardes, observabilité et support. Les tarifs cloud changent et le test de boucle locale ne mesure pas ces postes.

Le budget de production de 2 M EUR déjà documenté est une enveloppe de développement, pas une réserve d'exploitation. Le budget d'exploitation doit être chiffré séparément à partir des paliers mesurés et de devis datés de fournisseurs choisis.

## 8. Décisions encore ouvertes

- capacité maximale réelle d'un processus de zone ;
- nombre de processus de zone par hôte ;
- taille et fréquence des snapshots FishNet/DTLS ;
- politique d'intérêt spatial et fréquence adaptative ;
- nombre de régions et transfert inter-zone ;
- stratégie de déploiement, haute disponibilité et reprise ;
- coût mensuel et budget de sécurité/DDoS ;
- politique de rétention/compaction du journal d'événements.

**Conclusion :** l'objectif d'un million de comptes est architecturalement abordable seulement comme royaume logique distribué. La faisabilité économique et la capacité simultanée restent à démontrer par des builds et des mesures réseau réels.