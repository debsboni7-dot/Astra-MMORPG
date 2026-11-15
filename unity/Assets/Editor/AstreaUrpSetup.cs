#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace Astrea.Editor
{
    public static class AstreaUrpSetup
    {
        [MenuItem("ASTREA/Rendering/Generate and activate URP asset")]
        public static void GenerateAndActivateUrp()
        {
            const string settingsFolder = "Assets/Settings";
            if (!AssetDatabase.IsValidFolder(settingsFolder))
                AssetDatabase.CreateFolder("Assets", "Settings");

            Selection.activeObject = AssetDatabase.LoadAssetAtPath<DefaultAsset>(settingsFolder);
            bool invoked = EditorApplication.ExecuteMenuItem(
                "Assets/Create/Rendering/URP Asset (with Universal Renderer)");

            if (!invoked)
            {
                EditorUtility.DisplayDialog(
                    "ASTREA URP setup",
                    "Unity n'a pas pu lancer la création de l'asset URP. Crée-le dans Assets/Settings avec Assets > Create > Rendering > URP Asset (with Universal Renderer), puis lance ASTREA > Rendering > Activate selected URP asset.",
                    "OK");
                return;
            }

            EditorApplication.delayCall += ActivateSelectedUrp;
        }

        [MenuItem("ASTREA/Rendering/Activate selected URP asset")]
        public static void ActivateSelectedUrp()
        {
            RenderPipelineAsset pipeline = Selection.activeObject as RenderPipelineAsset;
            if (pipeline == null)
            {
                string[] ids = AssetDatabase.FindAssets("t:RenderPipelineAsset", new[] { "Assets/Settings" });
                foreach (string id in ids)
                {
                    pipeline = AssetDatabase.LoadAssetAtPath<RenderPipelineAsset>(AssetDatabase.GUIDToAssetPath(id));
                    if (pipeline != null) break;
                }
            }

            if (pipeline == null)
            {
                EditorUtility.DisplayDialog("ASTREA URP setup", "Aucun asset URP trouvé dans Assets/Settings.", "OK");
                return;
            }

            GraphicsSettings.defaultRenderPipeline = pipeline;
            QualitySettings.renderPipeline = pipeline;
            AssetDatabase.SaveAssets();
            EditorUtility.DisplayDialog("ASTREA URP setup", "URP est défini comme pipeline graphique par défaut. Vérifie les niveaux de qualité et profile Android avant publication.", "OK");
        }
    }
}
#endif
