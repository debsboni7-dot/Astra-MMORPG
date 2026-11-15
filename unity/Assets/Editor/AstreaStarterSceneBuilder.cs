using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using Astrea.Rendering;

namespace Astrea.EditorTools
{
    /// <summary>
    /// Creates a first inspectable Unity scene from the generated Astrea FBX.
    /// Run from Unity Editor after the environment asset has been imported.
    /// </summary>
    public static class AstreaStarterSceneBuilder
    {
        private const string EnvironmentPath = "Assets/Art/Environment/Astrea/ASTREA_Starter_Plains.fbx";
        private const string ScenePath = "Assets/Scenes/ASTREA_Starter_Plains.unity";

        [MenuItem("ASTREA/World/Build Starter Plains Scene")]
        public static void Build()
        {
            var environmentPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(EnvironmentPath);
            if (environmentPrefab == null)
            {
                Debug.LogError("ASTREA environment FBX not found. Run the Blender world build and allow Unity to import it first: " + EnvironmentPath);
                return;
            }

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            scene.name = "ASTREA_Starter_Plains";

            var environment = (GameObject)PrefabUtility.InstantiatePrefab(environmentPrefab, scene);
            environment.name = "ASTREA | Starter Plains Environment";
            environment.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);

            // Only the terrain receives a collider. Decorative foliage and props remain render-only.
            foreach (var filter in environment.GetComponentsInChildren<MeshFilter>(true))
            {
                if (filter.sharedMesh == null || !filter.name.ToLowerInvariant().Contains("rolling starter plains terrain"))
                    continue;
                var collider = filter.GetComponent<MeshCollider>();
                if (collider == null) collider = filter.gameObject.AddComponent<MeshCollider>();
                collider.sharedMesh = filter.sharedMesh;
            }

            var bootstrap = new GameObject("ASTREA | Scene Bootstrap");
            bootstrap.AddComponent<AstreaGraphicsProfile>();

            var spawn = new GameObject("ASTREA | Player Spawn");
            spawn.transform.position = new Vector3(0f, 4f, 0f);

            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = new Vector3(12f, 10f, -18f);
            cameraObject.transform.rotation = Quaternion.LookRotation(new Vector3(0f, 1.5f, 0f) - cameraObject.transform.position, Vector3.up);
            var camera = cameraObject.AddComponent<Camera>();
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 600f;
            camera.fieldOfView = 60f;
            cameraObject.AddComponent<AudioListener>();

            var sunObject = new GameObject("ASTREA | Warm Daylight");
            var sun = sunObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.88f, 0.72f);
            sun.intensity = 1.15f;
            sun.shadows = LightShadows.Soft;
            sunObject.transform.rotation = Quaternion.Euler(38f, -28f, 0f);
            RenderSettings.sun = sun;

            var ambient = new GameObject("ASTREA | Ambient Reflection");
            var probe = ambient.AddComponent<ReflectionProbe>();
            probe.mode = UnityEngine.Rendering.ReflectionProbeMode.Baked;
            probe.size = new Vector3(120f, 40f, 120f);
            probe.intensity = 0.65f;

            var folder = "Assets/Scenes";
            if (!AssetDatabase.IsValidFolder(folder))
                AssetDatabase.CreateFolder("Assets", "Scenes");

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene, ScenePath);

            var entries = EditorBuildSettings.scenes.ToList();
            if (!entries.Any(e => e.path == ScenePath))
                entries.Insert(0, new EditorBuildSettingsScene(ScenePath, true));
            EditorBuildSettings.scenes = entries.ToArray();

            Selection.activeGameObject = environment;
            Debug.Log("ASTREA starter scene created at " + ScenePath + ". Assign the player prefab and mobile HUD after character assets are integrated.");
        }
    }
}
