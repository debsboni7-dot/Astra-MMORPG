import os, unreal
SOURCE_DIR=os.environ.get("ASTREA_IMPORT_DIR","")
DEST="/Game/ASTREA/Imported"
if not SOURCE_DIR or not os.path.isdir(SOURCE_DIR):
    raise RuntimeError("Set ASTREA_IMPORT_DIR to extracted Blender output directory")
tasks=[]
for name in os.listdir(SOURCE_DIR):
    if name.lower().endswith((".glb",".gltf")):
        task=unreal.AssetImportTask(); task.filename=os.path.join(SOURCE_DIR,name)
        task.destination_path=DEST; task.automated=True; task.replace_existing=True; task.save=True
        tasks.append(task)
if not tasks: raise RuntimeError("No GLB/GLTF files found")
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
for task in tasks:
    if not task.imported_object_paths: raise RuntimeError("Import failed: "+task.filename)
    unreal.log("ASTREA imported: "+", ".join(task.imported_object_paths))
unreal.EditorAssetLibrary.save_directory(DEST,only_if_is_dirty=False,recursive=True)
unreal.log("ASTREA_UNREAL_IMPORT_OK: %d asset(s)" % len(tasks))
