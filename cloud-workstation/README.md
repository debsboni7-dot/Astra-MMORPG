# ASTREA — cloud workstation plan (Blender + Unreal Engine)

Status: prepared, not deployed. No cloud GPU instance has been purchased or started.

## Target architecture

1. **GPU compute:** one persistent Linux GPU pod with enough disk, RAM and VRAM for Blender and Unreal Engine 5.4. Prefer an RTX 4090 (24 GB) as the initial target; move to a 48 GB workstation GPU only if the project scene or editor workload requires it.
2. **Desktop from Android:** expose a browser-based remote desktop (noVNC or an equivalent WebRTC/HTML5 desktop gateway) over HTTPS. The phone is only the screen/input device; Blender and Unreal execute on the remote GPU machine.
3. **Secure access:** put the desktop and job-control endpoints behind Cloudflare Access/Tunnel. Cloudflare is the access/security layer, not the GPU host.
4. **Job control:** a small authenticated controller accepts a limited set of named tasks (build Blender asset, validate GLB, import asset into Unreal, return logs). It must not expose an unrestricted shell or public command execution endpoint.
5. **GitHub Actions:** retain the current Blender build and GLB validation workflow. When the GPU host is provisioned, register it as a self-hosted runner with labels `self-hosted`, `linux`, `unreal-engine`; then enable the existing optional Unreal import job.

## Provider shortlist and observed prices

Price snapshot: 2026-11-15. Prices are USD per GPU-hour and can change with availability, region, tier and storage.

| Provider / option | GPU / workstation | Published starting price | Fit |
|---|---:|---:|---|
| Runpod Secure Cloud | RTX 4090, 24 GB | $0.89/h | Strong candidate for a controllable GPU pod; browser desktop must be installed/configured |
| Runpod Secure Cloud | RTX 5090, 32 GB | $1.39/h | More VRAM/performance headroom; higher cost |
| Runpod Secure Cloud | A40, 48 GB | $0.59/h | More VRAM at a lower listed price, but workstation/editor performance and availability must be checked |
| Coreframe Cloud Workstation | Windows GPU workstation, RTX options | from $1.49/h | Unreal and Blender are advertised as preinstalled; confirm Android browser streaming before choosing |

Official/primary pricing references:
- Runpod: https://www.runpod.io/pricing
- Coreframe: https://www.coreframecloud.com/software/unreal-engine-cloud-workstation

A 4090 at $0.89/h costs $7.12 for 8 hours, before storage and any additional fees. Do not leave the pod running when it is not in use. Persistent storage can continue to incur charges while compute is stopped.

## Software layout on the GPU host

- Blender: install a pinned stable release and run background builds through the existing `blender-workbench/build_sword.py` workflow.
- Unreal Engine: install the exact engine version targeted by `unreal/Astrea.uproject` (currently 5.4), enable Python Editor Script Plugin and a compatible glTF importer, then validate the command-line editor path.
- Browser desktop: use a maintained noVNC/WebRTC desktop image, HTTPS only, strong authentication, and no direct public VNC port.
- Project checkout: clone this repository and check out `feat/blender-unreal-cloud-pipeline`; keep generated caches and engine binaries out of Git.
- Storage: keep source assets and project files on persistent storage; keep temporary render/cache data on the disposable pod disk where practical.

## Five-stage execution checklist

- [x] Prepare Blender headless generation, GLB validation and artifact export in GitHub Actions.
- [x] Prepare an Unreal 5.4 project scaffold and an optional command-line import job.
- [x] Prepare mobile/desktop Chromium tests for the web prototype and server/gameplay unit tests.
- [ ] Provision a GPU workstation and expose its desktop securely in a mobile browser.
- [ ] Register the host as a GitHub self-hosted runner, then execute a real Blender-to-Unreal import and inspect the imported asset in-engine.

## Current verification boundary

- Blender generation/export and GLB validation have succeeded on GitHub-hosted runners.
- Server/gameplay unit tests pass in the current CI run.
- Chromium mobile/desktop smoke tests passed in the previous run; the newest run is being used to verify the touch-camera test after stabilizing sequential touch events.
- Unreal has not been launched or tested. The Unreal job remains skipped until an Unreal-equipped runner is actually online.
- No provider has been charged, no cloud VM has been created, and no account credentials or API tokens have been added to the repository.

## Provisioning gate

Before starting paid compute, choose a provider and maximum hourly budget. Then create the instance manually in the provider account, attach persistent storage, and provide the host with the required GitHub runner registration and Cloudflare access configuration. Never commit provider tokens, Cloudflare tokens, runner registration tokens, or passwords to this repository.
