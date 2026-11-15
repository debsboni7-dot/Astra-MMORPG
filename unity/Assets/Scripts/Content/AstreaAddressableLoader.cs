using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace Astrea.Content
{
    /// <summary>
    /// Instantiates optional world chunks and cosmetics by Addressables key.
    /// Every spawned instance is tracked and released when explicitly unloaded
    /// or when this loader is destroyed.
    /// </summary>
    public sealed class AstreaAddressableLoader : MonoBehaviour
    {
        private readonly HashSet<GameObject> instances = new HashSet<GameObject>();

        public IEnumerator Instantiate(string address, Transform parent, System.Action<GameObject> completed)
        {
            if (string.IsNullOrWhiteSpace(address))
            {
                Debug.LogError("ASTREA Addressables: an address key is required.");
                completed?.Invoke(null);
                yield break;
            }

            AsyncOperationHandle<GameObject> handle = Addressables.InstantiateAsync(address, parent);
            yield return handle;

            if (handle.Status != AsyncOperationStatus.Succeeded || handle.Result == null)
            {
                Debug.LogError("ASTREA Addressables: failed to instantiate key '" + address + "'.");
                completed?.Invoke(null);
                yield break;
            }

            instances.Add(handle.Result);
            completed?.Invoke(handle.Result);
        }

        public bool Release(GameObject instance)
        {
            if (instance == null || !instances.Remove(instance))
                return false;
            return Addressables.ReleaseInstance(instance);
        }

        private void OnDestroy()
        {
            foreach (GameObject instance in instances)
            {
                if (instance != null)
                    Addressables.ReleaseInstance(instance);
            }
            instances.Clear();
        }
    }
}
