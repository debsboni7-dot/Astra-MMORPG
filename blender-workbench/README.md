# ASTREA Blender cloud workbench

Blender runs headlessly in GitHub Actions. The current armor build generates eight independently named modular medieval armor objects, exported as `.blend`, `.glb`, `.fbx` and a PNG preview. The FBX is intended for direct import into the Unity project.

Generated outputs are uploaded as a workflow artifact for inspection. They are not committed automatically before preview and technical validation.

The Blender workflow is separate from the Unity Editor. The FBX export can be imported by Unity's built-in model importer; Unity Editor import and character fitting still require editor-level verification.

The Linux workflow installs EGL/OpenGL runtime libraries for headless rendering. The first CI attempt exposed this runner dependency; the corrected workflow adds those packages and must be rerun to verify generation.

The glTF exporter dependency NumPy is installed on the runner and exposed to Blender through PYTHONPATH.
