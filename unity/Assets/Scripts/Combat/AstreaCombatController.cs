using System.Collections.Generic;
using UnityEngine;

namespace Astrea.Combat
{
    /// <summary>Lightweight server-ready melee input prototype. Damage authority must move server-side for multiplayer.</summary>
    public sealed class AstreaCombatController : MonoBehaviour
    {
        [SerializeField] private Transform attackOrigin;
        [SerializeField, Min(0.1f)] private float attackRange = 1.8f;
        [SerializeField, Min(0.1f)] private float attackRadius = 0.75f;
        [SerializeField, Min(0f)] private float baseDamage = 12f;
        [SerializeField, Min(0.05f)] private float attackCooldown = 0.65f;
        [SerializeField] private LayerMask targetLayers = ~0;
        [SerializeField] private Animator animator;

        private readonly Collider[] hitBuffer = new Collider[16];
        private readonly HashSet<int> damagedThisSwing = new HashSet<int>();
        private float nextAttackTime;

        public bool CanAttack => Time.time >= nextAttackTime;

        public bool TryAttack()
        {
            if (!CanAttack) return false;
            nextAttackTime = Time.time + attackCooldown;
            damagedThisSwing.Clear();
            if (animator != null) animator.SetTrigger("Attack");
            else ResolveMeleeHit();
            return true;
        }

        // Animation events can call this at the weapon's impact frame instead of resolving immediately.
        public void AnimationEvent_ApplyMeleeHit() => ResolveMeleeHit();

        private void ResolveMeleeHit()
        {
            Vector3 origin = attackOrigin != null
                ? attackOrigin.position
                : transform.position + Vector3.up * 1.0f + transform.forward * 0.65f;
            Vector3 direction = attackOrigin != null ? attackOrigin.forward : transform.forward;
            Vector3 center = origin + direction.normalized * attackRange * 0.5f;
            int count = Physics.OverlapSphereNonAlloc(center, attackRadius, hitBuffer, targetLayers,
                QueryTriggerInteraction.Ignore);

            for (int i = 0; i < count; i++)
            {
                Collider hit = hitBuffer[i];
                if (hit == null || hit.transform.root == transform.root) continue;
                var damageable = hit.GetComponentInParent<IAstreaDamageable>();
                if (damageable == null) continue;
                int targetId = hit.transform.root.GetInstanceID();
                if (!damagedThisSwing.Add(targetId)) continue;
                damageable.ReceiveDamage(baseDamage, transform);
            }
        }

        private void OnDrawGizmosSelected()
        {
            Vector3 origin = attackOrigin != null
                ? attackOrigin.position
                : transform.position + Vector3.up + transform.forward * 0.65f;
            Vector3 direction = attackOrigin != null ? attackOrigin.forward : transform.forward;
            Gizmos.color = new Color(0.9f, 0.25f, 0.12f, 0.8f);
            Gizmos.DrawWireSphere(origin + direction.normalized * attackRange * 0.5f, attackRadius);
        }
    }

    public interface IAstreaDamageable
    {
        void ReceiveDamage(float amount, Transform source);
    }
}
