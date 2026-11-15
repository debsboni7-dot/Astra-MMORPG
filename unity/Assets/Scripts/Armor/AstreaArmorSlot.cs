using UnityEngine;

namespace Astrea.Character
{
    public enum AstreaArmorSlot
    {
        Chest, Back, ShoulderLeft, ShoulderRight,
        ForearmLeft, ForearmRight, Waist, Legs
    }

    /// <summary>Runtime attachment points for independently replaceable ASTREA armor pieces.</summary>
    public sealed class AstreaArmorLoadout : MonoBehaviour
    {
        [System.Serializable]
        public struct SlotAnchor
        {
            public AstreaArmorSlot slot;
            public Transform anchor;
        }

        [SerializeField] private SlotAnchor[] anchors;
        private readonly System.Collections.Generic.Dictionary<AstreaArmorSlot, GameObject> equipped =
            new System.Collections.Generic.Dictionary<AstreaArmorSlot, GameObject>();

        public bool Equip(AstreaArmorSlot slot, GameObject armorPrefab)
        {
            if (armorPrefab == null) return false;
            Transform mount = FindAnchor(slot);
            if (mount == null) return false;
            Unequip(slot);
            GameObject instance = Instantiate(armorPrefab, mount, false);
            instance.transform.localPosition = Vector3.zero;
            instance.transform.localRotation = Quaternion.identity;
            instance.transform.localScale = Vector3.one;
            equipped[slot] = instance;
            return true;
        }

        public void Unequip(AstreaArmorSlot slot)
        {
            if (!equipped.TryGetValue(slot, out GameObject instance)) return;
            if (instance != null) Destroy(instance);
            equipped.Remove(slot);
        }

        private Transform FindAnchor(AstreaArmorSlot slot)
        {
            if (anchors == null) return null;
            foreach (SlotAnchor entry in anchors)
                if (entry.slot == slot) return entry.anchor;
            return null;
        }
    }
}
