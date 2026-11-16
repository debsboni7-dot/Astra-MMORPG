# ASTREA — FishNet dependency integration

Status: dependency declared on the isolated `spike/fishnet-unity-6-3-evaluation` branch. Unity package resolution and compilation have not yet been run.

## What changed

The Unity project manifest now declares:

- `com.firstgeargames.fishnet`: Git URL to the FishNet `Assets/FishNet` package, pinned to release tag `4.7.4`.
- `com.unity.nuget.newtonsoft-json`: `3.2.1`, matching the dependency declared by FishNet 4.7.4.
- Existing `com.unity.ugui` remains at `2.0.0`; it is already present in ASTREA and is not duplicated.

Dependency URL:

```
https://github.com/FirstGearGames/FishNet.git?path=Assets/FishNet#4.7.4
```

This follows FishNet's documented Unity Package Manager Git installation method, with a release tag added to pin the version. It references the FishNet Git repository at the release tag; it does not copy the user-uploaded .unitypackage archive into the ASTREA repository.

## Why this branch only

- Unity editor target remains `6000.3.28f1`.
- The main development branch and its manifest are unchanged.
- The uploaded 4.7.4R unitypackage was independently checksum-verified and inspected.
- No FishNet runtime scripts or sample scenes have been copied manually.
- No networking transport or FishNet gameplay components have been configured yet.

## Required Unity verification

When the branch is opened in Unity 6.3 with Git available:

1. Let Package Manager resolve the pinned Git dependency.
2. Confirm the resolved package version is 4.7.4 and inspect the generated `Packages/packages-lock.json`.
3. Resolve any missing assembly-definition GUID references reported during archive inspection.
4. Check all compile errors and warnings, including code generation and editor tooling.
5. Create a minimal scene with a FishNet `NetworkManager` and the selected transport.
6. Build a dedicated server and two clients, then test authenticated session-ticket exchange and server-authoritative state replication.
7. Commit the generated lockfile and test evidence only after successful Unity resolution and compilation.

## Known limitations

- The Git URL is pinned to a tag, but the actual Unity resolver has not yet confirmed the dependency can be fetched in this project.
- This Git dependency path is not the same acquisition artifact as the uploaded GitHub release .unitypackage; preserve the inspected archive and its checksum as the audit reference.
- A successful package resolution is not proof of compilation, player build, dedicated-server build, mobile support or multiplayer correctness.
- The existing ASTREA Node.js/WebSocket prototype remains the reference backend. No FishNet-to-backend bridge has been implemented.
- No production, WAN, Android-device or scale test has been performed.

## Upstream installation reference

FishNet's official installation guide documents importing a .unitypackage or using the Package Manager Git URL:
https://fish-networking.gitbook.io/docs/tutorials/getting-started/installing-fish-networking


## État après le banc d'intégration (16 novembre 2026)

Le dépôt contient maintenant :
- une route Node d'émission de ticket FishNet, authentifiée par session et propriétaire de personnage ;
- une table PostgreSQL de tickets avec hash SHA-256, TTL 30 secondes et consommation atomique à usage unique ;
- une route interne de consommation protégée par `REALTIME_SERVER_SECRET` ;
- une méthode Unity `AstreaApiClient.RequestFishNetJoinTicket` ;
- `AstreaFishNetAuthenticator` et `AstreaFishNetPlayerSpawner` ;
- un proxy réseau temporaire, un client test et un générateur de scène Editor ;
- un workflow manuel de build et test deux clients Linux.

La CI a vérifié le tag FishNet 4.7.4, les API utilisées, les scripts runtime C# contre des stubs isolés, les métadonnées Unity, les tests Node/PostgreSQL, le runner de migrations et les tests Chromium. Ces contrôles ne sont pas une compilation Unity Editor.

Le workflow complet `unity-fishnet-two-client-integration.yml` n'a pas encore été exécuté. Le NetworkManager, la scène, les prefabs, la résolution UPM, le build Linux et la réplication réelle restent à valider par Unity.
