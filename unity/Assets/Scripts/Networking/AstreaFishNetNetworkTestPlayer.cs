using FishNet.Object;
using UnityEngine;

namespace Astrea.Networking
{
    /// <summary>
    /// Temporary network-only proxy for verifying server-authoritative replication.
    /// This is a test object, not an ASTREA production character asset.
    /// </summary>
    public sealed class AstreaFishNetNetworkTestPlayer : NetworkBehaviour
    {
        public void RequestTestMove(Vector2 direction)
        {
            if (!IsOwner)
                return;
            MoveServerRpc(direction);
        }

        [ServerRpc]
        private void MoveServerRpc(Vector2 direction)
        {
            if (float.IsNaN(direction.x) || float.IsInfinity(direction.x)
                || float.IsNaN(direction.y) || float.IsInfinity(direction.y))
                return;

            direction = Vector2.ClampMagnitude(direction, 1f);
            if (direction.sqrMagnitude < 0.0001f)
                return;

            float delta = Mathf.Min(Time.deltaTime, 0.1f);
            transform.position += new Vector3(direction.x, 0f, direction.y) * (2f * delta);
        }
    }
}
