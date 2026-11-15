using System;
using System.Collections.Generic;
using UnityEngine;
using Astrea.VFX;

namespace Astrea.Combat
{
    /// <summary>
    /// Local spell-combat prototype. Server authority, race permissions and status-effect
    /// replication must be added before multiplayer release.
    /// </summary>
    [RequireComponent(typeof(AstreaHealth))]
    public sealed class AstreaSpellCombatController : MonoBehaviour
    {
        [Serializable]
        private struct SpellDefinition
        {
            public string element;
            public float manaCost;
            public float cooldown;
            public float damage;
            public bool area;
            public bool selfHeal;
            public bool shield;
        }

        [SerializeField] private SpellDefinition[] spells =
        {
            new SpellDefinition { element = "fire", manaCost = 8f, cooldown = 0.9f, damage = 18f },
            new SpellDefinition { element = "water", manaCost = 8f, cooldown = 0.8f, damage = 15f },
            new SpellDefinition { element = "wind", manaCost = 9f, cooldown = 1.4f, damage = 13f, area = true },
            new SpellDefinition { element = "earth", manaCost = 12f, cooldown = 5f, shield = true },
            new SpellDefinition { element = "ice", manaCost = 9f, cooldown = 1.2f, damage = 16f },
            new SpellDefinition { element = "lightning", manaCost = 10f, cooldown = 1.3f, damage = 17f },
            new SpellDefinition { element = "nature", manaCost = 10f, cooldown = 1.5f, selfHeal = true },
            new SpellDefinition { element = "light", manaCost = 10f, cooldown = 1.8f, selfHeal = true },
            new SpellDefinition { element = "dark", manaCost = 12f, cooldown = 1.5f, damage = 20f }
        };

        [SerializeField, Min(0f)] private float maxMana = 100f;
        [SerializeField, Min(0f)] private float manaRegeneration = 4f;
        [SerializeField, Min(0.1f)] private float targetRange = 12f;
        [SerializeField] private float areaRadius = 4.5f;
        [SerializeField] private LayerMask targetLayers = ~0;
        [SerializeField] private Transform castOrigin;

        private readonly Collider[] targets = new Collider[32];
        private readonly HashSet<int> hitTargets = new HashSet<int>();
        private readonly Dictionary<string, float> cooldownUntil = new Dictionary<string, float>();
        private AstreaHealth health;
        private AstreaSpellVfxController vfx;
        public float CurrentMana { get; private set; }
        public float MaxMana => maxMana;
        public event Action<float, float> ManaChanged;

        private void Awake()
        {
            health = GetComponent<AstreaHealth>();
            vfx = GetComponent<AstreaSpellVfxController>();
            if (castOrigin == null) castOrigin = transform;
            CurrentMana = maxMana;
        }

        private void Update()
        {
            if (CurrentMana >= maxMana) return;
            CurrentMana = Mathf.Min(maxMana, CurrentMana + manaRegeneration * Time.deltaTime);
            ManaChanged?.Invoke(CurrentMana, maxMana);
        }

        public bool CanCast(string element)
        {
            if (string.IsNullOrWhiteSpace(element)) return false;
            var spell = FindSpell(element);
            return spell.HasValue && !health.IsDead &&
                CurrentMana >= spell.Value.manaCost &&
                (!cooldownUntil.TryGetValue(spell.Value.element, out float until) || Time.time >= until) &&
                (spell.Value.selfHeal ? health.CurrentHealth < health.MaxHealth : true);
        }

        public bool TryCast(string element)
        {
            if (!CanCast(element)) return false;
            SpellDefinition spell = FindSpell(element).Value;

            if (spell.selfHeal)
            {
                float before = health.CurrentHealth;
                health.Restore(spell.element == "light" ? 22f : 18f);
                bool restored = health.CurrentHealth > before;
                if (!restored) return false;
                CommitCast(spell);
                if (vfx != null) vfx.PlayAtCastPoint(spell.element);
                return true;
            }

            if (spell.shield)
            {
                health.ApplyShield(30f, spell.cooldown);
                CommitCast(spell);
                if (vfx != null) vfx.PlayAtCastPoint(spell.element);
                return true;
            }

            hitTargets.Clear();
            Vector3 origin = castOrigin.position;
            int count = Physics.OverlapSphereNonAlloc(origin, spell.area ? areaRadius : targetRange,
                targets, targetLayers, QueryTriggerInteraction.Ignore);
            bool hitAny = false;
            float nearestDistance = float.MaxValue;
            Collider nearest = null;

            for (int i = 0; i < count; i++)
            {
                Collider candidate = targets[i];
                if (candidate == null || candidate.transform.root == transform.root) continue;
                var damageable = candidate.GetComponentInParent<IAstreaDamageable>();
                if (damageable == null) continue;
                float distance = Vector3.Distance(origin, candidate.ClosestPoint(origin));
                if (!spell.area)
                {
                    if (distance < nearestDistance) { nearestDistance = distance; nearest = candidate; }
                }
                else
                {
                    ApplyDamage(candidate, damageable, spell);
                    hitAny = true;
                }
            }

            if (!spell.area && nearest != null)
            {
                var damageable = nearest.GetComponentInParent<IAstreaDamageable>();
                ApplyDamage(nearest, damageable, spell);
                hitAny = true;
            }

            // P3 acceptance: a failed offensive cast must not consume mana or start cooldown.
            if (!hitAny) return false;
            CommitCast(spell);
            if (vfx != null) vfx.PlayAtCastPoint(spell.element);
            return true;
        }

        private void CommitCast(SpellDefinition spell)
        {
            CurrentMana = Mathf.Max(0f, CurrentMana - spell.manaCost);
            cooldownUntil[spell.element] = Time.time + spell.cooldown;
            ManaChanged?.Invoke(CurrentMana, maxMana);
        }

        private void ApplyDamage(Collider target, IAstreaDamageable damageable, SpellDefinition spell)
        {
            int id = target.transform.root.GetInstanceID();
            if (!hitTargets.Add(id)) return;
            damageable.ReceiveDamage(spell.damage, transform);
            if (vfx != null)
                vfx.PlayElementalBurst(spell.element, target.ClosestPoint(castOrigin.position));
        }

        private SpellDefinition? FindSpell(string element)
        {
            foreach (var spell in spells)
                if (string.Equals(spell.element, element.Trim(), StringComparison.OrdinalIgnoreCase))
                    return spell;
            return null;
        }
    }
}
