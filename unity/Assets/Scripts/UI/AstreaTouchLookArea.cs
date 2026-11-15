using UnityEngine;
using UnityEngine.EventSystems;

namespace Astrea.UI
{
    /// <summary>Touch-drag look zone. Wire OnLookDelta to AstreaThirdPersonController.SetMobileLook.</summary>
    public sealed class AstreaTouchLookArea : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IDragHandler
    {
        [SerializeField, Min(0f)] private float sensitivity = 1f;
        public System.Action<Vector2> OnLookDelta;
        private int activePointerId = int.MinValue;

        public void OnPointerDown(PointerEventData eventData)
        {
            if (activePointerId != int.MinValue) return;
            activePointerId = eventData.pointerId;
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (eventData.pointerId != activePointerId) return;
            OnLookDelta?.Invoke(eventData.delta * sensitivity);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (eventData.pointerId != activePointerId) return;
            activePointerId = int.MinValue;
        }

        private void OnDisable() => activePointerId = int.MinValue;
    }
}
