#if UNITY_EDITOR
using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Astrea.EditorTools
{
    /// <summary>Builds a reusable Animator Controller from locally imported Mixamo clips.</summary>
    public static class AstreaAnimatorSetup
    {
        private const string ClipFolder = "Assets/Art/Animations/Mixamo";
        private const string ControllerPath = "Assets/Art/Animations/ASTREA_Humanoid.controller";

        [MenuItem("ASTREA/Animation/Build Starter Animator Controller")]
        public static void BuildStarterController()
        {
            var clips = AssetDatabase.FindAssets("t:AnimationClip", new[] { ClipFolder })
                .Select(guid => AssetDatabase.LoadAssetAtPath<AnimationClip>(AssetDatabase.GUIDToAssetPath(guid)))
                .Where(clip => clip != null && !clip.name.StartsWith("__preview__", StringComparison.OrdinalIgnoreCase))
                .ToArray();

            AnimationClip Find(params string[] terms)
            {
                return clips.FirstOrDefault(clip =>
                    terms.Any(term => clip.name.IndexOf(term, StringComparison.OrdinalIgnoreCase) >= 0));
            }

            var idle = Find("idle", "breathing");
            var walk = Find("walk");
            var run = Find("run", "sprint");
            var jump = Find("jump");
            var fall = Find("fall");
            var land = Find("land");
            var attack = Find("attack", "slash", "sword");
            var hit = Find("hit", "hurt", "damage");
            var death = Find("death", "die");

            EnsureFolder("Assets/Art", "Animations");
            if (AssetDatabase.LoadAssetAtPath<AnimatorController>(ControllerPath) != null)
                AssetDatabase.DeleteAsset(ControllerPath);
            var controller = AnimatorController.CreateAnimatorControllerAtPath(ControllerPath);
            AddParameters(controller);

            var machine = controller.layers[0].stateMachine;
            var locomotion = machine.AddState("Locomotion");
            var blend = new BlendTree
            {
                name = "ASTREA_Locomotion_1D",
                blendType = BlendTreeType.Simple1D,
                blendParameter = "Speed",
                useAutomaticThresholds = false
            };
            AssetDatabase.AddObjectToAsset(blend, controller);
            if (idle != null) blend.AddChild(idle, 0f);
            if (walk != null) blend.AddChild(walk, 1.5f);
            if (run != null) blend.AddChild(run, 4f);
            if (blend.children.Length == 0)
                Debug.LogWarning("ASTREA Animator: aucun clip Idle/Walk/Run trouvé. Le state Locomotion sera vide.");
            locomotion.motion = blend;
            machine.defaultState = locomotion;

            var jumpState = AddClipState(machine, "Jump", jump);
            var fallState = AddClipState(machine, "Fall", fall);
            var landState = AddClipState(machine, "Land", land);
            var attackState = AddClipState(machine, "Attack", attack);
            var hitState = AddClipState(machine, "Hit", hit);
            var deathState = AddClipState(machine, "Death", death);

            if (jumpState != null)
            {
                var toJump = locomotion.AddTransition(jumpState);
                toJump.hasExitTime = false;
                toJump.AddCondition(AnimatorConditionMode.IfNot, 0f, "Grounded");
                var jumpToFall = jumpState.AddTransition(fallState ?? locomotion);
                jumpToFall.hasExitTime = false;
                jumpToFall.AddCondition(AnimatorConditionMode.Less, -0.1f, "VerticalSpeed");
            }
            if (fallState != null)
            {
                var toFall = locomotion.AddTransition(fallState);
                toFall.hasExitTime = false;
                toFall.AddCondition(AnimatorConditionMode.IfNot, 0f, "Grounded");
                toFall.AddCondition(AnimatorConditionMode.Less, -0.1f, "VerticalSpeed");
                var fallToLand = fallState.AddTransition(landState ?? locomotion);
                fallToLand.hasExitTime = false;
                fallToLand.AddCondition(AnimatorConditionMode.If, 0f, "Grounded");
            }
            if (landState != null)
            {
                var landToMove = landState.AddTransition(locomotion);
                landToMove.hasExitTime = true;
                landToMove.exitTime = 0.9f;
            }

            AddAnyStateTrigger(machine, attackState, "Attack");
            AddAnyStateTrigger(machine, hitState, "Hit");
            if (deathState != null)
            {
                var dead = machine.AddAnyStateTransition(deathState);
                dead.hasExitTime = false;
                dead.duration = 0.08f;
                dead.AddCondition(AnimatorConditionMode.If, 0f, "Dead");
            }
            if (attackState != null) AddReturnTransition(attackState, locomotion);
            if (hitState != null) AddReturnTransition(hitState, locomotion);
            if (deathState != null) deathState.writeDefaultValues = true;

            EditorUtility.SetDirty(controller);
            AssetDatabase.SaveAssets();
            AssignToSceneAnimators(controller);
            Debug.Log("ASTREA Animator Controller créé. Clips détectés: " +
                string.Join(", ", new[] { idle, walk, run, jump, fall, land, attack, hit, death }
                    .Where(c => c != null).Select(c => c.name)));
        }

        private static void AddParameters(AnimatorController controller)
        {
            controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
            controller.AddParameter("MoveX", AnimatorControllerParameterType.Float);
            controller.AddParameter("MoveY", AnimatorControllerParameterType.Float);
            controller.AddParameter("Grounded", AnimatorControllerParameterType.Bool);
            controller.AddParameter("VerticalSpeed", AnimatorControllerParameterType.Float);
            controller.AddParameter("Attack", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("Hit", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("Dead", AnimatorControllerParameterType.Bool);
        }

        private static AnimatorState AddClipState(AnimatorStateMachine machine, string name, AnimationClip clip)
        {
            if (clip == null)
            {
                Debug.LogWarning("ASTREA Animator: clip manquant pour " + name + ". Importer le clip Mixamo correspondant.");
                return null;
            }
            var state = machine.AddState(name);
            state.motion = clip;
            return state;
        }

        private static void AddAnyStateTrigger(AnimatorStateMachine machine, AnimatorState target, string trigger)
        {
            if (target == null) return;
            var transition = machine.AddAnyStateTransition(target);
            transition.hasExitTime = false;
            transition.duration = 0.06f;
            transition.AddCondition(AnimatorConditionMode.If, 0f, trigger);
        }

        private static void AddReturnTransition(AnimatorState source, AnimatorState target)
        {
            var transition = source.AddTransition(target);
            transition.hasExitTime = true;
            transition.exitTime = 0.9f;
            transition.duration = 0.08f;
        }

        private static void AssignToSceneAnimators(RuntimeAnimatorController controller)
        {
            foreach (var animator in UnityEngine.Object.FindObjectsByType<Animator>(FindObjectsSortMode.None))
            {
                animator.runtimeAnimatorController = controller;
                animator.applyRootMotion = false;
                EditorUtility.SetDirty(animator);
            }
            EditorSceneManagerMarkDirty();
            UnityEditor.SceneManagement.EditorSceneManager.SaveOpenScenes();
        }

        private static void EditorSceneManagerMarkDirty()
        {
            var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene();
            if (scene.IsValid() && scene.isLoaded)
                UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(scene);
        }

        private static void EnsureFolder(string parent, string child)
        {
            string path = parent + "/" + child;
            if (!AssetDatabase.IsValidFolder(path)) AssetDatabase.CreateFolder(parent, child);
        }
    }
}
#endif
