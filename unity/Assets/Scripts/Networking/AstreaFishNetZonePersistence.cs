using System;
using System.Collections;
using System.Text;
using FishNet.Managing;
using UnityEngine;
using UnityEngine.Networking;

namespace Astrea.Networking
{
    [Serializable]
    internal sealed class AstreaZoneLeaseRequest
    {
        public string ownerId;
        public string fencingEpoch;
        public int leaseMs;
    }

    [Serializable]
    internal sealed class AstreaZoneLease
    {
        public string zoneId;
        public string ownerId;
        public string fencingEpoch;
        public string leaseExpiresAt;
    }

    [Serializable]
    internal sealed class AstreaZoneLeaseResponse
    {
        public AstreaZoneLease lease;
    }

    [Serializable]
    internal sealed class AstreaZoneRecoveryRequest
    {
        public string ownerId;
        public string fencingEpoch;
    }

    [Serializable]
    internal sealed class AstreaZoneRecoveryResponse
    {
        public string lastEventSequence;
    }

    /// <summary>
    /// Dedicated-server bootstrap for the durable zone lease. FishNet does not
    /// start listening until this process owns the zone and has loaded its
    /// snapshot/event tail from the Node API.
    /// </summary>
    [DefaultExecutionOrder(-9000)]
    public sealed class AstreaFishNetZonePersistence : MonoBehaviour
    {
        [SerializeField] private NetworkManager networkManager;
        [SerializeField] private string zoneId = "astrea-prototype-zone-01";
        [SerializeField] private int leaseDurationMs = 30000;
        [SerializeField] private int renewIntervalSeconds = 10;

        private string apiBaseUrl;
        private string serverSecret;
        private string ownerId;
        private string fencingEpoch;
        private bool serverRole;
        private bool leaseActive;

        public bool LeaseActive => leaseActive;
        public string FencingEpoch => fencingEpoch;
        public string RecoveryJson { get; private set; }
        public string LastRecoveredEventSequence { get; private set; }

        private void Awake()
        {
            if (networkManager == null)
                networkManager = GetComponent<NetworkManager>();
        }

        private void Start()
        {
            string role = Environment.GetEnvironmentVariable("ASTREA_NETWORK_ROLE");
            serverRole = string.Equals(role, "server", StringComparison.OrdinalIgnoreCase);
            if (!serverRole)
                return;

            apiBaseUrl = Environment.GetEnvironmentVariable("ASTREA_API_BASE_URL") ?? string.Empty;
            serverSecret = Environment.GetEnvironmentVariable("REALTIME_SERVER_SECRET") ?? string.Empty;
            string configuredZoneId = Environment.GetEnvironmentVariable("REALTIME_SERVER_ID");
            if (!string.IsNullOrWhiteSpace(configuredZoneId))
                zoneId = configuredZoneId;
            ownerId = Guid.NewGuid().ToString("N");

            if (networkManager == null || networkManager.ServerManager == null
                || string.IsNullOrWhiteSpace(zoneId)
                || leaseDurationMs < 5000 || leaseDurationMs > 120000
                || renewIntervalSeconds < 1 || renewIntervalSeconds >= leaseDurationMs / 1000)
            {
                FailClosed("ZONE_PERSISTENCE_CONFIGURATION_INVALID");
                return;
            }

            if (string.IsNullOrWhiteSpace(apiBaseUrl) || serverSecret.Length < 32
                || !AstreaFishNetAuthenticator.IsAllowedApiUrl(apiBaseUrl))
            {
                FailClosed("ZONE_PERSISTENCE_API_CONFIG_INVALID");
                return;
            }

            // FishNet's automatic headless startup is disabled in the generated
            // test scene. The server starts only after lease acquisition + recovery.
            networkManager.ServerManager.SetStartOnHeadless(false);
            StartCoroutine(BootstrapZone());
        }

        private IEnumerator BootstrapZone()
        {
            var leaseRequest = new AstreaZoneLeaseRequest
            {
                ownerId = ownerId,
                leaseMs = leaseDurationMs
            };
            using (var request = CreateRequest("/v1/internal/zones/" + Uri.EscapeDataString(zoneId) + "/lease/acquire",
                JsonUtility.ToJson(leaseRequest)))
            {
                yield return request.SendWebRequest();
                if (request.result != UnityWebRequest.Result.Success || request.responseCode != 201)
                {
                    FailClosed(request.responseCode == 409 ? "ZONE_ALREADY_OWNED" : "ZONE_LEASE_ACQUIRE_FAILED");
                    yield break;
                }

                AstreaZoneLeaseResponse response = JsonUtility.FromJson<AstreaZoneLeaseResponse>(request.downloadHandler.text);
                fencingEpoch = response != null && response.lease != null ? response.lease.fencingEpoch : null;
                if (string.IsNullOrWhiteSpace(fencingEpoch))
                {
                    FailClosed("ZONE_LEASE_RESPONSE_INVALID");
                    yield break;
                }
            }

            var recoveryRequest = new AstreaZoneRecoveryRequest
            {
                ownerId = ownerId,
                fencingEpoch = fencingEpoch
            };
            using (var request = CreateRequest("/v1/internal/zones/" + Uri.EscapeDataString(zoneId) + "/recovery",
                JsonUtility.ToJson(recoveryRequest)))
            {
                yield return request.SendWebRequest();
                if (request.result != UnityWebRequest.Result.Success || request.responseCode != 200)
                {
                    FailClosed("ZONE_RECOVERY_FAILED");
                    yield break;
                }

                RecoveryJson = request.downloadHandler.text;
                AstreaZoneRecoveryResponse recovery =
                    JsonUtility.FromJson<AstreaZoneRecoveryResponse>(RecoveryJson);
                if (recovery == null || string.IsNullOrWhiteSpace(recovery.lastEventSequence))
                {
                    FailClosed("ZONE_RECOVERY_RESPONSE_INVALID");
                    yield break;
                }
                LastRecoveredEventSequence = recovery.lastEventSequence;
            }

            leaseActive = true;
            if (!networkManager.ServerManager.StartConnection())
            {
                leaseActive = false;
                FailClosed("FISHNET_SERVER_START_FAILED");
                yield break;
            }

            StartCoroutine(RenewLeaseLoop());
            Debug.Log("ASTREA zone lease acquired and recovery completed. Zone server started.");
        }

        private IEnumerator RenewLeaseLoop()
        {
            var wait = new WaitForSecondsRealtime(renewIntervalSeconds);
            while (leaseActive)
            {
                yield return wait;
                var payload = new AstreaZoneLeaseRequest
                {
                    ownerId = ownerId,
                    fencingEpoch = fencingEpoch,
                    leaseMs = leaseDurationMs
                };
                using (var request = CreateRequest("/v1/internal/zones/" + Uri.EscapeDataString(zoneId) + "/lease/renew",
                    JsonUtility.ToJson(payload)))
                {
                    yield return request.SendWebRequest();
                    if (request.result != UnityWebRequest.Result.Success || request.responseCode != 200)
                    {
                        leaseActive = false;
                        networkManager.ServerManager.StopConnection(true);
                        FailClosed("ZONE_LEASE_RENEWAL_FAILED");
                        yield break;
                    }

                    AstreaZoneLeaseResponse response =
                        JsonUtility.FromJson<AstreaZoneLeaseResponse>(request.downloadHandler.text);
                    if (response == null || response.lease == null
                        || response.lease.fencingEpoch != fencingEpoch)
                    {
                        leaseActive = false;
                        networkManager.ServerManager.StopConnection(true);
                        FailClosed("ZONE_FENCING_EPOCH_CHANGED");
                        yield break;
                    }
                }
            }
        }

        /// <summary>
        /// Persist an authoritative gameplay event. Payload must be a JSON object.
        /// Call only from server-side world systems after LeaseActive is true.
        /// </summary>
        public void AppendDurableEvent(string eventId, string eventType, string payloadJson,
            Action<bool, string> completed = null, int schemaVersion = 1)
        {
            if (!leaseActive || !IsJsonObject(payloadJson))
            {
                completed?.Invoke(false, "ZONE_LEASE_NOT_ACTIVE_OR_INVALID_PAYLOAD");
                return;
            }

            string fields = "\"eventId\":\"" + EscapeJson(eventId) + "\","
                + "\"eventType\":\"" + EscapeJson(eventType) + "\","
                + "\"schemaVersion\":" + schemaVersion;
            string body = BuildPayloadRequest(fields, payloadJson);
            StartCoroutine(SendDurableMutation("/events", body, completed));
        }

        /// <summary>Persist a full authoritative zone snapshot as a JSON object.</summary>
        public void SaveDurableSnapshot(string payloadJson, Action<bool, string> completed = null,
            int schemaVersion = 1)
        {
            if (!leaseActive || !IsJsonObject(payloadJson))
            {
                completed?.Invoke(false, "ZONE_LEASE_NOT_ACTIVE_OR_INVALID_PAYLOAD");
                return;
            }

            string fields = "\"schemaVersion\":" + schemaVersion;
            string body = BuildPayloadRequest(fields, payloadJson);
            StartCoroutine(SendDurableMutation("/snapshots", body, completed));
        }

        private string BuildPayloadRequest(string fields, string payloadJson)
        {
            return "{\"ownerId\":\"" + EscapeJson(ownerId)
                + "\",\"fencingEpoch\":\"" + EscapeJson(fencingEpoch)
                + "\"," + fields + ",\"payload\":" + payloadJson + "}";
        }

        private IEnumerator SendDurableMutation(string route, string body, Action<bool, string> completed)
        {
            using (var request = CreateRequest("/v1/internal/zones/" + Uri.EscapeDataString(zoneId) + route, body))
            {
                yield return request.SendWebRequest();
                bool accepted = request.result == UnityWebRequest.Result.Success
                    && (request.responseCode == 200 || request.responseCode == 201);
                string responseBody = request.downloadHandler != null ? request.downloadHandler.text : string.Empty;

                if (!accepted && request.responseCode == 409 && responseBody.Contains("ZONE_LEASE_LOST"))
                {
                    leaseActive = false;
                    if (networkManager != null && networkManager.ServerManager != null)
                        networkManager.ServerManager.StopConnection(true);
                    FailClosed("ZONE_LEASE_LOST_DURING_DURABLE_WRITE");
                }

                completed?.Invoke(accepted, responseBody);
            }
        }

        private static bool IsJsonObject(string value)
        {
            if (string.IsNullOrWhiteSpace(value)
                || Encoding.UTF8.GetByteCount(value) > 256 * 1024)
                return false;
            string trimmed = value.Trim();
            return trimmed.Length >= 2 && trimmed[0] == '{' && trimmed[trimmed.Length - 1] == '}';
        }

        private static string EscapeJson(string value)
        {
            if (value == null) return string.Empty;
            var escaped = new StringBuilder(value.Length + 8);
            foreach (char character in value)
            {
                switch (character)
                {
                    case '\\': escaped.Append("\\\\"); break;
                    case '"': escaped.Append("\\\""); break;
                    case '\n': escaped.Append("\\n"); break;
                    case '\r': escaped.Append("\\r"); break;
                    case '\t': escaped.Append("\\t"); break;
                    default:
                        if (character < 32)
                            escaped.Append("\\u").Append(((int)character).ToString("x4"));
                        else
                            escaped.Append(character);
                        break;
                }
            }
            return escaped.ToString();
        }

        private UnityWebRequest CreateRequest(string route, string json)
        {
            var request = new UnityWebRequest(apiBaseUrl.TrimEnd('/') + route, "POST");
            request.timeout = 5;
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("X-Astrea-Server-Key", serverSecret);
            return request;
        }

        private void FailClosed(string errorCode)
        {
            leaseActive = false;
            Debug.LogError("ASTREA zone persistence startup aborted: " + errorCode);
            if (networkManager != null)
                networkManager.enabled = false;
        }

        private void OnDestroy()
        {
            if (leaseActive && networkManager != null && networkManager.ServerManager != null
                && networkManager.ServerManager.Started)
                networkManager.ServerManager.StopConnection(true);
            leaseActive = false;
        }
    }
}
