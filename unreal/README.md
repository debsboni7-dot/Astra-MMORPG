# ASTREA Unreal Engine import

This is an Unreal content-project scaffold plus a headless import script. It is not yet a verified Unreal build or in-game asset.

## Automated Blender -> Unreal path

The GitHub Actions workflow first generates and validates the Blender exports. It then has an optional `unreal-import` job that downloads the artifact produced by that same workflow run and launches Unreal Editor in command-line mode with `unreal/Scripts/import_assets.py`.

The Unreal job is deliberately disabled by default so GitHub Actions does not leave a run waiting indefinitely for a machine that has not been registered.

## Required runner configuration

A repository administrator must provide a Linux machine or cloud VM with a properly installed and licensed Unreal Engine version, then register it as a self-hosted GitHub Actions runner with all three labels:

- `self-hosted`
- `linux`
- `unreal-engine`

On that runner, the Unreal command-line executable must be accessible. In the repository's Actions variables, configure:

- `ASTREA_UNREAL_RUNNER_ENABLED` = `true`
- `ASTREA_UNREAL_EDITOR_CMD` = full path to the executable, for example `/opt/UnrealEngine/Engine/Binaries/Linux/UnrealEditor-Cmd`

Do not enable the variable until the runner is online and the executable path is valid. The runner also needs enough disk space and memory to open the project.

## Import behavior

The script reads `ASTREA_IMPORT_DIR`, imports each `.glb` or `.gltf` file into `/Game/ASTREA/Imported`, and saves the imported assets. The workflow checks the Unreal log for `ASTREA_UNREAL_IMPORT_OK` and uploads the log as an artifact.

The project currently targets Unreal Engine 5.4 in `Astrea.uproject`. The installed engine must match that target or the project descriptor must be updated. The Python Editor Script Plugin and a glTF importer compatible with that exact engine build must be enabled.

## Verification boundary

Blender generation and export have passed on GitHub-hosted runners. Unreal has not yet been launched, and no asset has yet been imported or tested in-engine. A real Unreal runner is still required before that stage can be verified.
