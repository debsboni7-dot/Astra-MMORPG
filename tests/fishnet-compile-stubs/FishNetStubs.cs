using System;
using System.Collections;
using FishNet.Connection;
using FishNet.Managing;
using FishNet.Object;
using FishNet.Transporting;
using UnityEngine;

namespace UnityEngine
{
    [AttributeUsage(AttributeTargets.Field)] public sealed class SerializeField : Attribute { }
    public class Object
    {
        public static T[] FindObjectsOfType<T>() where T : Object => Array.Empty<T>();
    }
    public class GameObject : Object
    {
        public T AddComponent<T>() where T : class, new() => new T();
        public T GetComponent<T>() where T : class => null;
    }
    public class Component : Object
    {
        public GameObject gameObject => new GameObject();
        public T GetComponent<T>() where T : class => null;
        public Transform transform => new Transform();
    }
    public class MonoBehaviour : Component
    {
        protected Coroutine StartCoroutine(IEnumerator routine) => new Coroutine();
        protected void StopCoroutine(Coroutine routine) { }
        protected static T Instantiate<T>(T original, Vector3 position, Quaternion rotation) where T : Object => original;
    }
    public sealed class Coroutine { }
    public class Transform : Component
    {
        public Vector3 position;
        public Quaternion rotation;
    }
    public struct Vector3
    {
        public static Vector3 zero => new Vector3();
        public static Vector3 right => new Vector3();
        public static Vector3 operator +(Vector3 left, Vector3 right) => new Vector3();
        public static Vector3 operator *(Vector3 value, float scalar) => new Vector3();
        public static float Distance(Vector3 left, Vector3 right) => 0f;
    }
    public struct Vector2
    {
        public float x;
        public float y;
        public float sqrMagnitude => 0f;
        public static Vector2 right => new Vector2();
        public static Vector2 ClampMagnitude(Vector2 value, float maxLength) => value;
    }
    public struct Quaternion
    {
        public static Quaternion identity => new Quaternion();
    }
    public sealed class WaitForSecondsRealtime
    {
        public WaitForSecondsRealtime(float seconds) { }
    }
    public static class Debug
    {
        public static void Log(object message) { }
        public static void LogWarning(object message) { }
        public static void LogError(object message) { }
    }
    public static class Mathf
    {
        public static float Min(float a, float b) => a < b ? a : b;
    }
    public static class Time
    {
        public static float deltaTime => 0.016f;
        public static float realtimeSinceStartup => 0f;
    }
    public static class Application
    {
        public static void Quit(int exitCode) { }
    }
    public static class JsonUtility
    {
        public static string ToJson(object value) => string.Empty;
        public static T FromJson<T>(string json) where T : class => null;
    }
}

namespace UnityEngine.Networking
{
    public class UploadHandler { }
    public sealed class UploadHandlerRaw : UploadHandler
    {
        public UploadHandlerRaw(byte[] data) { }
    }
    public class DownloadHandler
    {
        public string text => string.Empty;
    }
    public sealed class DownloadHandlerBuffer : DownloadHandler { }
    public sealed class UnityWebRequestAsyncOperation { }
    public sealed class UnityWebRequest : IDisposable
    {
        public enum Result { InProgress, Success, ConnectionError, ProtocolError, DataProcessingError }
        public long responseCode { get; set; }
        public Result result { get; set; }
        public UploadHandler uploadHandler { get; set; }
        public DownloadHandler downloadHandler { get; set; }
        public UnityWebRequest(string url, string method) { }
        public void SetRequestHeader(string name, string value) { }
        public UnityWebRequestAsyncOperation SendWebRequest() => new UnityWebRequestAsyncOperation();
        public void Dispose() { }
    }
}

namespace FishNet.Broadcast
{
    public interface IBroadcast { }
}

namespace FishNet.Transporting
{
    public enum Channel { Reliable, Unreliable }
    public enum LocalConnectionState { Stopped, Starting, Started }
    public enum RemoteConnectionState { Stopped, Started }
    public struct ClientConnectionStateArgs { public LocalConnectionState ConnectionState; }
    public struct RemoteConnectionStateArgs { public RemoteConnectionState ConnectionState; }
}

namespace FishNet.Connection
{
    public sealed class NetworkConnection
    {
        public int ClientId { get; set; }
        public bool IsAuthenticated { get; set; }
        public void Disconnect(bool immediately) { }
    }
}

namespace FishNet.Object
{
    [AttributeUsage(AttributeTargets.Method)] public sealed class ServerRpcAttribute : Attribute { }
    public class NetworkBehaviour : MonoBehaviour
    {
        public bool IsOwner { get; set; }
    }
    public sealed class NetworkObject : MonoBehaviour { }
}

namespace FishNet.Managing.Server
{
    public sealed class ServerManager
    {
        public bool Started { get; set; }
        public event Action<NetworkConnection, RemoteConnectionStateArgs> OnRemoteConnectionState;
        public void RegisterBroadcast<T>(Action<NetworkConnection, T, Channel> handler, bool requireAuthentication) where T : struct, FishNet.Broadcast.IBroadcast { }
        public void UnregisterBroadcast<T>(Action<NetworkConnection, T, Channel> handler) where T : struct, FishNet.Broadcast.IBroadcast { }
        public void Broadcast<T>(NetworkConnection connection, T message, bool requireAuthenticated, Channel channel) where T : struct, FishNet.Broadcast.IBroadcast { }
        public void Spawn(NetworkObject networkObject, NetworkConnection ownerConnection) { }
    }
}

namespace FishNet.Managing.Client
{
    public sealed class ClientManager
    {
        public bool Started { get; set; }
        public event Action OnAuthenticated;
        public event Action<ClientConnectionStateArgs> OnClientConnectionState;
        public bool StartConnection(string address, ushort port) => true;
        public void RegisterBroadcast<T>(Action<T, Channel> handler) where T : struct, FishNet.Broadcast.IBroadcast { }
        public void UnregisterBroadcast<T>(Action<T, Channel> handler) where T : struct, FishNet.Broadcast.IBroadcast { }
        public void Broadcast<T>(T message, Channel channel) where T : struct, FishNet.Broadcast.IBroadcast { }
    }
}

namespace FishNet.Managing
{
    public sealed class NetworkManager : MonoBehaviour
    {
        public FishNet.Managing.Server.ServerManager ServerManager { get; } = new FishNet.Managing.Server.ServerManager();
        public FishNet.Managing.Client.ClientManager ClientManager { get; } = new FishNet.Managing.Client.ClientManager();
    }
}

namespace FishNet.Authenticating
{
    public abstract class Authenticator : MonoBehaviour
    {
        protected NetworkManager NetworkManager { get; private set; }
        public abstract event Action<NetworkConnection, bool> OnAuthenticationResult;
        public virtual void InitializeOnce(NetworkManager networkManager) { NetworkManager = networkManager; }
        public virtual void OnRemoteConnection(NetworkConnection connection) { }
    }
}
