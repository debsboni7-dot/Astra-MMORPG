using UnityEditor;
using UnityEngine;

namespace Astrea.EditorTools
{
    /// <summary>
    /// Applies consistent Humanoid import settings to the ASTREA Mixamo character and
    /// animation FBXs. Animation files reuse the character Avatar when it is available.
    /// </summary>
    public sealed class AstreaMixamoImportPostprocessor : AssetPostprocessor
    {
        private const string CharacterPath = "Assets/Art/Characters/ASTREA_Humanoid_Meshy6.fbx";
        private const string AnimationFolder = "Assets/Art/Animations/Mixamo/";

        private void OnPreprocessModel()
        {
            if (!(assetImporter is ModelImporter importer))
                return;

            if (assetPath == CharacterPath)
            {
                importer.animationType = ModelImporterAnimationType.Human;
                importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                importer.importAnimation = false;
                importer.optimizeGameObjects = false;
                return;
            }

            if (!assetPath.StartsWith(AnimationFolder, System.StringComparison.OrdinalIgnoreCase) ||
                !assetPath.EndsWith(".fbx", System.StringComparison.OrdinalIgnoreCase))
                return;

            importer.animationType = ModelImporterAnimationType.Human;
            importer.importAnimation = true;
            importer.resampleCurves = true;
            importer.optimizeGameObjects = false;

            var characterAssets = AssetDatabase.LoadAllAssetsAtPath(CharacterPath);
            Avatar characterAvatar = null;
            foreach (var asset in characterAssets)
            {
                if (asset is Avatar avatar && avatar.isValid && avatar.isHuman)
                {
                    characterAvatar = avatar;
                    break;
                }
            }

            if (characterAvatar != null)
            {
                importer.avatarSetup = ModelImporterAvatarSetup.CopyFromOther;
                importer.sourceAvatar = characterAvatar;
            }
            else
            {
                importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                Debug.LogWarning(
                    "ASTREA Mixamo: the character Avatar was not found. Import the rigged " +
                    "ASTREA_Humanoid_Meshy6.fbx first, then reimport this animation: " + assetPath);
            }
        }
    }
}
