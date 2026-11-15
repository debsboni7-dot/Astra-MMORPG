using UnityEngine;
using UnityEngine.EventSystems;

namespace Astrea.UI
{
    /// <summary>Forwards a press-and-hold UI gesture to the mobile sprint state.</summary>
    public sealed class AstreaHoldButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        [SerializeField] private AstreaMobileInputBinder inputBinder;

        public void SetInputBinder(AstreaMobileInputBinder binder) => inputBinder = binder;

        public void OnPointerDown(PointerEventData eventData)
        {
            if (eventData.button == PointerEventData.InputButton.Left && inputBinder != null)
                inputBinder.SetSprintHeld(true);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (inputBinder != null) inputBinder.SetSprintHeld(false);
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            if (inputBinder != null) inputBinder.SetSprintHeld(false);
        }

        private void OnDisable()
        {
            if (inputBinder != null) inputBinder.SetSprintHeld(false);
        }
    }
}