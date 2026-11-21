#if UNITY_EDITOR
using System;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using Astrea.Networking;
using FishNet.Component.Spawning;
using FishNet.Component.Transforming;
using FishNet.Managing;
using FishNet.Managing.Object;
using FishNet.Managing.Transporting;
using FishNet.Managing.Server;
using FishNet.Object;
using FishNet.Transporting;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Astrea.EditorTools
{
    /// <summary>
    /// Creates an isolated, disposable scene for validating FishNet authentication,
    /// server-owned spawning and two-client movement replication.
    /// The cube proxy is a network test fixture, not a production character asset.
    /// </summary>
    public static class AstreaFishNetPrototypeSceneBuilder
    {
        private const string NetworkManagerPackagePath =
            "Packages/com.firstgeargames.fishnet/Demos/Prefabs/NetworkManager.prefab";
        private const string NetworkTestScenePath = "Assets/Scenes/ASTREA_FishNet_NetworkTest.unity";
        private const string NetworkPlayerPrefabPath =
            "Assets/Networking/Prefabs/ASTREA_NetworkTestProxy.prefab";
        private const string SpawnablePrefabsPath =
            "Assets/Networking/ASTREA_NetworkTestSpawnables.asset";

        [MenuItem("ASTREA/Networking/Build FishNet Network Test Scene")]
        public static void Build()
        {
            EnsureFolder("Assets/Networking");
            EnsureFolder("Assets/Networking/Prefabs");
            EnsureFolder("Assets/Scenes");

            GameObject sourceManagerPrefab =
                AssetDatabase.LoadAssetAtPath<GameObject>(NetworkManagerPackagePath);
            if (sourceManagerPrefab == null)
                throw new InvalidOperationException(
                    "FishNet NetworkManager demo prefab not found. Resolve FishNet 4.7.4 in Unity first.");

            NetworkObject playerPrefab = BuildNetworkTestPlayerPrefab();
            SinglePrefabObjects spawnablePrefabs = BuildSpawnablePrefabs(playerPrefab);

            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            GameObject managerRoot = PrefabUtility.InstantiatePrefab(sourceManagerPrefab, scene) as GameObject;
            if (managerRoot == null)
                throw new InvalidOperationException("Could not instantiate FishNet NetworkManager prefab.");

            managerRoot.name = "ASTREA_FishNet_NetworkManager";
            PrefabUtility.UnpackPrefabInstance(
                managerRoot, PrefabUnpackMode.Completely, InteractionMode.AutomatedAction);

            for (int i = managerRoot.transform.childCount - 1; i >= 0; i--)
                UnityEngine.Object.DestroyImmediate(managerRoot.transform.GetChild(i).gameObject);

            PlayerSpawner defaultSpawner = managerRoot.GetComponent<PlayerSpawner>();
            if (defaultSpawner != null)
                UnityEngine.Object.DestroyImmediate(defaultSpawner);

            NetworkManager networkManager = managerRoot.GetComponent<NetworkManager>();
            if (networkManager == null)
                throw new InvalidOperationException("FishNet NetworkManager component is missing.");

            ServerManager fishNetServerManager = managerRoot.GetComponent<ServerManager>();
            if (fishNetServerManager == null)
                fishNetServerManager = managerRoot.AddComponent<ServerManager>();
            fishNetServerManager.SetStartOnHeadless(false);
            EditorUtility.SetDirty(fishNetServerManager);

            SerializedObject networkManagerData = new SerializedObject(networkManager);
            SerializedProperty spawnableProperty = networkManagerData.FindProperty("_spawnablePrefabs");
            if (spawnableProperty == null)
                throw new InvalidOperationException("FishNet _spawnablePrefabs field was not found.");
            spawnableProperty.objectReferenceValue = spawnablePrefabs;
            networkManagerData.ApplyModifiedPropertiesWithoutUndo();

            // Replace the demo Tugboat transport with the encrypted Unity Transport adapter.
            foreach (Transport existingTransport in managerRoot.GetComponents<Transport>())
                UnityEngine.Object.DestroyImmediate(existingTransport);

            Type unityTransportType = Type.GetType(
                "FishNet.Transporting.UTP.UnityTransport, FishyUnityTransport");
            if (unityTransportType == null)
                throw new InvalidOperationException("FishyUnityTransport 2.x was not resolved by Unity Package Manager.");

            Transport unityTransport = managerRoot.AddComponent(unityTransportType) as Transport;
            if (unityTransport == null)
                throw new InvalidOperationException("Could not create FishyUnityTransport component.");
            MethodInfo setConnectionData = unityTransport.GetType().GetMethod(
                "SetConnectionData", new[] { typeof(string), typeof(ushort), typeof(string) });
            if (setConnectionData == null)
                throw new InvalidOperationException("FishyUnityTransport SetConnectionData API was not found.");
            setConnectionData.Invoke(unityTransport, new object[] { "127.0.0.1", (ushort)7770, "0.0.0.0" });

            PropertyInfo encryptionProperty = unityTransport.GetType().GetProperty("UseEncryption");
            if (encryptionProperty == null)
                throw new InvalidOperationException("FishyUnityTransport encryption API was not found.");
            encryptionProperty.SetValue(unityTransport, true, null);
            EditorUtility.SetDirty(unityTransport);
            TransportManager transportManager = managerRoot.GetComponent<TransportManager>();
            if (transportManager == null)
                transportManager = managerRoot.AddComponent<TransportManager>();
            transportManager.Transport = unityTransport;

            AstreaFishNetTransportSecurity transportSecurity =
                managerRoot.AddComponent<AstreaFishNetTransportSecurity>();
            SerializedObject transportSecurityData = new SerializedObject(transportSecurity);
            transportSecurityData.FindProperty("transportComponent").objectReferenceValue = unityTransport;
            transportSecurityData.FindProperty("serverCommonName").stringValue = "localhost";
            transportSecurityData.ApplyModifiedPropertiesWithoutUndo();

            AstreaFishNetZonePersistence zonePersistence =
                managerRoot.AddComponent<AstreaFishNetZonePersistence>();
            SerializedObject zonePersistenceData = new SerializedObject(zonePersistence);
            zonePersistenceData.FindProperty("networkManager").objectReferenceValue = networkManager;
            zonePersistenceData.FindProperty("zoneId").stringValue = "astrea-prototype-zone-01";
            zonePersistenceData.ApplyModifiedPropertiesWithoutUndo();

            AstreaFishNetAuthenticator authenticator =
                managerRoot.AddComponent<AstreaFishNetAuthenticator>();
            AstreaFishNetPlayerSpawner playerSpawner =
                managerRoot.AddComponent<AstreaFishNetPlayerSpawner>();
            AstreaFishNetNetworkTestClient clientHarness =
                managerRoot.AddComponent<AstreaFishNetNetworkTestClient>();

            GameObject spawnPointObject = new GameObject("ASTREA_NetworkTestSpawnPoint");
            spawnPointObject.transform.position = new Vector3(0f, 1f, 0f);

            SerializedObject spawnerData = new SerializedObject(playerSpawner);
            spawnerData.FindProperty("networkManager").objectReferenceValue = networkManager;
            spawnerData.FindProperty("authenticator").objectReferenceValue = authenticator;
            spawnerData.FindProperty("playerPrefab").objectReferenceValue = playerPrefab;
            spawnerData.FindProperty("spawnPoint").objectReferenceValue = spawnPointObject.transform;
            spawnerData.ApplyModifiedPropertiesWithoutUndo();

            SerializedObject clientData = new SerializedObject(clientHarness);
            clientData.FindProperty("networkManager").objectReferenceValue = networkManager;
            clientData.FindProperty("authenticator").objectReferenceValue = authenticator;
            clientData.ApplyModifiedPropertiesWithoutUndo();

            EditorSceneManager.SaveScene(scene, NetworkTestScenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("ASTREA FishNet network test scene created: " + NetworkTestScenePath);
        }

        private static NetworkObject BuildNetworkTestPlayerPrefab()
        {
            if (AssetDatabase.LoadAssetAtPath<GameObject>(NetworkPlayerPrefabPath) != null)
                AssetDatabase.DeleteAsset(NetworkPlayerPrefabPath);

            GameObject proxy = GameObject.CreatePrimitive(PrimitiveType.Cube);
            proxy.name = "ASTREA_NetworkTestProxy";
            proxy.transform.localScale = new Vector3(0.8f, 1.8f, 0.8f);

            NetworkObject networkObject = proxy.AddComponent<NetworkObject>();
            networkObject.SetIsSpawnable(true);
            networkObject.SetAssetPathHash(ComputeStablePrefabHash(NetworkPlayerPrefabPath + proxy.name));

            NetworkTransform networkTransform = proxy.AddComponent<NetworkTransform>();
            SerializedObject transformData = new SerializedObject(networkTransform);
            SerializedProperty clientAuthority = transformData.FindProperty("_clientAuthoritative");
            if (clientAuthority == null)
                throw new InvalidOperationException("FishNet NetworkTransform authority field was not found.");
            clientAuthority.boolValue = false;
            transformData.ApplyModifiedPropertiesWithoutUndo();

            proxy.AddComponent<AstreaFishNetNetworkTestPlayer>();

            GameObject saved = PrefabUtility.SaveAsPrefabAsset(proxy, NetworkPlayerPrefabPath);
            UnityEngine.Object.DestroyImmediate(proxy);
            if (saved == null)
                throw new InvalidOperationException("Failed to save ASTREA network test proxy prefab.");

            AssetDatabase.SaveAssets();
            GameObject savedPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(NetworkPlayerPrefabPath);
            NetworkObject prefab = savedPrefab != null ? savedPrefab.GetComponent<NetworkObject>() : null;
            if (prefab == null)
                throw new InvalidOperationException("Saved network test prefab has no NetworkObject.");
            return prefab;
        }

        private static SinglePrefabObjects BuildSpawnablePrefabs(NetworkObject playerPrefab)
        {
            if (AssetDatabase.LoadAssetAtPath<SinglePrefabObjects>(SpawnablePrefabsPath) != null)
                AssetDatabase.DeleteAsset(SpawnablePrefabsPath);

            SinglePrefabObjects collection = ScriptableObject.CreateInstance<SinglePrefabObjects>();
            collection.AddObject(playerPrefab, checkForDuplicates: true, initializeAdded: false);
            AssetDatabase.CreateAsset(collection, SpawnablePrefabsPath);
            EditorUtility.SetDirty(collection);
            AssetDatabase.SaveAssets();
            return collection;
        }

        private static ulong ComputeStablePrefabHash(string value)
        {
            using (SHA256 sha = SHA256.Create())
            {
                byte[] digest = sha.ComputeHash(Encoding.UTF8.GetBytes(value.Trim().ToLowerInvariant()));
                ulong hash = 0UL;
                for (int i = 0; i < 8; i++)
                    hash |= (ulong)digest[i] << (i * 8);
                return hash == 0UL ? 1UL : hash;
            }
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path))
                return;

            string parent = Path.GetDirectoryName(path)?.Replace("\\", "/");
            string folder = Path.GetFileName(path);
            if (string.IsNullOrEmpty(parent) || string.IsNullOrEmpty(folder))
                throw new InvalidOperationException("Invalid Unity asset folder: " + path);
            if (!AssetDatabase.IsValidFolder(parent))
                EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, folder);
        }
    }
}
#endif
