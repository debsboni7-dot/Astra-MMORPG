# ASTREA race-specific combo animations — v1

## Runtime implementation

The prototype creates combo clips from the selected character's armature in the browser. It does not require Blender or a desktop editor at runtime.

- The generator lives in `prototype/src/combat/RaceComboAnimations.js`.
- It creates nine clips for the selected race: physical, magic and hybrid families, each with stages 1–3.
- The seven playable races have separate motion profiles for power, sweep, torso turn, lift and tempo.
- The clips animate the existing upper-body, torso, hip and leg bones; the hybrid family combines a weapon-side strike with a spell-side casting pose.
- The generated action names match the combo resolver: `combo_<race>_<family>_<stage>`.
- Dedicated authored GLB clips can be added later and will take priority because the combo resolver checks race-specific clips before the generated fallback clips.

## Validation performed

- Automated repository tests: 142 passing.
- Browser module test: generated all nine clips for each of the seven races (63 clip actions total) and played hybrid finishers through a Three.js AnimationMixer.
- Chromium mobile viewport: 412×915; selected the Orc and confirmed its real character model and animation set loaded without page errors or horizontal overflow.

## Known limitations

This is a procedural first pass. It produces different motion signatures, not seven complete professionally authored animation libraries. Weapon grip alignment, foot planting, clipping, female/male body proportions, hit timing and race-specific transitions still need dedicated visual review. When original authored clips become available, place them in the character archive under the naming convention above; the existing loader will use them instead.
