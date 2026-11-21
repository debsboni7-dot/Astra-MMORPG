using System;
using System.Reflection;
using UnityEngine;
using FishNet.Managing;

namespace Astrea.Networking
{
    /// <summary>
    /// Configures FishyUnityTransport 2.x DTLS without hard-coding server private
    /// material in the client or committing it to the Unity project.
    /// ASTREA_NETWORK_ROLE=server is required for dedicated servers; clients default to client mode.
    /// </summary>
    [DefaultExecutionOrder(-10000)]
    public sealed class AstreaFishNetTransportSecurity : MonoBehaviour
    {
        [SerializeField] private Component transportComponent;
        [SerializeField] private string serverCommonName = "game.astrea.example";
        [SerializeField] private TextAsset trustedCaCertificate;

        private void Awake()
        {
            try
            {
                ConfigureTransport();
            }
            catch (Exception exception)
            {
                NetworkManager networkManager = GetComponent<NetworkManager>();
                if (networkManager != null)
                    networkManager.enabled = false;
                Debug.LogError("ASTREA secure transport initialization failed (" + exception.GetType().Name
                    + "). NetworkManager disabled; refusing an unencrypted connection.");
            }
        }

        private void ConfigureTransport()
        {
            if (transportComponent == null)
                throw new InvalidOperationException("ASTREA secure transport component reference is missing.");

            Type transportType = transportComponent.GetType();
            if (transportType.FullName != "FishNet.Transporting.UTP.UnityTransport")
                throw new InvalidOperationException("ASTREA expected FishyUnityTransport UnityTransport component.");

            PropertyInfo encryptionProperty = transportType.GetProperty("UseEncryption");
            MethodInfo setServerSecrets = transportType.GetMethod("SetServerSecrets");
            MethodInfo setClientSecrets = transportType.GetMethod("SetClientSecrets");
            if (encryptionProperty == null || setServerSecrets == null || setClientSecrets == null)
                throw new InvalidOperationException("FishyUnityTransport DTLS API is unavailable. Check UTP 2.x package resolution.");

            encryptionProperty.SetValue(transportComponent, true, null);

            string role = Environment.GetEnvironmentVariable("ASTREA_NETWORK_ROLE");
            if (string.Equals(role, "server", StringComparison.OrdinalIgnoreCase))
            {
                string certificate = Environment.GetEnvironmentVariable("ASTREA_DTLS_SERVER_CERT");
                string privateKey = Environment.GetEnvironmentVariable("ASTREA_DTLS_SERVER_KEY");
                if (string.IsNullOrWhiteSpace(certificate) || string.IsNullOrWhiteSpace(privateKey))
                    throw new InvalidOperationException("ASTREA DTLS server certificate/key environment variables are missing.");

                setServerSecrets.Invoke(transportComponent, new object[] { certificate, privateKey });
                return;
            }

            if (!string.IsNullOrWhiteSpace(role)
                && !string.Equals(role, "client", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("ASTREA_NETWORK_ROLE must be server or client when supplied.");

            string commonName = Environment.GetEnvironmentVariable("ASTREA_DTLS_SERVER_NAME");
            if (string.IsNullOrWhiteSpace(commonName))
                commonName = serverCommonName;
            string caCertificate = trustedCaCertificate != null
                ? trustedCaCertificate.text
                : Environment.GetEnvironmentVariable("ASTREA_DTLS_CA_CERT");

            if (string.IsNullOrWhiteSpace(commonName))
                throw new InvalidOperationException("ASTREA DTLS server certificate name is missing.");

            // A null CA certificate uses the operating system trust store.
            setClientSecrets.Invoke(transportComponent, new object[] { commonName, caCertificate });
        }
    }
}
