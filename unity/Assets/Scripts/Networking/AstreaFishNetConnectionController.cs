using System;
using System.Collections;
using FishNet.Managing;
using UnityEngine;

namespace Astrea.Networking
{
    /// <summary>
    /// Production client flow: request an authenticated one-use ticket over HTTPS,
    /// present it to FishNet, and report success only after server authentication.
    /// </summary>
    public sealed class AstreaFishNetConnectionController : MonoBehaviour
    {
        [SerializeField] private AstreaApiClient apiClient;
        [SerializeField] private NetworkManager networkManager;
        [SerializeField] private AstreaFishNetAuthenticator authenticator;
        [SerializeField] private float authenticationTimeoutSeconds = 15f;

        private bool connecting;
        private bool authenticated;

        private void Awake()
        {
            if (apiClient == null)
                apiClient = GetComponent<AstreaApiClient>();
            if (networkManager == null)
                networkManager = GetComponent<NetworkManager>();
            if (authenticator == null)
                authenticator = GetComponent<AstreaFishNetAuthenticator>();
        }

        public IEnumerator Connect(
            string characterId,
            string serverAddress,
            ushort serverPort,
            Action<bool, string> completed)
        {
            if (connecting)
            {
                completed?.Invoke(false, "CONNECTION_ALREADY_IN_PROGRESS");
                yield break;
            }
            if (apiClient == null || networkManager == null || authenticator == null
                || string.IsNullOrWhiteSpace(apiClient.SessionToken))
            {
                completed?.Invoke(false, "NETWORK_CLIENT_CONFIGURATION_OR_SESSION_MISSING");
                yield break;
            }
            if (string.IsNullOrWhiteSpace(characterId) || string.IsNullOrWhiteSpace(serverAddress)
                || serverAddress.Length > 253 || serverAddress.IndexOfAny(new[] { '/', '\\', ' ', '\t', '\r', '\n' }) >= 0
                || serverPort == 0 || float.IsNaN(authenticationTimeoutSeconds)
                || authenticationTimeoutSeconds < 1f || authenticationTimeoutSeconds > 60f)
            {
                completed?.Invoke(false, "INVALID_NETWORK_TARGET");
                yield break;
            }

            connecting = true;
            bool ticketReady = false;
            bool ticketAccepted = false;
            string ticketError = null;
            AstreaApiClient.FishNetJoinTicketResponse ticket = null;
            yield return apiClient.RequestFishNetJoinTicket(characterId, (success, result, error) =>
            {
                ticketReady = true;
                ticketAccepted = success;
                ticket = result;
                ticketError = error;
            });

            if (!ticketReady || !ticketAccepted || ticket == null)
            {
                connecting = false;
                completed?.Invoke(false, ticketError ?? "JOIN_TICKET_REQUEST_FAILED");
                yield break;
            }

            authenticated = false;
            networkManager.ClientManager.OnAuthenticated += OnAuthenticated;
            authenticator.SetClientTicket(ticket.ticket);

            if (!networkManager.ClientManager.StartConnection(serverAddress, serverPort))
            {
                networkManager.ClientManager.OnAuthenticated -= OnAuthenticated;
                connecting = false;
                completed?.Invoke(false, "FISHNET_CLIENT_START_FAILED");
                yield break;
            }

            float deadline = Time.realtimeSinceStartup + authenticationTimeoutSeconds;
            while (!authenticated && Time.realtimeSinceStartup < deadline)
                yield return new WaitForSecondsRealtime(0.1f);

            networkManager.ClientManager.OnAuthenticated -= OnAuthenticated;
            connecting = false;

            if (authenticated)
            {
                completed?.Invoke(true, null);
                yield break;
            }

            networkManager.ClientManager.StopConnection();
            completed?.Invoke(false, "FISHNET_AUTHENTICATION_TIMEOUT");
        }

        public void Disconnect()
        {
            if (networkManager != null && networkManager.ClientManager != null
                && networkManager.ClientManager.Started)
                networkManager.ClientManager.StopConnection();
        }

        private void OnAuthenticated()
        {
            authenticated = true;
        }

        private void OnDestroy()
        {
            if (networkManager != null && networkManager.ClientManager != null)
                networkManager.ClientManager.OnAuthenticated -= OnAuthenticated;
        }
    }
}
