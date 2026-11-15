using UnityEngine;

namespace Astrea.Animation
{
    /// <summary>Maps character locomotion and gameplay events to a Humanoid Animator.</summary>
    [RequireComponent(typeof(Animator))]
    public sealed class AstreaAnimationDriver : MonoBehaviour
    {
        [SerializeField] private Animator animator;
        [SerializeField] private Astrea.Character.AstreaThirdPersonController movement;
        [SerializeField, Min(0.01f)] private float dampTime = 0.12f;

        private static readonly int Speed = Animator.StringToHash("Speed");
        private static readonly int MoveX = Animator.StringToHash("MoveX");
        private static readonly int MoveY = Animator.StringToHash("MoveY");
        private static readonly int Grounded = Animator.StringToHash("Grounded");
        private static readonly int VerticalSpeed = Animator.StringToHash("VerticalSpeed");
        private static readonly int Attack = Animator.StringToHash("Attack");
        private static readonly int Hit = Animator.StringToHash("Hit");
        private static readonly int Dead = Animator.StringToHash("Dead");

        private void Awake()
        {
            if (animator == null) animator = GetComponent<Animator>();
            if (movement == null) movement = GetComponentInParent<Astrea.Character.AstreaThirdPersonController>();
        }

        private void Update()
        {
            if (animator == null || movement == null) return;
            Vector3 localVelocity = transform.InverseTransformDirection(movement.PlanarVelocity);
            animator.SetFloat(Speed, movement.PlanarVelocity.magnitude, dampTime, Time.deltaTime);
            animator.SetFloat(MoveX, localVelocity.x, dampTime, Time.deltaTime);
            animator.SetFloat(MoveY, localVelocity.z, dampTime, Time.deltaTime);
            animator.SetBool(Grounded, movement.IsGrounded);
            animator.SetFloat(VerticalSpeed, movement.VerticalSpeed);
        }

        public void PlayAttack() { if (animator != null) animator.SetTrigger(Attack); }
        public void PlayHit() { if (animator != null) animator.SetTrigger(Hit); }
        public void PlayDeath() { if (animator != null) animator.SetBool(Dead, true); }
    }
}
