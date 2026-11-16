# ASTREA — FishNet Unity 6.3 evaluation spike

Status: isolated investigation branch. No FishNet package has been installed and no production networking decision has been made.

## Scope

Qualify FishNet as a candidate for the ASTREA Unity client using the repository's editor target Unity 6.3 LTS (6000.3.28f1). Keep this spike separate from the main development branch. Do not modify the main Unity package manifest until the license, exact package artifact, and reproducible build path are approved.

## License gate (must pass before package import)

The upstream FishNet repository currently supplies a custom license, not an OSI-approved MIT/BSD license. Its grant is worldwide, non-exclusive, no-charge and royalty-free for games developed with the software. It also contains an exclusion concerning other networking solutions using, reverse engineering, or implementing FishNet software, and delegates third-party components to their own licenses.

For ASTREA, the candidate must be used only as a game dependency, not as a component of another networking product. Keep FishNet and NGO evaluation artifacts isolated; do not combine their source code or create a derivative networking framework. Before import, archive the exact package and verify:
- the exact license file shipped with the selected 4.7.4R artifact;
- third-party notices and all bundled dependency licenses;
- whether the Asset Store EULA or repository license governs the exact acquisition route;
- redistribution terms for the game's client and dedicated server builds;
- any attribution or notice obligations.

If any term is unclear, stop and request legal review rather than assuming the package is unrestricted.

## Reproducible package gate

- Candidate release: FishNet 4.7.4R, Git tag `4.7.4`, published 2026-10-16. The release notes state that the package compiles cleanly on Unity 6.6; this is not evidence of a tested Unity 6.3 import.
- Exact upstream Unity package asset: `FishNetworking.4.7.4R.unitypackage` (2,219,627 bytes), SHA-256 `6f2c1d22df8f4649cc5bc75a579536c15239dc76b9488617fe986f52c6a295b0`, release asset ID `652801763`.
- The upstream `4.7.4/LICENSE.md` was inspected and matches the custom license summary above. The binary Unity package itself has not been downloaded or unpacked in this evaluation, so its embedded license, third-party notices and contents remain unverified. The release asset checksum pins the upstream archive but does not prove its internal contents.
- Project editor target: Unity 6000.3.28f1.
- Record the exact source URL, release/tag or Asset Store version, archive checksum, import date and package contents.
- Do not use a floating Git branch or an unpinned dependency.
- Import only into this spike branch after the license gate passes.
- Keep the main `unity/Packages/manifest.json` unchanged.
- Record compiler output and any API/package warnings. A successful import is not a successful player/server build.

## Minimal authoritative two-client scenario

1. Build one dedicated server and two independent clients.
2. Authenticate each client through the existing HTTP API and request a short-lived realtime ticket. Never send the long-lived HTTP bearer token through FishNet.
3. Join both clients to one isolated test session.
4. Client A sends bounded movement input; server simulates and publishes an authoritative state; client B observes A.
5. Repeat in the opposite direction.
6. Submit malformed, stale, over-rate, non-finite and out-of-range input. Server must reject it without changing authoritative state.
7. Attempt client-supplied position, damage, XP or reward values. Server must ignore/reject these as authority.
8. Disconnect and reconnect with a fresh ticket; server restores state from trusted server persistence, not a client-declared transform.

## Measurements

Capture editor/package versions, build target, CPU architecture, server and client hardware, network topology, client count, tick/send rates, payload size, CPU/RAM, action-to-other-client observation p50/p95/p99, disconnect/reconnect outcomes and all rejected-input cases.

Run the same scenario and limits for the Node.js reference and the eventual NGO spike. Do not compare results from different hardware or network paths as if they were equivalent.

## Acceptance criteria

- License and third-party notices audited for the exact artifact.
- Unity 6000.3.28f1 imports without unresolved dependencies or compiler errors.
- Dedicated server build succeeds.
- Two clients can join and observe the same server-authoritative state.
- Invalid inputs do not alter server state.
- Ticket authentication does not expose the HTTP session bearer token.
- Repeatable automated test and raw benchmark output are committed.
- No regression in the existing Node/PostgreSQL/Chromium CI.

## Explicit non-goals

This spike does not prove WAN performance, Android device performance, console compatibility, million-player scale, production security, or final architecture selection. It does not install FishNet or change the main project manifest.

## Upstream references

- FishNet repository and custom license: https://github.com/FirstGearGames/FishNet
- FishNet Unity compatibility: https://fish-networking.gitbook.io/docs/overview/readme/features/unity-compatibility
- FishNet distribution page: https://assetstore.unity.com/packages/tools/network/fishnet-networking-evolved-207815
- Existing ASTREA comparison: ../realtime-network-prototype.md


## Exact 4.7.4R archive inspection (2026-11-16)

The user-provided archive was inspected without importing or executing it.

- Archive: `FishNetworking.4.7.4R.unitypackage`, 2,219,627 bytes.
- SHA-256: `6f2c1d22df8f4649cc5bc75a579536c15239dc76b9488617fe986f52c6a295b0`; matches the upstream GitHub release asset digest exactly.
- Unity package archive inventory: 904 asset payloads, 1,116 asset metadata/path entries, approximately 7.70 MB uncompressed payload.
- Payload composition includes 772 C# source files, 19 scenes, 19 prefabs, 28 materials, 2 DLLs, 6 assembly definition files, and sample/demo content. This is not a tiny runtime-only drop-in; it includes demos, editor tooling, code generation and several transports.
- `Assets/FishNet/package.json`: package ID `com.firstgeargames.fishnet`, version `4.7.4`, minimum Unity version `2021.3`. This metadata does not certify successful operation on Unity 6000.3.28f1.
- Declared Unity package dependencies: `com.unity.nuget.newtonsoft-json` 3.2.1, `com.unity.ugui` 1.0.0, and Unity animation, IMGUI, particle-system, physics, physics2D and UI modules.
- The embedded `FishNet.Runtime.asmdef` has three GUID references. One resolves to the bundled GameKit dependencies assembly; two GUIDs do not resolve to assets in this archive. They may be supplied by Unity or optional external packages, but this cannot be established from the archive alone. Unity import is required to resolve them.
- Two bundled DLLs were found: `FishNet.CodeAnalysis.dll` and `FishNet.CodeAnalysis.Analyzers.dll`. The package includes the CodeAnalysis MIT license. The analyzer DLL is labelled RoslynAnalyzer and its importer metadata shows platform entries disabled; the other DLL has Any-platform enabled and Editor disabled. Confirm actual importer behavior in Unity.
- No native `.so`, `.dylib`, or `.dll` transport binaries were found beyond those two managed CodeAnalysis DLLs.
- Asset metadata GUIDs: 1,116 found, no duplicate GUIDs detected within this archive.

### Embedded license and notices

- `Assets/FishNet/LICENSE.txt` is present. It is the same custom FishNet license family as the upstream repository license. The archive copy has slightly different section numbering/wording in its submission clauses, so retain the exact archive copy when evaluating this artifact.
- `Assets/FishNet/THIRD PARTY NOTICE.md` identifies:
  - GameKit: BSD 2-Clause.
  - LiteNetLib: MIT.
  - CodeGen Helpers: MIT.
  - Mono.Cecil: MIT.
- Additional separate license files are present for Mono.Cecil, FishNet.CodeAnalysis (MIT), and ColliderRollback (which points back to the FishNet license). Preserve these notices and license files in the project and any required distribution notices.
- The FishNet custom license grants no-charge, royalty-free use for a developed game, but contains restrictions involving other networking solutions. It does not read like a standard OSI open-source license. The exact scope of redistribution of FishNet runtime code in shipped client/server binaries should be confirmed with the licensor or qualified legal counsel; do not assume that the package's free price alone answers that question.

### Current decision

The archive identity and its visible embedded license/dependency inventory are now checked. This clears the *archive identity* sub-gate, not the legal redistribution gate or Unity compatibility gate.

**Do not import into the main ASTREA project yet.** Before a controlled Unity import, obtain written clarification on game client/server redistribution and keep the package's notices. Then import only on this spike branch, resolve the two assembly GUID references, inspect compiler warnings, and produce a dedicated server build plus two-client test. The archive inspection itself is not a Unity compile, runtime test, security audit, or performance result.


## CI verification after archive audit (2026-11-16)

- GitHub Actions run: https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43827710814
- Commit: `871ee7feda3566f4aeda855c4e575fb64a1d6c9d` (`docs(network): record FishNet 4.7.4R archive audit`).
- Workflow conclusion: success. The automated-tests job passed, including server/gameplay unit tests, PostgreSQL backup/restore, two-client WebSocket loopback benchmark, controlled latency/jitter/snapshot-suppression benchmark, and desktop/mobile Chromium prototype tests.
- This workflow does not import the FishNet Unity package, run the Unity editor/compiler, build a dedicated server, or test FishNet clients. It verifies the existing ASTREA backend and browser prototype only.
