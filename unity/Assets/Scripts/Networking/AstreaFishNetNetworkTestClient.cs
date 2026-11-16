using System;
using System.Collections;
using FishNet.Managing;
using UnityEngine;

namespace Astrea.Networking
{
    /// <summary>
    /// Optional CI-only client harness. It is inert unless ASTREA_TEST_JOIN_TICKET
    /// and ASTREA_TEST_CLIENT_ID are provided by the process environment.
    /// </summary>
    public sealed class AstreaFishNetNetworkTestClient : MonoBehaviour
    {
        [SerializeField] private NetworkManager networkManager;
        [SerializeField] private AstreaFishNetAuthenticator authenticator;

        private string testClientId;
        private bool authenticated;
        private bool finished;

        private void Awake()
        {
            if (networkManager == null)
                networkManager = GetComponent<NetworkManager>();
            if (authenticator == null)
                authenticator = GetComponent<AstreaFishNetAuthenticator>();
        }

        private void Start()
        {
            string ticket = Environment.GetEnvironmentVariable("ASTREA_TEST_JOIN_TICKET");
            testClientId = Environment.GetEnvironmentVariable("ASTREA_TEST_CLIENT_ID");

            if (string.IsNullOrWhiteSpace(ticket) || string.IsNullOrWhiteSpace(testClientId))
                return;

            if (networkManager == null || authenticator == null)
            {
                Finish(2, "NETWORK_TEST_CONFIGURATION_MISSING");
                return;
            }

            networkManager.ClientManager.OnAuthenticated += OnAuthenticated;
            authenticator.SetClientTicket(ticket);

            string address = Environment.GetEnvironmentVariable("ASTREA_TEST_SERVER_ADDRESS");
            if (string.IsNullOrWhiteSpace(address))
                address = "127.0.0.1";

            ushort port = 7770;
            string portText = Environment.GetEnvironmentVariable("ASTREA_TEST_SERVER_PORT");
            if (!string.IsNullOrWhiteSpace(portText) && !ushort.TryParse(portText, out port))
            {
                Finish(2, "INVALID_TEST_SERVER_PORT");
                return;
            }

            if (!networkManager.ClientManager.StartConnection(address, port))
            {
                Finish(2, "FISHNET_CLIENT_START_FAILED");
                return;
            }

            StartCoroutine(WaitForTwoClientReplication());
        }

        private void OnAuthenticated()
        {
            authenticated = true;
        }

        private IEnumerator WaitForTwoClientReplication()
        {
            float authDeadline = Time.realtimeSinceStartup + 15f;
            while (!authenticated && Time.realtimeSinceStartup < authDeadline)
                yield return new WaitForSecondsRealtime(0.1f);

            if (!authenticated)
            {
                Finish(1, "FISHNET_AUTHENTICATION_TIMEOUT");
                yield break;
            }

            float playerDeadline = Time.realtimeSinceStartup + 15f;
            AstreaFishNetNetworkTestPlayer local = null;
            AstreaFishNetNetworkTestPlayer remote = null;

            while (Time.realtimeSinceStartup < playerDeadline)
            {
                AstreaFishNetNetworkTestPlayer[] players =
                    FindObjectsOfType<AstreaFishNetNetworkTestPlayer>();

                local = null;
                remote = null;
                foreach (AstreaFishNetNetworkTestPlayer player in players)
                {
                    if (player.IsOwner)
                        local = player;
                    else
                        remote = player;
                }

                if (local != null && remote != null)
                    break;

                yield return new WaitForSecondsRealtime(0.1f);
            }

            if (local == null || remote == null)
            {
                Finish(1, "TWO_CLIENT_PLAYER_SPAWN_TIMEOUT");
                yield break;
            }

            if (testClientId == "1")
            {
                // Give the second client time to capture the remote player baseline.
                yield return new WaitForSecondsRealtime(2f);
                float moveDeadline = Time.realtimeSinceStartup + 1.5f;
                while (Time.realtimeSinceStartup < moveDeadline)
                {
                    local.RequestTestMove(Vector2.right);
                    yield return new WaitForSecondsRealtime(0.05f);
                }

                yield return new WaitForSecondsRealtime(1f);
                Finish(0, "CLIENT_1_SENT_AUTHORITATIVE_MOVEMENT");
                yield break;
            }

            if (testClientId == "2")
            {
                Vector3 initialRemotePosition = remote.transform.position;
                float movementDeadline = Time.realtimeSinceStartup + 8f;
                while (Time.realtimeSinceStartup < movementDeadline)
                {
                    if (Vector3.Distance(initialRemotePosition, remote.transform.position) >= 0.25f)
                    {
                        Finish(0, "CLIENT_2_OBSERVED_REMOTE_SERVER_MOVEMENT");
                        yield break;
                    }
                    yield return new WaitForSecondsRealtime(0.1f);
                }

                Finish(1, "REMOTE_MOVEMENT_NOT_REPLICATED");
                yield break;
            }

            Finish(2, "UNKNOWN_TEST_CLIENT_ID");
        }

        private void Finish(int exitCode, string result)
        {
            if (finished)
                return;
            finished = true;
            Debug.Log("ASTREA_FISHNET_TEST_RESULT=" + result);
            Application.Quit(exitCode);
        }

        private void OnDestroy()
        {
            if (networkManager != null && networkManager.ClientManager != null)
                networkManager.ClientManager.OnAuthenticated -= OnAuthenticated;
        }
    }
}
