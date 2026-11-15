using UnityEngine;
using UnityEngine.EventSystems;

namespace Astrea.UI
{
    /// <summary>Small dependency-free touch joystick. Wire OnValueChanged to AstreaThirdPersonController.SetMobileMove.</summary>
    public sealed class AstreaVirtualJoystick : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IDragHandler
    {
        [SerializeField] private RectTransform background;
        [SerializeField] private RectTransform handle;
        [SerializeField, Range(0.1f, 1f)] private float handleRange = 0.65f;
        [SerializeField] private bool useFixedPosition = true;

        public System.Action<Vector2> OnValueChanged;
        private int activePointerId = int.MinValue;

        public void OnPointerDown(PointerEventData eventData)
        {
            if (activePointerId != int.MinValue) return;
            activePointerId = eventData.pointerId;
            if (!useFixedPosition)
                background.position = eventData.position;
            OnDrag(eventData);
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (eventData.pointerId != activePointerId || background == null || handle == null) return;
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(
                background, eventData.position, eventData.pressEventCamera, out Vector2 localPoint)) return;

            Vector2 halfSize = background.rect.size * 0.5f;
            Vector2 normalized = new Vector2(
                halfSize.x > 0 ? localPoint.x / halfSize.x : 0,
                halfSize.y > 0 ? localPoint.y / halfSize.y : 0);
            normalized = Vector2.ClampMagnitude(normalized, 1f);
            handle.anchoredPosition = new Vector2(normalized.x * halfSize.x, normalized.y * halfSize.y) * handleRange;
            OnValueChanged?.Invoke(normalized);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (eventData.pointerId != activePointerId) return;
            activePointerId = int.MinValue;
            if (handle != null) handle.anchoredPosition = Vector2.zero;
            OnValueChanged?.Invoke(Vector2.zero);
        }

        private void OnDisable()
        {
            activePointerId = int.MinValue;
            if (handle != null) handle.anchoredPosition = Vector2.zero;
            OnValueChanged?.Invoke(Vector2.zero);
        }
    }
}
