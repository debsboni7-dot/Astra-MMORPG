using UnityEngine;

namespace Astrea.Character
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class AstreaThirdPersonController : MonoBehaviour
    {
        [SerializeField] private Transform cameraPivot;
        [SerializeField, Min(0f)] private float moveSpeed = 4.5f;
        [SerializeField, Min(0f)] private float rotationSpeed = 12f;
        [SerializeField, Min(0f)] private float jumpHeight = 1.2f;
        [SerializeField] private float gravity = -22f;
        [SerializeField] private float lookSensitivity = 0.12f;

        private CharacterController characterController;
        private Vector2 mobileMove;
        private Vector2 deviceMove;
        private Vector2 mobileLook;
        private float verticalVelocity;
        private bool jumpRequested;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
        }

        private void Update()
        {
            Vector2 input = Vector2.ClampMagnitude(deviceMove.sqrMagnitude > 0.001f ? deviceMove : mobileMove, 1f);
            Transform view = cameraPivot != null ? cameraPivot : (Camera.main != null ? Camera.main.transform : transform);
            Vector3 forward = Vector3.ProjectOnPlane(view.forward, Vector3.up).normalized;
            Vector3 right = Vector3.ProjectOnPlane(view.right, Vector3.up).normalized;
            Vector3 direction = (forward * input.y + right * input.x).normalized;

            if (direction.sqrMagnitude > 0.001f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(direction, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
            }

            if (characterController.isGrounded && verticalVelocity < 0f) verticalVelocity = -2f;
            if (jumpRequested && characterController.isGrounded)
                verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);

            verticalVelocity += gravity * Time.deltaTime;
            Vector3 velocity = direction * moveSpeed;
            velocity.y = verticalVelocity;
            characterController.Move(velocity * Time.deltaTime);

            if (cameraPivot != null && mobileLook.sqrMagnitude > 0.001f)
            {
                cameraPivot.Rotate(Vector3.up, mobileLook.x * lookSensitivity, Space.World);
                cameraPivot.Rotate(Vector3.right, -mobileLook.y * lookSensitivity, Space.Self);
                Vector3 angles = cameraPivot.localEulerAngles;
                angles.x = Mathf.Clamp(angles.x > 180f ? angles.x - 360f : angles.x, -35f, 65f);
                cameraPivot.localEulerAngles = new Vector3(angles.x, angles.y, 0f);
            }

            jumpRequested = false;
            mobileLook = Vector2.zero;
        }

        public void SetCameraPivot(Transform pivot) => cameraPivot = pivot;

        // Connect these methods to mobile joystick and touch-look UI events.
        public void SetMobileMove(Vector2 value) => mobileMove = Vector2.ClampMagnitude(value, 1f);
        public void SetDeviceMove(Vector2 value) => deviceMove = Vector2.ClampMagnitude(value, 1f);
        public void SetMobileLook(Vector2 delta) => mobileLook = delta;
        public void RequestJump() => jumpRequested = true;
    }
}
