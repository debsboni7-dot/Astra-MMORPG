using System.Collections.Generic;
using FishNet.Connection;
using FishNet.Managing;
using FishNet.Object;
using FishNet.Transporting;
using UnityEngine;

namespace Astrea.Networking
{
    /// <summary>
    /// Server-only identity attached to the spawned network player.
    /// It is not a client-writable source of account or character identity.
    /// </summary>
    public sealed class AstreaServerPlayerIdentity : MonoBehaviour
    {
        public string AccountId { get; private set; }
        public string CharacterId { get; private set; }

        internal void Initialize(string accountId, string characterId)
        {
            AccountId = accountId;
            CharacterId = characterId;
        }
    }

    /// <summary>
    /// Spawns a network player only after FishNet authentication and Node ticket
    /// consumption have succeeded. Assign a prefab containing a FishNet NetworkObject.
    /// </summary>
    public sealed class AstreaFishNetPlayerSpawner : MonoBehaviour
    {
        [SerializeField] private NetworkManager networkManager;
        [SerializeField] private AstreaFishNetAuthenticator authenticator;
        [SerializeField] private NetworkObject playerPrefab;
        [SerializeField] private Transform spawnPoint;

        private readonly HashSet<int> spawnedConnections = new HashSet<int>();

        private void Awake()
        {
            if (networkManager == null)
                networkManager = GetComponent<NetworkManager>();
            if (authenticator == null)
                authenticator = GetComponent<AstreaFishNetAuthenticator>();
        }

        private void OnEnable()
        {
            if (authenticator != null)
                authenticator.OnClientIdentityAuthenticated += SpawnAuthenticatedPlayer;
            if (networkManager != null && networkManager.ServerManager != null)
                networkManager.ServerManager.OnRemoteConnectionState += OnRemoteConnectionState;
        }

        private void OnDisable()
        {
            if (authenticator != null)
                authenticator.OnClientIdentityAuthenticated -= SpawnAuthenticatedPlayer;
            if (networkManager != null && networkManager.ServerManager != null)
                networkManager.ServerManager.OnRemoteConnectionState -= OnRemoteConnectionState;
        }

        private void SpawnAuthenticatedPlayer(
            NetworkConnection connection,
            AstreaJoinTicketConsumeIdentity identity)
        {
            if (connection == null || identity == null || !connection.IsAuthenticated)
                return;

            if (playerPrefab == null || networkManager == null || !networkManager.ServerManager.Started)
            {
                Debug.LogError("ASTREA FishNet player spawn is not configured. Disconnecting authenticated connection.");
                connection.Disconnect(true);
                return;
            }

            if (!spawnedConnections.Add(connection.ClientId))
            {
                connection.Disconnect(true);
                return;
            }

            Vector3 position = spawnPoint != null ? spawnPoint.position : Vector3.zero;
            position += Vector3.right * connection.ClientId * 2f;
            Quaternion rotation = spawnPoint != null ? spawnPoint.rotation : Quaternion.identity;
            NetworkObject player = Instantiate(playerPrefab, position, rotation);
            AstreaServerPlayerIdentity serverIdentity = player.GetComponent<AstreaServerPlayerIdentity>();
            if (serverIdentity == null)
                serverIdentity = player.gameObject.AddComponent<AstreaServerPlayerIdentity>();
            serverIdentity.Initialize(identity.accountId, identity.characterId);

            networkManager.ServerManager.Spawn(player, connection);
        }

        private void OnRemoteConnectionState(NetworkConnection connection, RemoteConnectionStateArgs args)
        {
            if (args.ConnectionState == RemoteConnectionState.Stopped && connection != null)
                spawnedConnections.Remove(connection.ClientId);
        }
    }
}
