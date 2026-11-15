using UnityEngine;
using UnityEngine.InputSystem;
using Astrea.Character;
using Astrea.Combat;

namespace Astrea.Input
{
    /// <summary>
    /// Runtime input bridge for keyboard, mouse and gamepad. Mobile HUD continues
    /// to feed the same character controller through its existing public methods.
    /// Bindings are created in code so no paid service or generated asset is required.
    /// </summary>
    [RequireComponent(typeof(AstreaThirdPersonController))]
    public sealed class AstreaInputRouter : MonoBehaviour
    {
        private AstreaThirdPersonController character;
        private AstreaCombatController combat;
        private InputAction move;
        private InputAction look;
        private InputAction jump;
        private InputAction attack;

        private void Awake()
        {
            character = GetComponent<AstreaThirdPersonController>();
            combat = GetComponent<AstreaCombatController>();

            move = new InputAction("Move", InputActionType.Value);
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w").With("Down", "<Keyboard>/s")
                .With("Left", "<Keyboard>/a").With("Right", "<Keyboard>/d");
            move.AddBinding("<Gamepad>/leftStick");

            look = new InputAction("Look", InputActionType.Value);
            look.AddBinding("<Mouse>/delta");
            look.AddBinding("<Gamepad>/rightStick");

            jump = new InputAction("Jump", InputActionType.Button);
            jump.AddBinding("<Keyboard>/space");
            jump.AddBinding("<Gamepad>/buttonSouth");

            attack = new InputAction("Attack", InputActionType.Button);
            attack.AddBinding("<Mouse>/leftButton");
            attack.AddBinding("<Gamepad>/rightTrigger");
        }

        private void OnEnable()
        {
            move?.Enable();
            look?.Enable();
            jump?.Enable();
            attack?.Enable();
        }

        private void OnDisable()
        {
            move?.Disable();
            look?.Disable();
            jump?.Disable();
            attack?.Disable();
        }

        private void Update()
        {
            if (move != null)
                character.SetDeviceMove(move.ReadValue<Vector2>());
            if (look != null)
            {
                Vector2 delta = look.ReadValue<Vector2>();
                if (look.activeControl != null && look.activeControl.device is Gamepad)
                    delta *= 120f * Time.deltaTime;
                character.SetMobileLook(delta);
            }
            if (jump != null && jump.WasPressedThisFrame())
                character.RequestJump();
            if (attack != null && attack.WasPressedThisFrame() && combat != null)
                combat.TryAttack();
        }

        private void OnDestroy()
        {
            move?.Dispose();
            look?.Dispose();
            jump?.Dispose();
            attack?.Dispose();
        }
    }
}
