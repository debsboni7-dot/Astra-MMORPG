# ASTREA — FishNet dependency integration

Status: FishNet + DTLS transport dependencies and source bridge declared on the isolated `spike/fishnet-unity-6-3-evaluation` branch. Source/contract CI passes; Unity Package Manager resolution and Unity Editor compilation remain unverified.

## What changed

The Unity project manifest now declares:

- `com.firstgeargames.fishnet`: Git URL to the FishNet `Assets/FishNet` package, pinned to release tag `4.7.4`.
- `com.unity.nuget.newtonsoft-json`: `3.2.1`, matching the dependency declared by FishNet 4.7.4.
- `com.unity.transport`: `2.7.5`, released for Unity 6000.3.
- `com.alven.fishnet.unitytransport`: FishyUnityTransport `2.0.0-pre.2`, pinned to its Git tag.
- Existing `com.unity.ugui` remains at `2.0.0`; it is already present in ASTREA and is not duplicated.

Dependency URL:

```
https://github.com/FirstGearGames/FishNet.git?path=Assets/FishNet#4.7.4
```

This follows FishNet's documented Unity Package Manager Git installation method, with a release tag added to pin the version. It references the FishNet Git repository at the release tag; it does not copy the user-uploaded .unitypackage archive into the ASTREA repository.

## FishNet and DTLS transport setup

The prototype scene builder removes the demo Tugboat transport and adds FishyUnityTransport. It sets the direct server endpoint to `127.0.0.1:7770` and binds the test server to `0.0.0.0:7770`. `AstreaFishNetTransportSecurity` explicitly enables DTLS, reads the dedicated server certificate/private key from environment variables and configures the client DNS name plus CA certificate. The client defaults to client mode, so Android builds do not need environment variables; configure the DNS name and optional public CA in the serialized component fields.

FishyUnityTransport 2.0.0-pre.2 declares UTP 1.3.1 as its minimum package dependency and uses an assembly version define for UTP 2.x. ASTREA directly declares UTP 2.7.5. The actual Unity resolver must still prove that this graph resolves in Unity 6000.3.28f1.

The two-client workflow generates a temporary CA and localhost certificate with DNS and IP SANs, verifies the chain with OpenSSL, then passes the private key only to the server process; clients receive only the public CA certificate. Private temporary files are deleted after server startup. The temporary private key is not committed or uploaded as an artifact.

## Why this branch only

- Unity editor target remains `6000.3.28f1`.
- The main development branch and its manifest are unchanged.
- The uploaded 4.7.4R unitypackage was independently checksum-verified and inspected.
- No FishNet runtime scripts or sample scenes have been copied manually.
- FishyUnityTransport DTLS is configured in the generated test scene, but not yet validated in Unity Editor.

## Required Unity verification

When the branch is opened in Unity 6.3 with Git available:

1. Let Package Manager resolve the pinned Git dependency.
2. Confirm the resolved package version is 4.7.4 and inspect the generated `Packages/packages-lock.json`.
3. Resolve any missing assembly-definition GUID references reported during archive inspection.
4. Check all compile errors and warnings, including code generation and editor tooling.
5. Run `ASTREA > Networking > Build FishNet Network Test Scene` in the Unity Editor.
6. Confirm the NetworkManager uses FishyUnityTransport and the generated scene contains the NetworkObject proxy.
7. Build a Linux Dedicated Server and two Linux clients.
8. Run the manual `ASTREA FishNet two-client integration` workflow with explicit confirmation; it generates ephemeral DTLS certificates, creates two accounts/tickets and verifies remote authoritative movement.
9. Commit the generated lockfile and test evidence only after successful Unity resolution and compilation.

## Known limitations

- The Git URL is pinned to a tag, but the actual Unity resolver has not yet confirmed the dependency can be fetched in this project.
- This Git dependency path is not the same acquisition artifact as the uploaded GitHub release .unitypackage; preserve the inspected archive and its checksum as the audit reference.
- A successful package resolution is not proof of compilation, player build, dedicated-server build, mobile support or multiplayer correctness.
- FishyUnityTransport 2.0.0-pre.2 is an older third-party transport tag; it is a prototype candidate, not a production lock-in.
- The FishNet license review is deferred by creator decision until before public distribution.
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


## Preuves CI actualisées — 21 novembre 2026

- Unity Foundation [44889349804](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/44889349804) : succès. Vérifie FishNet 4.7.4, FishyUnityTransport DTLS API, compilation .NET des scripts ASTREA contre stubs, tests de configuration DTLS client/serveur, certificats de test et branchement TransportManager.
- Backend [44889120732](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/44889120732) : succès. Tests Node, PostgreSQL 16, migration de rétention 005, purge des tickets, sauvegarde/restauration, benchmarks et Chromium desktop/mobile.

Aucun de ces workflows n'exécute Unity Editor. La résolution UPM, la compilation Unity, le build Linux, le handshake DTLS natif et le test deux clients restent en attente des secrets Unity Personal et de l'exécution du workflow manuel.
