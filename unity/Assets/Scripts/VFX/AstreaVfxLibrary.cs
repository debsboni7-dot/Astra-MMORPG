using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Astrea.VFX
{
    /// <summary>
    /// Lightweight pooled particle effect service. Assign authored ParticleSystem prefabs
    /// in the Inspector; no paid VFX package or runtime asset generation is required.
    /// </summary>
    public sealed class AstreaVfxLibrary : MonoBehaviour
    {
        [System.Serializable]
        private sealed class EffectEntry
        {
            public string key;
            public ParticleSystem prefab;
            [Min(0)] public int prewarm = 3;
        }

        [SerializeField] private EffectEntry[] effects;
        [SerializeField, Min(1)] private int maxPerEffect = 24;
        private readonly Dictionary<string, Queue<ParticleSystem>> pools = new Dictionary<string, Queue<ParticleSystem>>();
        private readonly Dictionary<string, ParticleSystem> prefabs = new Dictionary<string, ParticleSystem>();
        private readonly Dictionary<string, int> instanceCounts = new Dictionary<string, int>();

        private void Awake()
        {
            if (effects == null) return;
            foreach (var entry in effects)
            {
                if (entry == null || string.IsNullOrWhiteSpace(entry.key) || entry.prefab == null) continue;
                if (prefabs.ContainsKey(entry.key)) continue;
                prefabs.Add(entry.key, entry.prefab);
                var pool = new Queue<ParticleSystem>();
                pools.Add(entry.key, pool);
                instanceCounts.Add(entry.key, 0);
                for (int i = 0; i < entry.prewarm && pool.Count < maxPerEffect; i++)
                {
                    var prewarmed = Create(entry.prefab, entry.key);
                    if (prewarmed != null) pool.Enqueue(prewarmed);
                }
            }
        }

        public bool Play(string key, Vector3 position, Quaternion rotation, float scale = 1f)
        {
            if (!prefabs.TryGetValue(key, out var prefab) || !pools.TryGetValue(key, out var pool))
                return false;

            ParticleSystem instance;
            if (pool.Count > 0)
                instance = pool.Dequeue();
            else if (instanceCounts[key] < maxPerEffect)
                instance = Create(prefab, key);
            else
                return false; // Respect the per-effect cap instead of allocating without a limit.
            if (instance == null) return false;
            instance.transform.SetPositionAndRotation(position, rotation);
            instance.transform.localScale = Vector3.one * Mathf.Max(0.01f, scale);
            instance.gameObject.SetActive(true);
            instance.Clear(true);
            instance.Play(true);
            StartCoroutine(ReturnWhenFinished(instance, key));
            return true;
        }

        private ParticleSystem Create(ParticleSystem prefab, string key)
        {
            var instance = Instantiate(prefab, transform);
            if (instance == null) return null;
            instanceCounts[key]++;
            instance.gameObject.SetActive(false);
            return instance;
        }

        private IEnumerator ReturnWhenFinished(ParticleSystem instance, string key)
        {
            while (instance != null && instance.IsAlive(true))
                yield return null;
            if (instance == null) yield break;
            instance.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            instance.gameObject.SetActive(false);
            if (pools.TryGetValue(key, out var pool) && pool.Count < maxPerEffect)
                pool.Enqueue(instance);
            else
            {
                instanceCounts[key] = Mathf.Max(0, instanceCounts[key] - 1);
                Destroy(instance.gameObject);
            }
        }
    }
}
