#if UNITY_EDITOR
using Astrea.VFX;
using UnityEditor;
using UnityEngine;

namespace Astrea.EditorTools
{
    /// <summary>Creates editable starter particle prefabs and wires them to the player VFX pool.</summary>
    public static class AstreaVfxSetup
    {
        private const string Folder = "Assets/Art/VFX/Generated";

        [MenuItem("ASTREA/VFX/Create Starter VFX Library")]
        public static void CreateStarterLibrary()
        {
            EnsureFolder("Assets/Art", "VFX");
            EnsureFolder("Assets/Art/VFX", "Generated");

            var impact = CreateEffect("ASTREA_MeleeImpact", new Color(1f, 0.78f, 0.28f), 0.22f, 7f, 0.16f, 28, 0.08f);
            var fire = CreateEffect("ASTREA_FireBurst", new Color(1f, 0.24f, 0.045f), 0.75f, 2.8f, 0.28f, 46, 0.12f);
            var frost = CreateEffect("ASTREA_FrostBurst", new Color(0.35f, 0.82f, 1f), 0.9f, 2.2f, 0.22f, 40, 0.10f);
            var lightning = CreateEffect("ASTREA_LightningBurst", new Color(0.72f, 0.78f, 1f), 0.28f, 5f, 0.12f, 34, 0.06f);
            var nature = CreateEffect("ASTREA_NatureBurst", new Color(0.28f, 0.9f, 0.36f), 1.1f, 1.7f, 0.18f, 34, 0.14f);

            var playerVfx = Object.FindObjectOfType<AstreaVfxLibrary>();
            if (playerVfx == null)
            {
                EditorUtility.DisplayDialog("ASTREA VFX", "Aucun AstreaVfxLibrary trouvé. Crée la scène de départ et relance cette commande.", "OK");
                return;
            }

            var serialized = new SerializedObject(playerVfx);
            var array = serialized.FindProperty("effects");
            array.arraySize = 5;
            SetEntry(array.GetArrayElementAtIndex(0), "melee_impact", impact, 5);
            SetEntry(array.GetArrayElementAtIndex(1), "fire_burst", fire, 3);
            SetEntry(array.GetArrayElementAtIndex(2), "frost_burst", frost, 3);
            SetEntry(array.GetArrayElementAtIndex(3), "lightning_burst", lightning, 3);
            SetEntry(array.GetArrayElementAtIndex(4), "nature_burst", nature, 3);
            serialized.ApplyModifiedProperties();
            EditorUtility.SetDirty(playerVfx);
            AssetDatabase.SaveAssets();
            EditorUtility.DisplayDialog("ASTREA VFX", "Cinq effets de départ ont été créés et reliés au pool VFX du joueur. Ce sont des effets procéduraux de prototype, à remplacer ou raffiner pour la qualité finale.", "OK");
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
            if (existing != null) return existing.GetComponent<ParticleSystem>();

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
            if (shader != null) renderer.sharedMaterial = new Material(shader) { name = name + "_Material" };

            var prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return prefab.GetComponent<ParticleSystem>();
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
