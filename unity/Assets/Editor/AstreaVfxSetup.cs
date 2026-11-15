#if UNITY_EDITOR
using Astrea.VFX;
using UnityEditor;
using UnityEngine;

namespace Astrea.EditorTools
{
    /// <summary>Creates editable starter particle prefabs and wires them to the VFX pool.</summary>
    public static class AstreaVfxSetup
    {
        private const string Folder = "Assets/Art/VFX/Generated";

        [MenuItem("ASTREA/VFX/Create Starter VFX Library")]
        public static void CreateStarterLibrary()
        {
            EnsureFolder("Assets/Art", "VFX");
            EnsureFolder("Assets/Art/VFX", "Generated");

            var effects = new ParticleSystem[]
            {
                CreateEffect("ASTREA_MeleeImpact", new Color(1f, 0.78f, 0.28f), 0.22f, 7f, 0.16f, 28, 0.08f),
                CreateEffect("ASTREA_FireBurst", new Color(1f, 0.24f, 0.045f), 0.75f, 2.8f, 0.28f, 46, 0.12f),
                CreateEffect("ASTREA_WaterBurst", new Color(0.12f, 0.58f, 1f), 0.85f, 2.1f, 0.24f, 42, 0.14f),
                CreateEffect("ASTREA_WindBurst", new Color(0.72f, 0.94f, 0.9f), 0.42f, 5.2f, 0.12f, 36, 0.18f),
                CreateEffect("ASTREA_EarthBurst", new Color(0.55f, 0.34f, 0.18f), 0.95f, 2.6f, 0.25f, 38, 0.16f),
                CreateEffect("ASTREA_FrostBurst", new Color(0.35f, 0.82f, 1f), 0.9f, 2.2f, 0.22f, 40, 0.10f),
                CreateEffect("ASTREA_LightningBurst", new Color(0.72f, 0.78f, 1f), 0.28f, 5f, 0.12f, 34, 0.06f),
                CreateEffect("ASTREA_NatureBurst", new Color(0.28f, 0.9f, 0.36f), 1.1f, 1.7f, 0.18f, 34, 0.14f),
                CreateEffect("ASTREA_LightBurst", new Color(1f, 0.94f, 0.62f), 0.58f, 3.4f, 0.20f, 48, 0.10f),
                CreateEffect("ASTREA_DarkBurst", new Color(0.32f, 0.12f, 0.52f), 0.8f, 2.8f, 0.24f, 44, 0.12f)
            };

            var playerVfx = Object.FindFirstObjectByType<AstreaVfxLibrary>();
            if (playerVfx == null)
            {
                EditorUtility.DisplayDialog("ASTREA VFX", "Aucun AstreaVfxLibrary trouvé. Construis la scène de départ, puis relance cette commande.", "OK");
                return;
            }

            var keys = new[] { "melee_impact", "fire_burst", "water_burst", "wind_burst", "earth_burst",
                "frost_burst", "lightning_burst", "nature_burst", "light_burst", "dark_burst" };
            var serialized = new SerializedObject(playerVfx);
            var array = serialized.FindProperty("effects");
            array.arraySize = effects.Length;
            for (int i = 0; i < effects.Length; i++)
                SetEntry(array.GetArrayElementAtIndex(i), keys[i], effects[i], i == 0 ? 5 : 3);
            serialized.ApplyModifiedProperties();
            EditorUtility.SetDirty(playerVfx);
            AssetDatabase.SaveAssets();
            EditorSceneManagerMarkDirty(playerVfx);
            EditorUtility.DisplayDialog("ASTREA VFX", "Dix effets procéduraux de prototype ont été créés et reliés au pool VFX. Ils restent à raffiner pour la qualité finale.", "OK");
        }

        private static void EditorSceneManagerMarkDirty(Object target)
        {
            if (target != null && target.gameObject.scene.IsValid())
                UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(target.gameObject.scene);
        }

        private static void SetEntry(SerializedProperty entry, string key, ParticleSystem prefab, int prewarm)
        {
            entry.FindPropertyRelative("key").stringValue = key;
            entry.FindPropertyRelative("prefab").objectReferenceValue = prefab;
            entry.FindPropertyRelative("prewarm").intValue = prewarm;
        }

        private static ParticleSystem CreateEffect(string name, Color color, float lifetime,
            float speed, float size, int count, float radius)
        {
            string path = Folder + "/" + name + ".prefab";
            var existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (existing != null)
            {
                var existingSystem = existing.GetComponent<ParticleSystem>();
                if (existingSystem != null) return existingSystem;
            }

            var root = new GameObject(name);
            var ps = root.AddComponent<ParticleSystem>();
            var main = ps.main;
            main.duration = 0.35f;
            main.loop = false;
            main.startLifetime = lifetime;
            main.startSpeed = speed;
            main.startSize = size;
            main.startColor = color;
            main.maxParticles = count * 2;
            main.simulationSpace = ParticleSystemSimulationSpace.Local;

            var emission = ps.emission;
            emission.rateOverTime = 0f;
            emission.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)count) });
            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = radius;

            var colorLife = ps.colorOverLifetime;
            colorLife.enabled = true;
            var gradient = new Gradient();
            gradient.SetKeys(
                new[] { new GradientColorKey(color, 0f), new GradientColorKey(Color.white, 0.35f), new GradientColorKey(color, 1f) },
                new[] { new GradientAlphaKey(0f, 0f), new GradientAlphaKey(1f, 0.12f), new GradientAlphaKey(0f, 1f) });
            colorLife.color = gradient;
            var sizeLife = ps.sizeOverLifetime;
            sizeLife.enabled = true;
            sizeLife.size = new AnimationCurve(new Keyframe(0f, 0.35f), new Keyframe(0.25f, 1f), new Keyframe(1f, 0f));

            var renderer = root.GetComponent<ParticleSystemRenderer>();
            var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (shader == null) shader = Shader.Find("Particles/Standard Unlit");
            if (shader != null)
            {
                string materialPath = Folder + "/" + name + "_Material.mat";
                var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
                if (material == null)
                {
                    material = new Material(shader) { name = name + "_Material" };
                    AssetDatabase.CreateAsset(material, materialPath);
                }
                else if (material.shader != shader)
                {
                    material.shader = shader;
                    EditorUtility.SetDirty(material);
                }
                renderer.sharedMaterial = material;
            }
            else
            {
                Debug.LogWarning("ASTREA VFX: aucun shader de particules compatible trouvé pour " + name);
            }

            var prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return prefab != null ? prefab.GetComponent<ParticleSystem>() : null;
        }

        private static void EnsureFolder(string parent, string child)
        {
            string path = parent + "/" + child;
            if (!AssetDatabase.IsValidFolder(path))
                AssetDatabase.CreateFolder(parent, child);
        }
    }
}
#endif
