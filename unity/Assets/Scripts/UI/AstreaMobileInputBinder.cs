using Astrea.Character;
using Astrea.Combat;
using UnityEngine;

namespace Astrea.UI
{
    /// <summary>Connects the mobile HUD to the player when the player prefab enters the scene.</summary>
    public sealed class AstreaMobileInputBinder : MonoBehaviour
    {
        [SerializeField] private AstreaVirtualJoystick joystick;
        [SerializeField] private AstreaTouchLookArea lookArea;
        [SerializeField] private Transform cameraPivot;
        private AstreaCombatController combatController;
        private AstreaSpellCombatController spellController;
        private bool sprintHeld;

        private AstreaThirdPersonController controller;

        private void OnEnable()
        {
            if (joystick != null) joystick.OnValueChanged += HandleMove;
            if (lookArea != null) lookArea.OnLookDelta += HandleLook;
            BindPlayer();
        }

        private void Update()
        {
            if (controller == null) BindPlayer();
        }

        private void OnDisable()
        {
            if (joystick != null) joystick.OnValueChanged -= HandleMove;
            if (lookArea != null) lookArea.OnLookDelta -= HandleLook;
        }

        private void BindPlayer()
        {
            controller = FindObjectOfType<AstreaThirdPersonController>();
            if (controller == null) return;
            combatController = controller.GetComponent<AstreaCombatController>();
            spellController = controller.GetComponent<AstreaSpellCombatController>();

            if (cameraPivot != null)
            {
                cameraPivot.SetParent(controller.transform, false);
                cameraPivot.localPosition = new Vector3(0f, 1.55f, 0f);
                controller.SetCameraPivot(cameraPivot);
            }
        }

        private void HandleMove(Vector2 value)
        {
            if (controller != null)
            {
                controller.SetMobileMove(value);
                controller.SetSprintHeld(sprintHeld);
            }
        }

        public void SetSprintHeld(bool held)
        {
            sprintHeld = held;
            if (controller != null) controller.SetSprintHeld(held);
        }

        public void RequestJump()
        {
            if (controller != null) controller.RequestJump();
        }

        public void RequestAttack()
        {
            if (combatController != null) combatController.TryAttack();
        }

        public void RequestMagic()
        {
            if (spellController != null) spellController.TryCast("fire");
        }

        private void HandleLook(Vector2 delta)
        {
            if (controller != null) controller.SetMobileLook(delta);
        }
    }
}
