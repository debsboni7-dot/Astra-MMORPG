using System;
using UnityEngine;

namespace Astrea.VFX
{
    /// <summary>Routes elemental spell events to the pooled VFX library. Call only when a spell is actually released or impacts.</summary>
    public sealed class AstreaSpellVfxController : MonoBehaviour
    {
        [SerializeField] private AstreaVfxLibrary library;
        [SerializeField] private Transform castPoint;
        [SerializeField] private float effectScale = 1f;

        private void Awake()
        {
            if (library == null) library = GetComponentInChildren<AstreaVfxLibrary>();
            if (castPoint == null) castPoint = transform;
        }

        public bool PlayElementalBurst(string element, Vector3 worldPosition)
        {
            if (library == null || string.IsNullOrWhiteSpace(element)) return false;
            string key;
            switch (element.Trim().ToLowerInvariant())
            {
                case "fire": key = "fire_burst"; break;
                case "water": key = "water_burst"; break;
                case "wind": key = "wind_burst"; break;
                case "earth": key = "earth_burst"; break;
                case "ice":
                case "frost": key = "frost_burst"; break;
                case "lightning": key = "lightning_burst"; break;
                case "nature": key = "nature_burst"; break;
                case "light": key = "light_burst"; break;
                case "dark":
                case "demon": key = "dark_burst"; break;
                default: return false;
            }
            return library.Play(key, worldPosition, castPoint != null ? castPoint.rotation : transform.rotation, effectScale);
        }

        public bool PlayAtCastPoint(string element)
        {
            return PlayElementalBurst(element, castPoint != null ? castPoint.position : transform.position);
        }
    }
}
