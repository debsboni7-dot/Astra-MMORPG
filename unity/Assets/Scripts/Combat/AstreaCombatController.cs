using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Astrea.VFX;

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
        [SerializeField] private LayerMask obstructionLayers = ~0;
        [SerializeField, Min(0f)] private float fallbackImpactDelay = 0.22f;
        [SerializeField] private Animator animator;
        [SerializeField] private string impactVfxKey = "melee_impact";
        private AstreaVfxLibrary vfxLibrary;

        private readonly Collider[] hitBuffer = new Collider[16];
        private readonly RaycastHit[] sightBuffer = new RaycastHit[16];
        private readonly HashSet<int> damagedThisSwing = new HashSet<int>();
        private float nextAttackTime;
        private bool hitResolvedThisSwing;
        private Coroutine fallbackImpactRoutine;

        private void Awake()
        {
            if (animator == null) animator = GetComponentInChildren<Animator>();
            vfxLibrary = GetComponentInChildren<AstreaVfxLibrary>();
        }

        public bool CanAttack => Time.time >= nextAttackTime;

        public bool TryAttack()
        {
            if (!CanAttack) return false;
            nextAttackTime = Time.time + attackCooldown;
            damagedThisSwing.Clear();
            hitResolvedThisSwing = false;
            if (fallbackImpactRoutine != null) StopCoroutine(fallbackImpactRoutine);
            if (animator != null)
            {
                animator.SetTrigger("Attack");
                fallbackImpactRoutine = StartCoroutine(ResolveMeleeHitFallback());
            }
            else
            {
                ResolveMeleeHit();
            }
            return true;
        }

        // Animation events can call this at the weapon's impact frame instead of resolving immediately.
        public void AnimationEvent_ApplyMeleeHit() => ResolveMeleeHit();

        private IEnumerator ResolveMeleeHitFallback()
        {
            yield return new WaitForSeconds(fallbackImpactDelay);
            ResolveMeleeHit();
            fallbackImpactRoutine = null;
        }

        private void ResolveMeleeHit()
        {
            if (hitResolvedThisSwing) return;
            hitResolvedThisSwing = true;
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
                if (damagedThisSwing.Contains(targetId)) continue;
                Vector3 impactPoint = hit.ClosestPoint(origin);
                if (!HasLineOfSight(hit, origin, impactPoint)) continue;
                damagedThisSwing.Add(targetId);
                damageable.ReceiveDamage(baseDamage, transform);
                if (vfxLibrary != null) vfxLibrary.Play(impactVfxKey, impactPoint, Quaternion.LookRotation(direction));
            }
        }

        private bool HasLineOfSight(Collider target, Vector3 origin, Vector3 impactPoint)
        {
            Vector3 offset = impactPoint - origin;
            float distance = offset.magnitude;
            if (distance <= 0.01f) return true;

            int count = Physics.RaycastNonAlloc(origin, offset / distance, sightBuffer,
                distance + 0.05f, obstructionLayers, QueryTriggerInteraction.Ignore);
            float nearestDistance = float.MaxValue;
            Transform nearestRoot = null;
            for (int i = 0; i < count; i++)
            {
                Collider obstruction = sightBuffer[i].collider;
                if (obstruction == null || obstruction.transform.root == transform.root) continue;
                if (sightBuffer[i].distance < nearestDistance)
                {
                    nearestDistance = sightBuffer[i].distance;
                    nearestRoot = obstruction.transform.root;
                }
            }
            return nearestRoot == target.transform.root;
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
