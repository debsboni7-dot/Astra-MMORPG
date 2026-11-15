# ASTREA humanoid character asset

## Source
- Generated model: `ASTREA_Humanoid_Meshy6.glb`
- Source artifact: GitHub Actions run [43717997465](https://github.com/debsboni7-dot/Astra-MMORPG/actions/runs/43717997465)
- Import workflow: [Import existing Meshy artifact](https://github.com/debsboni7-dot/Astra-MMORPG/actions/workflows/meshy-import-existing-artifact.yml)

## Verified source characteristics
The generated GLB was inspected before import:
- One humanoid mesh, approximately 38,520 vertices and 31,139 triangles.
- One material.
- No skin/skeleton and no animation clips.
- The source is a static T-pose mesh. Converting it to FBX does not rig it.

## Import procedure
Run the import workflow manually on branch `feat/blender-unreal-cloud-pipeline`. It downloads the existing artifact from run 43717997465, converts the GLB to FBX with Assimp, and commits the FBX, preview and source notes under this folder. It does not call Meshy or spend generation credits.

## Required follow-up before gameplay use
1. Confirm the imported FBX appears in Unity and inspect scale, orientation, material and mesh bounds.
2. Rig the humanoid skeleton using a compatible humanoid rigging workflow (Mixamo is the planned route).
3. Import and configure animation clips, then run Unity Editor validation.
4. Test locomotion, attack, hit and death animations on the actual character.

Do not mark this character as playable or animation-ready until those checks pass. Check Meshy plan/license terms for commercial distribution before release.
