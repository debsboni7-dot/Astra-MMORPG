# ASTREA asset pipeline

Every asset must record provenance, license, format, version and validation status. Verify commercial-use rights for every external resource.

## Cloud production route
1. Blender headless on GitHub Actions generates `.blend` sources, GLB interchange files and preview renders.
2. The workflow checks expected outputs and stores them as a short-lived artifact.
3. Review assets for scale, orientation, topology, materials, rigging, collision and LODs before promotion.
4. Unreal imports approved GLB/GLTF files through its Editor Python environment.
5. Unreal automation requires a self-hosted runner with a licensed Unreal installation. Standard GitHub-hosted runners do not include Unreal Engine.

Statuses: planned, sourced, generated, downloaded, imported, visible-in-game, tested. Never mark an asset imported, visible or tested without actual verification.
