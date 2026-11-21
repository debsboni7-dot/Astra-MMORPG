using System;
using System.Collections;
using System.Text;
using System.Net;
using UnityEngine;
using UnityEngine.Networking;

namespace Astrea.Networking
{
    /// <summary>
    /// Thin Unity client for the existing ASTREA Node.js API.
    /// The bearer token remains in memory and is never written to PlayerPrefs.
    /// </summary>
    public sealed class AstreaApiClient : MonoBehaviour
    {
        [SerializeField] private string baseUrl = "http://127.0.0.1:3000";
        public string SessionToken { get; private set; }

        [Serializable] private sealed class Credentials { public string email; public string password; }
        [Serializable] private sealed class CharacterCreate { public string displayName; public string race; }
        [Serializable] private sealed class FishNetTicketRequest { public string characterId; }
        [Serializable] public sealed class FishNetJoinTicketResponse { public string ticket; public int expiresIn; }
        [Serializable] public sealed class Account { public string id; public string email; }
        [Serializable] public sealed class LoginResponse { public string token; public Account account; public int expiresIn; }
        [Serializable] public sealed class CharacterRecord { public string id; public string displayName; public string race; }
        [Serializable] private sealed class CharacterList { public CharacterRecord[] characters; }
        [Serializable] private sealed class CharacterEnvelope { public CharacterRecord character; }
        [Serializable] private sealed class ErrorEnvelope { public string error; }

        public bool SetBaseUrl(string value)
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out Uri uri)
                || (uri.Scheme != Uri.UriSchemeHttps && !IsLoopbackHttp(uri))
                || !string.IsNullOrEmpty(uri.UserInfo)
                || !string.IsNullOrEmpty(uri.Query)
                || !string.IsNullOrEmpty(uri.Fragment)
                || (uri.AbsolutePath != "/" && !string.IsNullOrEmpty(uri.AbsolutePath)))
                return false;

            baseUrl = uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
            return true;
        }

        private static bool IsLoopbackHttp(Uri uri)
        {
            if (uri.Scheme != Uri.UriSchemeHttp)
                return false;
            if (string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase))
                return true;
            return IPAddress.TryParse(uri.Host, out IPAddress address) && IPAddress.IsLoopback(address);
        }

        public IEnumerator Register(string email, string password, Action<bool, string> completed)
        {
            var payload = JsonUtility.ToJson(new Credentials { email = email, password = password });
            yield return Send("POST", "/v1/auth/register", payload, false, (request, error) =>
            {
                completed?.Invoke(error == null && request.responseCode == 201,
                    error ?? request.downloadHandler.text);
            });
        }

        public IEnumerator Login(string email, string password, Action<bool, string> completed)
        {
            var payload = JsonUtility.ToJson(new Credentials { email = email, password = password });
            yield return Send("POST", "/v1/auth/login", payload, false, (request, error) =>
            {
                if (error != null || request.responseCode != 200)
                {
                    completed?.Invoke(false, error ?? request.downloadHandler.text);
                    return;
                }

                LoginResponse result = JsonUtility.FromJson<LoginResponse>(request.downloadHandler.text);
                SessionToken = result != null ? result.token : null;
                completed?.Invoke(!string.IsNullOrEmpty(SessionToken), request.downloadHandler.text);
            });
        }

        public IEnumerator ListCharacters(Action<bool, CharacterRecord[], string> completed)
        {
            yield return Send("GET", "/v1/characters", null, true, (request, error) =>
            {
                if (error != null || request.responseCode != 200)
                {
                    completed?.Invoke(false, Array.Empty<CharacterRecord>(), error ?? request.downloadHandler.text);
                    return;
                }
                CharacterList result = JsonUtility.FromJson<CharacterList>(request.downloadHandler.text);
                completed?.Invoke(true, result != null ? result.characters ?? Array.Empty<CharacterRecord>() : Array.Empty<CharacterRecord>(), null);
            });
        }

        public IEnumerator CreateCharacter(string displayName, string race, Action<bool, CharacterRecord, string> completed)
        {
            var payload = JsonUtility.ToJson(new CharacterCreate { displayName = displayName, race = race });
            yield return Send("POST", "/v1/characters", payload, true, (request, error) =>
            {
                if (error != null || request.responseCode != 201)
                {
                    completed?.Invoke(false, null, error ?? request.downloadHandler.text);
                    return;
                }
                CharacterEnvelope result = JsonUtility.FromJson<CharacterEnvelope>(request.downloadHandler.text);
                completed?.Invoke(result != null && result.character != null, result != null ? result.character : null, null);
            });
        }

        public IEnumerator RequestFishNetJoinTicket(string characterId, Action<bool, FishNetJoinTicketResponse, string> completed)
        {
            if (string.IsNullOrWhiteSpace(characterId))
            {
                completed?.Invoke(false, null, "INVALID_CHARACTER_ID");
                yield break;
            }

            var payload = JsonUtility.ToJson(new FishNetTicketRequest { characterId = characterId });
            yield return Send("POST", "/v1/realtime/fishnet/tickets", payload, true, (request, error) =>
            {
                if (error != null || request.responseCode != 201)
                {
                    completed?.Invoke(false, null, error ?? request.downloadHandler.text);
                    return;
                }

                FishNetJoinTicketResponse result = JsonUtility.FromJson<FishNetJoinTicketResponse>(request.downloadHandler.text);
                bool valid = result != null && !string.IsNullOrEmpty(result.ticket) && result.expiresIn > 0;
                completed?.Invoke(valid, valid ? result : null, valid ? null : "INVALID_TICKET_RESPONSE");
            });
        }

        public IEnumerator Logout(Action<bool> completed = null)
        {
            yield return Send("POST", "/v1/auth/logout", "{}", true, (request, error) =>
            {
                bool success = error == null && (request.responseCode == 204 || request.responseCode == 200);
                if (success) SessionToken = null;
                completed?.Invoke(success);
            });
        }

        private IEnumerator Send(string method, string path, string json, bool authenticated, Action<UnityWebRequest, string> completed)
        {
            using (var request = new UnityWebRequest(baseUrl + path, method))
            {
                if (json != null)
                {
                    request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
                    request.SetRequestHeader("Content-Type", "application/json");
                }
                request.downloadHandler = new DownloadHandlerBuffer();
                if (authenticated)
                {
                    if (string.IsNullOrEmpty(SessionToken))
                    {
                        completed?.Invoke(request, "UNAUTHENTICATED");
                        yield break;
                    }
                    request.SetRequestHeader("Authorization", "Bearer " + SessionToken);
                }

                yield return request.SendWebRequest();
                string error = request.result == UnityWebRequest.Result.Success ? null : request.error;
                completed?.Invoke(request, error);
            }
        }
    }
}
