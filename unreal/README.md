# ASTREA Unreal Engine scaffold

This is a starter project descriptor and Editor Python import script, not a verified Unreal build.

Requirements: Unreal Engine installed under the applicable Epic Games terms, the Python Editor Script Plugin and a glTF importer supported by that engine build. Automated execution requires a self-hosted GitHub Actions runner labelled `unreal-engine` with the engine installed.

Extract the Blender workflow artifact, set `ASTREA_IMPORT_DIR` to the extracted folder, then run `Scripts/import_assets.py` inside Unreal Editor. The script imports GLB/GLTF into `/Game/ASTREA/Imported`.

The engine association is a starting target and must match the installed engine version. No Unreal import is claimed until the runner exists and a real import test passes.