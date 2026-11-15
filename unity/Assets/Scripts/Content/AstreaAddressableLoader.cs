using System.Collections;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace Astrea.Content
{
    /// <summary>
    /// Small Addressables runtime loader. Use stable address keys for optional world
    /// chunks and cosmetics; loaded instances are released when unloaded.
    /// </summary>
    public sealed class AstreaAddressableLoader : MonoBehaviour
    {
        public IEnumerator Instantiate(string address, Transform parent, System.Action<GameObject> completed)
        {
            if (string.IsNullOrWhiteSpace(address))
            {
                Debug.LogError("ASTREA Addressables: an address key is required.");
                completed?.Invoke(null);
                yield break;
            }

            AsyncOperationHandle<GameObject> handle = Addressables.LoadAssetAsync<GameObject>(address);
            yield return handle;

            if (handle.Status != AsyncOperationStatus.Succeeded || handle.Result == null)
            {
                Debug.LogError("ASTREA Addressables: failed to load key '" + address + "'.");
                if (handle.IsValid()) Addressables.Release(handle);
                completed?.Invoke(null);
                yield break;
            }

            GameObject instance = Instantiate(handle.Result, parent);
            completed?.Invoke(instance);
            Addressables.Release(handle);
        }
    }
}
