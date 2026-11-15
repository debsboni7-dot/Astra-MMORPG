# ASTREA asset pipeline

Every asset must record provenance, license, format, version and validation status. Verify commercial-use rights for every external resource.

## Cloud production route
1. Blender headless on GitHub Actions generates `.blend` sources, GLB interchange files and preview renders.
2. The workflow checks expected outputs and stores them as a short-lived artifact.
3. Review assets for scale, orientation, topology, materials, rigging, collision and LODs before promotion.
4. Unreal imports approved GLB/GLTF files through its Editor Python environment.
5. Unreal automation requires a self-hosted runner with a licensed Unreal installation. Standard GitHub-hosted runners do not include Unreal Engine.

Statuses: planned, sourced, generated, downloaded, imported, visible-in-game, tested. Never mark an asset imported, visible or tested without actual verification.


## First generated character — 15 November 2026
- Asset: ASTREA humanoid adventurer, Meshy 6.
- Source: GitHub Actions run [43717997465](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43717997465).
- Generated output: `ASTREA_Humanoid_Meshy6.glb`, PBR texture target 2K, T-pose, target 30,000 polygons.
- Preview: included in the workflow artifact as `preview.png`.
- Workflow artifact: `ASTREA-Humanoid-Meshy6` (temporary GitHub Actions artifact, 30-day retention).
- Credits recorded by the workflow: 20 for geometry preview and 10 for texture refinement, 30 total. This generation used the user's explicit authorization for existing credits; no real-money purchase was made.
- Visual review of the preview: one human-like male adventurer in dark steel/leather armor, front-facing T-pose, isolated on transparent/black preview background.
- Technical inspection of the GLB: one mesh, one material, no skin/skeleton and no animation clips.
- Current status: **generated and artifact downloaded for inspection; not yet rigged, not yet converted to FBX, not yet committed to the Unity project, not yet imported or tested in-game**.
- Next gate: retopology/mesh review if needed, automatic rigging through an approved workflow, inspect skin weights and skeleton, export a Unity-compatible FBX or validated GLB, then import and test deformation/animations in Unity.
- Commercial-use rights must be checked against the Meshy account plan and current terms before commercial distribution. Generation alone does not establish that legal check.

Do not connect this static T-pose mesh to the existing Animator pipeline yet. The absence of a skeleton and animation clips makes it unsuitable for animation until rigging is completed and verified.
