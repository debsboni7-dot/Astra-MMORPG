#if UNITY_EDITOR
using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Astrea.EditorTools
{
    /// <summary>Deterministic CI entry points. Requires a licensed Unity Editor runner.</summary>
    public static class AstreaCloudBuild
    {
        public static void GenerateStarterAssets()
        {
            AstreaStarterSceneBuilder.Build();
            AstreaVfxSetup.CreateStarterLibrary();
            AstreaAnimatorSetup.BuildStarterController();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            string scenePath = "Assets/Scenes/ASTREA_Starter_Plains.unity";
            if (!System.IO.File.Exists(scenePath))
                throw new Exception("Starter scene generation failed: " + scenePath + " was not created.");

            Debug.Log("ASTREA cloud asset generation completed. Check warnings for missing character/animation imports.");
        }

        public static void BuildFishNetNetworkTestBinaries()
        {
            AstreaFishNetPrototypeSceneBuilder.Build();
            const string testScene = "Assets/Scenes/ASTREA_FishNet_NetworkTest.unity";
            if (!System.IO.File.Exists(testScene))
                throw new Exception("FishNet network test scene was not generated: " + testScene);

            var scenes = new[] { testScene };
            var serverOptions = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = "Build/ASTREA-FishNet-Server/ASTREA.x86_64",
                target = BuildTarget.StandaloneLinux64,
                subtarget = (int)StandaloneBuildSubtarget.Server,
                options = BuildOptions.StrictMode
            };
            BuildReport serverReport = BuildPipeline.BuildPlayer(serverOptions);
            if (serverReport.summary.result != BuildResult.Succeeded)
                throw new Exception("FishNet Linux server build failed: " + serverReport.summary.result +
                    ", errors: " + serverReport.summary.totalErrors);

            var clientOptions = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = "Build/ASTREA-FishNet-Client/ASTREA.x86_64",
                target = BuildTarget.StandaloneLinux64,
                subtarget = (int)StandaloneBuildSubtarget.Player,
                options = BuildOptions.StrictMode
            };
            BuildReport clientReport = BuildPipeline.BuildPlayer(clientOptions);
            if (clientReport.summary.result != BuildResult.Succeeded)
                throw new Exception("FishNet Linux client build failed: " + clientReport.summary.result +
                    ", errors: " + clientReport.summary.totalErrors);

            Debug.Log("ASTREA FishNet network test server and client binaries built successfully.");
        }

        public static void BuildLinuxDedicatedServer()
        {
            GenerateStarterAssets();
            string[] scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            if (scenes.Length == 0)
                throw new Exception("No enabled scenes in Build Settings.");

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = "Build/ASTREA-LinuxServer/ASTREA.x86_64",
                target = BuildTarget.StandaloneLinux64,
                subtarget = (int)StandaloneBuildSubtarget.Server,
                options = BuildOptions.StrictMode
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new Exception("ASTREA Linux Dedicated Server build failed: " + report.summary.result +
                    ", errors: " + report.summary.totalErrors);
            Debug.Log("ASTREA Linux Dedicated Server built: " + report.summary.outputPath);
        }

        public static void BuildAndroid()
        {
            GenerateStarterAssets();
            const string playerModel = "Assets/Art/Characters/ASTREA_Humanoid_Meshy6.fbx";
            if (AssetDatabase.LoadAssetAtPath<GameObject>(playerModel) == null)
                throw new Exception("Android build stopped: humanoid FBX is missing at " + playerModel +
                    ". Generate/import the character before building a playable APK.");
            string[] scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            if (scenes.Length == 0)
                throw new Exception("No enabled scenes in Build Settings.");

            var options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = "Build/ASTREA.apk",
                target = BuildTarget.Android,
                options = BuildOptions.StrictMode
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new Exception("ASTREA Android build failed: " + report.summary.result +
                    ", errors: " + report.summary.totalErrors);
            Debug.Log("ASTREA Android APK built: " + report.summary.outputPath);
        }
    }
}
#endif
