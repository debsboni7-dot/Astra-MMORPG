using System;
using UnityEngine;

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

        private void Awake() => CurrentHealth = maxHealth;

        public void ReceiveDamage(float amount, Transform source)
        {
            if (IsDead || amount <= 0f) return;
            CurrentHealth = Mathf.Max(0f, CurrentHealth - amount);
            HealthChanged?.Invoke(CurrentHealth, maxHealth);
            if (!IsDead) return;
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
