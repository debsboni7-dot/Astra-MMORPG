using UnityEngine;

namespace Astrea.Rendering
{
    /// <summary>
    /// Conservative baseline lighting and quality defaults for the first ASTREA URP scene.
    /// Attach to a scene bootstrap object; tune per-device after profiling.
    /// </summary>
    public sealed class AstreaGraphicsProfile : MonoBehaviour
    {
        [Header("World lighting")]
        [SerializeField] private Color ambientSky = new Color(0.38f, 0.48f, 0.62f);
        [SerializeField] private Color ambientGround = new Color(0.22f, 0.20f, 0.16f);
        [SerializeField, Range(0f, 2f)] private float ambientIntensity = 1.0f;
        [SerializeField] private Color fogColor = new Color(0.58f, 0.66f, 0.72f);
        [SerializeField, Range(0f, 0.03f)] private float fogDensity = 0.0025f;

        [Header("Camera")]
        [SerializeField, Range(0, 8)] private int mobileMsaa = 2;
        [SerializeField] private bool enableFog = true;

        private void Awake()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = ambientSky;
            RenderSettings.ambientEquatorColor = Color.Lerp(ambientSky, ambientGround, 0.5f);
            RenderSettings.ambientGroundColor = ambientGround;
            RenderSettings.ambientIntensity = ambientIntensity;
            RenderSettings.fog = enableFog;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogColor = fogColor;
            RenderSettings.fogDensity = fogDensity;

            var camera = Camera.main;
            if (camera != null)
            {
                camera.allowHDR = true;
                camera.allowMSAA = true;
            }

            QualitySettings.antiAliasing = mobileMsaa;
            QualitySettings.shadowDistance = 45f;
            QualitySettings.shadowResolution = ShadowResolution.Medium;
            QualitySettings.shadowCascades = 2;
            QualitySettings.anisotropicFiltering = AnisotropicFiltering.Enable;
        }
    }
}
