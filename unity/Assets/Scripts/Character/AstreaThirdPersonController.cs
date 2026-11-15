using UnityEngine;

namespace Astrea.Character
{
    /// <summary>
    /// Camera-relative third-person locomotion shared by desktop, gamepad and touch.
    /// This is a local P0 controller; network authority is intentionally out of scope.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class AstreaThirdPersonController : MonoBehaviour
    {
        [SerializeField] private Transform cameraPivot;
        [SerializeField, Min(0f)] private float moveSpeed = 4.5f;
        [SerializeField, Min(0f)] private float sprintSpeed = 7f;
        [SerializeField, Min(0f)] private float rotationSpeed = 12f;
        [SerializeField, Min(0f)] private float jumpHeight = 1.2f;
        [SerializeField] private float gravity = -22f;
        [SerializeField, Min(0f)] private float lookSensitivity = 0.12f;
        [SerializeField] private float minimumPitch = -35f;
        [SerializeField] private float maximumPitch = 65f;

        private CharacterController characterController;
        private Vector2 mobileMove;
        private Vector2 deviceMove;
        private Vector2 mobileLook;
        private Vector2 deviceLook;
        private float verticalVelocity;
        private bool jumpRequested;
        private bool sprintHeld;
        private float cameraPitch;

        public Vector3 PlanarVelocity { get; private set; }
        public float VerticalSpeed => verticalVelocity;
        public bool IsGrounded => characterController != null && characterController.isGrounded;
        public bool IsSprinting { get; private set; }

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            if (cameraPivot != null)
                cameraPitch = NormalizeAngle(cameraPivot.localEulerAngles.x);
        }

        private void Update()
        {
            UpdateLook();

            Vector2 input = deviceMove.sqrMagnitude > 0.001f ? deviceMove : mobileMove;
            input = Vector2.ClampMagnitude(input, 1f);
            Transform view = cameraPivot != null
                ? cameraPivot
                : (Camera.main != null ? Camera.main.transform : transform);

            Vector3 forward = Vector3.ProjectOnPlane(view.forward, Vector3.up).normalized;
            Vector3 right = Vector3.ProjectOnPlane(view.right, Vector3.up).normalized;
            if (forward.sqrMagnitude < 0.001f)
                forward = Vector3.ProjectOnPlane(transform.forward, Vector3.up).normalized;
            if (right.sqrMagnitude < 0.001f)
                right = Vector3.Cross(Vector3.up, forward).normalized;

            Vector3 direction = Vector3.ClampMagnitude(forward * input.y + right * input.x, 1f);
            IsSprinting = sprintHeld && input.sqrMagnitude > 0.01f;
            float currentSpeed = IsSprinting ? sprintSpeed : moveSpeed;

            if (direction.sqrMagnitude > 0.001f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(direction, Vector3.up);
                transform.rotation = Quaternion.Slerp(
                    transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
            }

            if (characterController.isGrounded && verticalVelocity < 0f)
                verticalVelocity = -2f;
            if (jumpRequested && characterController.isGrounded)
                verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);

            verticalVelocity += gravity * Time.deltaTime;
            PlanarVelocity = direction * currentSpeed;
            Vector3 velocity = PlanarVelocity;
            velocity.y = verticalVelocity;
            characterController.Move(velocity * Time.deltaTime);
            jumpRequested = false;
        }

        private void UpdateLook()
        {
            Vector2 lookInput = mobileLook + deviceLook;
            mobileLook = Vector2.zero;
            deviceLook = Vector2.zero;
            if (cameraPivot == null || lookInput.sqrMagnitude < 0.001f)
                return;

            cameraPivot.Rotate(Vector3.up, lookInput.x * lookSensitivity, Space.World);
            cameraPitch = Mathf.Clamp(
                cameraPitch - lookInput.y * lookSensitivity, minimumPitch, maximumPitch);
            Vector3 angles = cameraPivot.localEulerAngles;
            cameraPivot.localEulerAngles = new Vector3(cameraPitch, angles.y, 0f);
        }

        private static float NormalizeAngle(float angle)
        {
            return angle > 180f ? angle - 360f : angle;
        }

        public void SetCameraPivot(Transform pivot)
        {
            cameraPivot = pivot;
            if (cameraPivot != null)
                cameraPitch = NormalizeAngle(cameraPivot.localEulerAngles.x);
        }

        public void SetMobileMove(Vector2 value) => mobileMove = Vector2.ClampMagnitude(value, 1f);
        public void SetDeviceMove(Vector2 value) => deviceMove = Vector2.ClampMagnitude(value, 1f);
        public void SetMobileLook(Vector2 delta) => mobileLook += delta;
        public void SetDeviceLook(Vector2 delta) => deviceLook = delta;
        public void SetSprintHeld(bool held) => sprintHeld = held;
        public void RequestJump() => jumpRequested = true;

        private void OnDisable()
        {
            mobileMove = Vector2.zero;
            deviceMove = Vector2.zero;
            mobileLook = Vector2.zero;
            deviceLook = Vector2.zero;
            jumpRequested = false;
            sprintHeld = false;
            IsSprinting = false;
            PlanarVelocity = Vector3.zero;
        }
    }
}