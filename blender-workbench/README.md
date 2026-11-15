# ASTREA Blender cloud workbench

Blender runs headlessly in GitHub Actions. The first original procedural asset is a ceremonial medieval sword, exported as a native `.blend` source, a `.glb` interchange asset and a PNG preview.

Generated outputs are uploaded as a workflow artifact for inspection. They are not committed automatically before preview and technical validation.

The Blender workflow is separate from Unreal. Unreal import requires an Unreal-equipped self-hosted runner and is not yet verified.

The Linux workflow installs EGL/OpenGL runtime libraries for headless rendering. The first CI attempt exposed this runner dependency; the corrected workflow adds those packages and must be rerun to verify generation.

The glTF exporter dependency NumPy is installed on the runner and exposed to Blender through PYTHONPATH.
