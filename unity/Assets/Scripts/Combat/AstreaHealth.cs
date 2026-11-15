using System;
using UnityEngine;
using Astrea.Animation;

namespace Astrea.Combat
{
    public sealed class AstreaHealth : MonoBehaviour, IAstreaDamageable
    {
        [SerializeField, Min(1f)] private float maxHealth = 100f;
        [SerializeField] private bool destroyOnDeath;
        public float CurrentHealth { get; private set; }
        public float MaxHealth => maxHealth;
        public bool IsDead => CurrentHealth <= 0f;

        public event Action<float, float> HealthChanged;
        public event Action Died;

        [SerializeField, Min(0f)] private float shieldCapacity;
        private float shieldRemaining;
        private float shieldExpiresAt;
        private AstreaAnimationDriver animationDriver;

        private void Awake()
        {
            CurrentHealth = maxHealth;
            shieldRemaining = 0f;
            animationDriver = GetComponentInChildren<AstreaAnimationDriver>();
        }

        private void Update()
        {
            if (shieldRemaining > 0f && Time.time >= shieldExpiresAt)
                shieldRemaining = 0f;
        }

        public void ApplyShield(float amount, float duration)
        {
            if (IsDead || amount <= 0f || duration <= 0f) return;
            shieldRemaining = Mathf.Max(shieldRemaining, Mathf.Min(amount, shieldCapacity > 0f ? shieldCapacity : amount));
            shieldExpiresAt = Time.time + duration;
        }

        public void ReceiveDamage(float amount, Transform source)
        {
            if (IsDead || amount <= 0f) return;
            if (shieldRemaining > 0f)
            {
                float absorbed = Mathf.Min(shieldRemaining, amount);
                shieldRemaining -= absorbed;
                amount -= absorbed;
            }
            if (amount <= 0f) return;
            CurrentHealth = Mathf.Max(0f, CurrentHealth - amount);
            HealthChanged?.Invoke(CurrentHealth, maxHealth);
            if (!IsDead)
            {
                if (animationDriver != null) animationDriver.PlayHit();
                return;
            }
            if (animationDriver != null) animationDriver.PlayDeath();
            Died?.Invoke();
            if (destroyOnDeath) Destroy(gameObject);
        }

        public void Restore(float amount)
        {
            if (IsDead || amount <= 0f) return;
            CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + amount);
            HealthChanged?.Invoke(CurrentHealth, maxHealth);
        }
    }
}
