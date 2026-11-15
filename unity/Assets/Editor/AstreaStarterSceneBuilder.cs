using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using Astrea.Rendering;
using Astrea.UI;
using Astrea.Character;
using Astrea.Combat;
using Astrea.Input;
using Unity.Cinemachine;
using Astrea.Animation;
using Astrea.VFX;

namespace Astrea.EditorTools
{
    /// <summary>
    /// Creates a first inspectable Unity scene from the generated Astrea FBX.
    /// Run from Unity Editor after the environment asset has been imported.
    /// </summary>
    public static class AstreaStarterSceneBuilder
    {
        private const string EnvironmentPath = "Assets/Art/Environment/Astrea/ASTREA_Starter_Plains.fbx";
        private const string PlayerModelPath = "Assets/Art/Characters/ASTREA_Humanoid_Meshy6.fbx";
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

            var playerModel = AssetDatabase.LoadAssetAtPath<GameObject>(PlayerModelPath);
            if (playerModel != null)
            {
                var player = (GameObject)PrefabUtility.InstantiatePrefab(playerModel, scene);
                player.name = "ASTREA | Player";
                player.transform.SetPositionAndRotation(spawn.transform.position, Quaternion.identity);
                var characterController = player.GetComponent<CharacterController>();
                if (characterController == null) characterController = player.AddComponent<CharacterController>();
                characterController.height = 1.8f;
                characterController.radius = 0.34f;
                characterController.center = new Vector3(0f, 0.9f, 0f);
                if (player.GetComponent<AstreaThirdPersonController>() == null) player.AddComponent<AstreaThirdPersonController>();
                if (player.GetComponent<AstreaCombatController>() == null) player.AddComponent<AstreaCombatController>();
                if (player.GetComponent<AstreaHealth>() == null) player.AddComponent<AstreaHealth>();
                if (player.GetComponent<AstreaInputRouter>() == null) player.AddComponent<AstreaInputRouter>();
                if (player.GetComponent<AstreaVfxLibrary>() == null) player.AddComponent<AstreaVfxLibrary>();
                if (player.GetComponent<AstreaSpellVfxController>() == null) player.AddComponent<AstreaSpellVfxController>();
                var playerAnimator = player.GetComponentInChildren<Animator>();
                if (playerAnimator != null && playerAnimator.GetComponent<AstreaAnimationDriver>() == null)
                    playerAnimator.gameObject.AddComponent<AstreaAnimationDriver>();
            }
            else
            {
                Debug.LogWarning("ASTREA player model not imported yet. The scene will be created without a playable character until " + PlayerModelPath + " is available.");
            }

            var cameraPivotObject = new GameObject("ASTREA | Third Person Camera Pivot");
            cameraPivotObject.transform.position = spawn.transform.position + new Vector3(0f, 1.55f, 0f);
            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            cameraObject.transform.position = cameraPivotObject.transform.position + new Vector3(0f, 0f, -5.5f);
            cameraObject.transform.rotation = Quaternion.identity;
            cameraObject.AddComponent<CinemachineBrain>();
            var camera = cameraObject.AddComponent<Camera>();
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 600f;
            camera.fieldOfView = 60f;
            cameraObject.AddComponent<AudioListener>();

            var followCameraObject = new GameObject("ASTREA | Cinemachine Third Person Camera");
            var followCamera = followCameraObject.AddComponent<CinemachineCamera>();
            followCamera.Follow = cameraPivotObject.transform;
            followCamera.LookAt = cameraPivotObject.transform;
            var follow = followCameraObject.AddComponent<CinemachineFollow>();
            follow.FollowOffset = new Vector3(0f, 0.25f, -5.5f);
            followCameraObject.AddComponent<CinemachineRotationComposer>();

            BuildMobileHud(cameraPivotObject.transform);

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
        private static void BuildMobileHud(Transform cameraPivot)
        {
            var eventSystem = Object.FindObjectOfType<EventSystem>();
            if (eventSystem == null)
                new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));

            var canvasObject = new GameObject("ASTREA | Mobile HUD", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;

            var lookObject = CreateUiImage("Touch Look Area", canvasObject.transform,
                new Vector2(0.40f, 0f), new Vector2(1f, 1f), Vector2.zero, Vector2.zero,
                new Color(1f, 1f, 1f, 0.01f), true);
            var look = lookObject.AddComponent<AstreaTouchLookArea>();

            var joystickObject = CreateUiImage("Movement Joystick", canvasObject.transform,
                Vector2.zero, Vector2.zero, new Vector2(165f, 160f), new Vector2(190f, 190f),
                new Color(0.08f, 0.12f, 0.18f, 0.30f), true);
            var joystickHandleObject = CreateUiImage("Joystick Handle", joystickObject.transform,
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(76f, 76f),
                new Color(0.78f, 0.84f, 0.90f, 0.72f), false);
            var joystick = joystickObject.AddComponent<AstreaVirtualJoystick>();
            var joystickSerialized = new SerializedObject(joystick);
            joystickSerialized.FindProperty("background").objectReferenceValue = joystickObject.GetComponent<RectTransform>();
            joystickSerialized.FindProperty("handle").objectReferenceValue = joystickHandleObject.GetComponent<RectTransform>();
            joystickSerialized.ApplyModifiedPropertiesWithoutUndo();

            var binder = canvasObject.AddComponent<AstreaMobileInputBinder>();
            var binderSerialized = new SerializedObject(binder);
            binderSerialized.FindProperty("joystick").objectReferenceValue = joystick;
            binderSerialized.FindProperty("lookArea").objectReferenceValue = look;
            binderSerialized.FindProperty("cameraPivot").objectReferenceValue = cameraPivot;
            binderSerialized.ApplyModifiedPropertiesWithoutUndo();

            var jumpObject = CreateUiImage("Jump Button", canvasObject.transform,
                new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-145f, 145f), new Vector2(112f, 112f),
                new Color(0.76f, 0.62f, 0.24f, 0.82f), true);
            var jumpButton = jumpObject.AddComponent<Button>();
            jumpButton.targetGraphic = jumpObject.GetComponent<Image>();
            jumpButton.onClick.AddListener(binder.RequestJump);
            var jumpTextObject = new GameObject("Jump Label", typeof(RectTransform), typeof(CanvasRenderer), typeof(Text));
            jumpTextObject.transform.SetParent(jumpObject.transform, false);
            var jumpText = jumpTextObject.GetComponent<Text>();
            jumpText.text = "JUMP";
            jumpText.alignment = TextAnchor.MiddleCenter;
            jumpText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            jumpText.color = Color.white;
            jumpText.fontSize = 22;
            var textRect = jumpTextObject.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;

            var attackObject = CreateUiImage("Attack Button", canvasObject.transform,
                new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-285f, 145f), new Vector2(112f, 112f),
                new Color(0.62f, 0.18f, 0.16f, 0.88f), true);
            var attackButton = attackObject.AddComponent<Button>();
            attackButton.targetGraphic = attackObject.GetComponent<Image>();
            attackButton.onClick.AddListener(binder.RequestAttack);
            var attackTextObject = new GameObject("Attack Label", typeof(RectTransform), typeof(CanvasRenderer), typeof(Text));
            attackTextObject.transform.SetParent(attackObject.transform, false);
            var attackText = attackTextObject.GetComponent<Text>();
            attackText.text = "ATTACK";
            attackText.alignment = TextAnchor.MiddleCenter;
            attackText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            attackText.color = Color.white;
            attackText.fontSize = 19;
            var attackTextRect = attackTextObject.GetComponent<RectTransform>();
            attackTextRect.anchorMin = Vector2.zero;
            attackTextRect.anchorMax = Vector2.one;
            attackTextRect.offsetMin = Vector2.zero;
            attackTextRect.offsetMax = Vector2.zero;
        }

        private static GameObject CreateUiImage(string name, Transform parent, Vector2 anchorMin,
            Vector2 anchorMax, Vector2 anchoredPosition, Vector2 size, Color color, bool raycast)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(CanvasRenderer), typeof(Image));
            var rect = go.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = anchoredPosition;
            rect.sizeDelta = size;
            var image = go.GetComponent<Image>();
            image.color = color;
            image.raycastTarget = raycast;
            return go;
        }

    }
}
