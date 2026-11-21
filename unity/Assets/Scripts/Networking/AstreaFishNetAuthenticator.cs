using System;
using System.Collections;
using System.Collections.Generic;
using System.Net;
using System.Text;
using FishNet.Authenticating;
using FishNet.Broadcast;
using FishNet.Connection;
using FishNet.Managing;
using FishNet.Transporting;
using UnityEngine;
using UnityEngine.Networking;

namespace Astrea.Networking
{
    public struct AstreaJoinTicketBroadcast : IBroadcast
    {
        public string Ticket;
    }

    [Serializable]
    internal sealed class AstreaJoinTicketConsumeRequest
    {
        public string ticket;
        public string serverId;
    }

    [Serializable]
    public sealed class AstreaJoinTicketConsumeIdentity
    {
        public string accountId;
        public string characterId;
        public string serverId;
    }

    [Serializable]
    internal sealed class AstreaJoinTicketConsumeResponse
    {
        public AstreaJoinTicketConsumeIdentity identity;
    }

    /// <summary>
    /// FishNet authentication bridge. The client presents a short-lived join ticket;
    /// the dedicated server consumes it through the private Node.js API endpoint.
    /// Never place the long-lived account bearer token in FishNet messages.
    /// </summary>
    // API contract pinned and checked against FishNet tag 4.7.4 in GitHub Actions.
    public sealed class AstreaFishNetAuthenticator : Authenticator
    {
        public override event Action<NetworkConnection, bool> OnAuthenticationResult;

        public event Action<NetworkConnection, AstreaJoinTicketConsumeIdentity> OnClientIdentityAuthenticated;

        private readonly Dictionary<int, NetworkConnection> pendingConnections = new Dictionary<int, NetworkConnection>();
        private readonly Dictionary<int, AstreaJoinTicketConsumeIdentity> authenticatedIdentities =
            new Dictionary<int, AstreaJoinTicketConsumeIdentity>();
        private readonly Dictionary<int, Coroutine> authenticationTimeouts = new Dictionary<int, Coroutine>();

        private string clientTicket;
        private string apiBaseUrl;
        private string serverSecret;
        private string serverId;

        public override void InitializeOnce(NetworkManager networkManager)
        {
            base.InitializeOnce(networkManager);

            apiBaseUrl = Environment.GetEnvironmentVariable("ASTREA_API_BASE_URL") ?? string.Empty;
            serverSecret = Environment.GetEnvironmentVariable("REALTIME_SERVER_SECRET") ?? string.Empty;
            serverId = Environment.GetEnvironmentVariable("REALTIME_SERVER_ID") ?? "astrea-prototype-zone-01";

            NetworkManager.ServerManager.RegisterBroadcast<AstreaJoinTicketBroadcast>(OnJoinTicketBroadcast, false);
            NetworkManager.ServerManager.OnRemoteConnectionState += OnRemoteConnectionState;
            NetworkManager.ClientManager.OnClientConnectionState += OnClientConnectionState;
        }

        public override void OnRemoteConnection(NetworkConnection connection)
        {
            if (authenticationTimeouts.TryGetValue(connection.ClientId, out Coroutine existing))
                StopCoroutine(existing);
            authenticationTimeouts[connection.ClientId] = StartCoroutine(RejectIfAuthenticationTimesOut(connection));
        }

        private IEnumerator RejectIfAuthenticationTimesOut(NetworkConnection connection)
        {
            yield return new WaitForSecondsRealtime(10f);
            if (!connection.IsAuthenticated)
                CompleteAuthentication(connection, false, "AUTH_TIMEOUT", null);
        }

        /// <summary>Set this after the authenticated HTTP API returns a one-use join ticket.</summary>
        public void SetClientTicket(string ticket)
        {
            clientTicket = ticket;
            if (NetworkManager != null && NetworkManager.ClientManager.Started)
                SendClientTicket();
        }

        public bool TryGetAuthenticatedIdentity(int clientId, out AstreaJoinTicketConsumeIdentity identity)
        {
            return authenticatedIdentities.TryGetValue(clientId, out identity);
        }

        private void OnClientConnectionState(ClientConnectionStateArgs args)
        {
            if (args.ConnectionState == LocalConnectionState.Started)
                SendClientTicket();
            else if (args.ConnectionState == LocalConnectionState.Stopped)
                clientTicket = null;
        }

        private void SendClientTicket()
        {
            if (string.IsNullOrWhiteSpace(clientTicket) || NetworkManager == null
                || !NetworkManager.ClientManager.Started)
                return;

            NetworkManager.ClientManager.Broadcast(new AstreaJoinTicketBroadcast
            {
                Ticket = clientTicket
            }, Channel.Reliable);

            // A ticket is single-use. Do not retain it after presenting it to the server.
            clientTicket = null;
        }

        private void OnJoinTicketBroadcast(
            NetworkConnection connection,
            AstreaJoinTicketBroadcast message,
            Channel channel)
        {
            if (connection.IsAuthenticated || pendingConnections.ContainsKey(connection.ClientId))
            {
                connection.Disconnect(true);
                return;
            }

            if (string.IsNullOrWhiteSpace(message.Ticket) || message.Ticket.Length != 43)
            {
                CompleteAuthentication(connection, false, "INVALID_TICKET", null);
                return;
            }

            pendingConnections[connection.ClientId] = connection;
            StartCoroutine(ConsumeTicketAndAuthenticate(connection, message.Ticket));
        }

        private IEnumerator ConsumeTicketAndAuthenticate(NetworkConnection connection, string ticket)
        {
            if (string.IsNullOrWhiteSpace(apiBaseUrl) || string.IsNullOrWhiteSpace(serverSecret)
                || serverSecret.Length < 32 || string.IsNullOrWhiteSpace(serverId))
            {
                CompleteAuthentication(connection, false, "SERVER_AUTH_CONFIG_MISSING", null);
                yield break;
            }

            if (!IsAllowedApiUrl(apiBaseUrl))
            {
                CompleteAuthentication(connection, false, "API_REQUIRES_HTTPS", null);
                yield break;
            }

            var payload = JsonUtility.ToJson(new AstreaJoinTicketConsumeRequest
            {
                ticket = ticket,
                serverId = serverId
            });

            using (var request = new UnityWebRequest(
                apiBaseUrl.TrimEnd('/') + "/v1/internal/realtime/fishnet/consume", "POST"))
            {
                request.timeout = 5;
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(payload));
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("X-Astrea-Server-Key", serverSecret);

                yield return request.SendWebRequest();

                if (!pendingConnections.TryGetValue(connection.ClientId, out NetworkConnection pending)
                    || !ReferenceEquals(pending, connection))
                    yield break;

                if (request.result != UnityWebRequest.Result.Success || request.responseCode != 200)
                {
                    CompleteAuthentication(connection, false, "INVALID_OR_EXPIRED_TICKET", null);
                    yield break;
                }

                AstreaJoinTicketConsumeResponse response =
                    JsonUtility.FromJson<AstreaJoinTicketConsumeResponse>(request.downloadHandler.text);
                AstreaJoinTicketConsumeIdentity identity = response != null ? response.identity : null;
                bool valid = identity != null
                    && !string.IsNullOrEmpty(identity.accountId)
                    && !string.IsNullOrEmpty(identity.characterId)
                    && identity.serverId == serverId;

                CompleteAuthentication(connection, valid,
                    valid ? null : "INVALID_TICKET_IDENTITY", valid ? identity : null);
            }
        }

        internal static bool IsAllowedApiUrl(string value)
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out Uri uri)
                || !string.IsNullOrEmpty(uri.UserInfo)
                || !string.IsNullOrEmpty(uri.Query)
                || !string.IsNullOrEmpty(uri.Fragment)
                || (uri.AbsolutePath != "/" && !string.IsNullOrEmpty(uri.AbsolutePath)))
                return false;

            if (uri.Scheme == Uri.UriSchemeHttps)
                return true;
            if (uri.Scheme != Uri.UriSchemeHttp)
                return false;
            if (string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase))
                return true;
            return IPAddress.TryParse(uri.Host, out IPAddress address) && IPAddress.IsLoopback(address);
        }

        private void CompleteAuthentication(
            NetworkConnection connection,
            bool accepted,
            string errorCode,
            AstreaJoinTicketConsumeIdentity identity)
        {
            if (pendingConnections.TryGetValue(connection.ClientId, out NetworkConnection pending)
                && ReferenceEquals(pending, connection))
                pendingConnections.Remove(connection.ClientId);
            if (!accepted && !string.IsNullOrEmpty(errorCode))
                Debug.LogWarning("ASTREA realtime authentication rejected: " + errorCode);
            if (authenticationTimeouts.TryGetValue(connection.ClientId, out Coroutine timeout))
            {
                StopCoroutine(timeout);
                authenticationTimeouts.Remove(connection.ClientId);
            }

            if (accepted && identity != null)
                authenticatedIdentities[connection.ClientId] = identity;

            // FishNet sends its own authentication result to the client from this event.
            OnAuthenticationResult?.Invoke(connection, accepted);
            if (accepted && identity != null)
                OnClientIdentityAuthenticated?.Invoke(connection, identity);
        }

        private void OnRemoteConnectionState(NetworkConnection connection, RemoteConnectionStateArgs args)
        {
            if (args.ConnectionState != RemoteConnectionState.Stopped)
                return;

            if (pendingConnections.TryGetValue(connection.ClientId, out NetworkConnection pending)
                && ReferenceEquals(pending, connection))
                pendingConnections.Remove(connection.ClientId);
            authenticatedIdentities.Remove(connection.ClientId);
            if (authenticationTimeouts.TryGetValue(connection.ClientId, out Coroutine timeout))
            {
                StopCoroutine(timeout);
                authenticationTimeouts.Remove(connection.ClientId);
            }
        }

        private void OnDestroy()
        {
            if (NetworkManager == null)
                return;

            foreach (Coroutine timeout in authenticationTimeouts.Values)
                if (timeout != null) StopCoroutine(timeout);
            authenticationTimeouts.Clear();
            NetworkManager.ServerManager.UnregisterBroadcast<AstreaJoinTicketBroadcast>(OnJoinTicketBroadcast);
            NetworkManager.ServerManager.OnRemoteConnectionState -= OnRemoteConnectionState;
            NetworkManager.ClientManager.OnClientConnectionState -= OnClientConnectionState;
        }
    }
}
