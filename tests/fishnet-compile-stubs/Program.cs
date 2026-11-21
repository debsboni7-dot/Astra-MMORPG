using System;
using System.Reflection;
using FishNet.Transporting.UTP;
using FishNet.Managing;
using Astrea.Networking;

internal static class Program
{
    private static void Main()
    {
        var client = new AstreaApiClient();

        Assert(client.SetBaseUrl("https://api.astrea.example"), "HTTPS API root should be accepted");
        Assert(client.SetBaseUrl("http://127.0.0.1:3000"), "IPv4 loopback HTTP should be accepted for local development");
        Assert(client.SetBaseUrl("http://localhost:3000"), "localhost HTTP should be accepted for local development");
        Assert(client.SetBaseUrl("http://[::1]:3000"), "IPv6 loopback HTTP should be accepted for local development");

        Assert(AstreaApiClient.IsAllowedApiBaseUrl("https://api.astrea.example"), "remote HTTPS must be allowed");
        Assert(AstreaApiClient.IsAllowedApiBaseUrl("http://127.0.0.1:3000"), "loopback HTTP must be allowed");
        Assert(!AstreaApiClient.IsAllowedApiBaseUrl("http://api.astrea.example"), "remote HTTP must be rejected even if set in Inspector");
        Assert(!client.SetBaseUrl("http://api.astrea.example"), "remote HTTP must be rejected");
        Assert(!client.SetBaseUrl("ftp://api.astrea.example"), "non-HTTP schemes must be rejected");
        Assert(!client.SetBaseUrl("https://user:password@api.astrea.example"), "URL userinfo must be rejected");
        Assert(!client.SetBaseUrl("https://api.astrea.example/path"), "API base paths must be rejected");
        Assert(!client.SetBaseUrl("https://api.astrea.example/?token=secret"), "URL query strings must be rejected");
        Assert(!client.SetBaseUrl("https://api.astrea.example/#fragment"), "URL fragments must be rejected");

        Assert(AstreaFishNetAuthenticator.IsAllowedApiUrl("https://api.astrea.example"), "FishNet server must accept HTTPS API root");
        Assert(AstreaFishNetAuthenticator.IsAllowedApiUrl("http://127.0.0.1:3000"), "FishNet server must accept IPv4 loopback HTTP");
        Assert(AstreaFishNetAuthenticator.IsAllowedApiUrl("http://localhost:3000"), "FishNet server must accept localhost HTTP");
        Assert(!AstreaFishNetAuthenticator.IsAllowedApiUrl("http://api.astrea.example"), "FishNet server must reject remote HTTP");
        Assert(!AstreaFishNetAuthenticator.IsAllowedApiUrl("ftp://api.astrea.example"), "FishNet server must reject non-HTTP schemes");
        Assert(!AstreaFishNetAuthenticator.IsAllowedApiUrl("https://user:pass@api.astrea.example"), "FishNet server must reject URL credentials");
        Assert(!AstreaFishNetAuthenticator.IsAllowedApiUrl("https://api.astrea.example/path"), "FishNet server must reject base paths");
        Assert(!AstreaFishNetAuthenticator.IsAllowedApiUrl("https://api.astrea.example/?ticket=secret"), "FishNet server must reject query strings");
        Assert(!AstreaFishNetAuthenticator.IsAllowedApiUrl("https://api.astrea.example/#fragment"), "FishNet server must reject fragments");

        VerifyDtlsServerConfiguration();
        VerifyDtlsFailsClosedWhenServerSecretsAreMissing();
        VerifyDtlsClientConfiguration();
        VerifyDtlsClientDefaultConfiguration();
        VerifyZonePersistencePayloadEncoding();

        Console.WriteLine("ASTREA API URL security contract passed.");
    }


    private static void VerifyDtlsServerConfiguration()
    {
        Environment.SetEnvironmentVariable("ASTREA_NETWORK_ROLE", "server");
        Environment.SetEnvironmentVariable("ASTREA_DTLS_SERVER_CERT", "server-cert-pem");
        Environment.SetEnvironmentVariable("ASTREA_DTLS_SERVER_KEY", "server-key-pem");

        var transport = new UnityTransport();
        var security = new AstreaFishNetTransportSecurity();
        typeof(AstreaFishNetTransportSecurity).GetField("transportComponent", BindingFlags.Instance | BindingFlags.NonPublic)
            .SetValue(security, transport);
        typeof(AstreaFishNetTransportSecurity).GetMethod("Awake", BindingFlags.Instance | BindingFlags.NonPublic)
            .Invoke(security, null);

        Assert(transport.UseEncryption, "DTLS must be enabled on dedicated server");
        Assert(transport.ServerCertificate == "server-cert-pem", "server certificate must be supplied from environment");
        Assert(transport.ServerPrivateKey == "server-key-pem", "server private key must be supplied from environment");
    }


    private static void VerifyDtlsFailsClosedWhenServerSecretsAreMissing()
    {
        Environment.SetEnvironmentVariable("ASTREA_NETWORK_ROLE", "server");
        Environment.SetEnvironmentVariable("ASTREA_DTLS_SERVER_CERT", "server-cert-pem");
        Environment.SetEnvironmentVariable("ASTREA_DTLS_SERVER_KEY", null);

        var transport = new UnityTransport();
        var security = new AstreaFishNetTransportSecurity();
        var networkManager = new NetworkManager();
        typeof(AstreaFishNetTransportSecurity).GetField("transportComponent", BindingFlags.Instance | BindingFlags.NonPublic)
            .SetValue(security, transport);
        security.SetComponentForTests(networkManager);
        typeof(AstreaFishNetTransportSecurity).GetMethod("Awake", BindingFlags.Instance | BindingFlags.NonPublic)
            .Invoke(security, null);

        Assert(transport.UseEncryption, "DTLS must be enabled before validating server secrets");
        Assert(!networkManager.enabled, "NetworkManager must be disabled if server DTLS secrets are missing");
    }

    private static void VerifyDtlsClientConfiguration()
    {
        Environment.SetEnvironmentVariable("ASTREA_NETWORK_ROLE", "client");
        Environment.SetEnvironmentVariable("ASTREA_DTLS_SERVER_NAME", "game.astrea.example");
        Environment.SetEnvironmentVariable("ASTREA_DTLS_CA_CERT", "trusted-ca-pem");

        var transport = new UnityTransport();
        var security = new AstreaFishNetTransportSecurity();
        typeof(AstreaFishNetTransportSecurity).GetField("transportComponent", BindingFlags.Instance | BindingFlags.NonPublic)
            .SetValue(security, transport);
        typeof(AstreaFishNetTransportSecurity).GetMethod("Awake", BindingFlags.Instance | BindingFlags.NonPublic)
            .Invoke(security, null);

        Assert(transport.UseEncryption, "DTLS must be enabled on clients");
        Assert(transport.ServerCommonName == "game.astrea.example", "client must validate the server common name");
        Assert(transport.ClientCaCertificate == "trusted-ca-pem", "client must receive the configured trusted CA");
    }


    private static void VerifyDtlsClientDefaultConfiguration()
    {
        Environment.SetEnvironmentVariable("ASTREA_NETWORK_ROLE", null);
        Environment.SetEnvironmentVariable("ASTREA_DTLS_SERVER_NAME", null);
        Environment.SetEnvironmentVariable("ASTREA_DTLS_CA_CERT", null);

        var transport = new UnityTransport();
        var security = new AstreaFishNetTransportSecurity();
        typeof(AstreaFishNetTransportSecurity).GetField("transportComponent", BindingFlags.Instance | BindingFlags.NonPublic)
            .SetValue(security, transport);
        typeof(AstreaFishNetTransportSecurity).GetField("serverCommonName", BindingFlags.Instance | BindingFlags.NonPublic)
            .SetValue(security, "game.astrea.example");
        typeof(AstreaFishNetTransportSecurity).GetMethod("Awake", BindingFlags.Instance | BindingFlags.NonPublic)
            .Invoke(security, null);

        Assert(transport.UseEncryption, "Android client default must keep DTLS enabled");
        Assert(transport.ServerCommonName == "game.astrea.example", "Android client must use serialized DNS certificate name");
        Assert(transport.ClientCaCertificate == null, "Android client may use the operating system trust store");
    }


    private static void VerifyZonePersistencePayloadEncoding()
    {
        var component = new AstreaFishNetZonePersistence();
        var type = typeof(AstreaFishNetZonePersistence);
        type.GetField("ownerId", BindingFlags.Instance | BindingFlags.NonPublic).SetValue(component, "owner\"process");
        type.GetField("fencingEpoch", BindingFlags.Instance | BindingFlags.NonPublic).SetValue(component, "2");

        string escaped = (string)type.GetMethod("EscapeJson", BindingFlags.Static | BindingFlags.NonPublic)
            .Invoke(null, new object[] { "a\"b\\c\n" });
        Assert(escaped == "a\\\"b\\\\c\\n", "zone persistence must safely escape JSON string fields");

        string body = (string)type.GetMethod("BuildPayloadRequest", BindingFlags.Instance | BindingFlags.NonPublic)
            .Invoke(component, new object[] { "\"eventId\":\"test-id\"", "{\"count\":1}" });
        Assert(body.Contains("\"ownerId\":\"owner\\\"process\""), "zone owner ID must be escaped in JSON body");
        Assert(body.Contains("\"fencingEpoch\":\"2\""), "fencing epoch must be attached to durable writes");
        Assert(body.EndsWith("\"payload\":{\"count\":1}}"), "payload must remain a JSON object, not a quoted string");

        var isJsonObject = type.GetMethod("IsJsonObject", BindingFlags.Static | BindingFlags.NonPublic);
        Assert((bool)isJsonObject.Invoke(null, new object[] { "{\"count\":1}" }), "valid JSON object payload must be accepted");
        Assert(!(bool)isJsonObject.Invoke(null, new object[] { "[1,2,3]" }), "JSON arrays must be rejected as zone payload roots");
        Assert(!(bool)isJsonObject.Invoke(null, new object[] { "{\"data\":\"" + new string('x', 270 * 1024) + "\"}" }),
            "oversized zone payload must be rejected before network transmission");
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition)
            throw new InvalidOperationException(message);
    }
}
