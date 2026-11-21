using System;
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

        Console.WriteLine("ASTREA API URL security contract passed.");
    }

    private static void Assert(bool condition, string message)
    {
        if (!condition)
            throw new InvalidOperationException(message);
    }
}
