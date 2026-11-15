#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace Astrea.Editor
{
    public sealed class AstreaArmorModelPostprocessor : AssetPostprocessor
    {
        private void OnPreprocessModel()
        {
            if (!assetPath.Contains("/Art/Armor/")) return;
            var importer = (ModelImporter)assetImporter;
            importer.globalScale = 1f;
            importer.importAnimation = false;
            importer.importCameras = false;
            importer.importLights = false;
            importer.importNormals = ModelImporterNormals.Import;
            importer.importTangents = ModelImporterTangents.CalculateMikk;
            importer.meshCompression = ModelImporterMeshCompression.Medium;
            importer.isReadable = false;
            importer.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
        }
    }
}
#endif
