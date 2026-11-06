# Animations

ASTREA's browser prototype now builds procedural, race-specific combat clips from the selected character rig at runtime.

- 7 race movement profiles (Human, Elf, Dwarf, Demon, Angel, Orc, Dragonoid).
- 3 action families per race: physical, magic and hybrid.
- 3 combo stages per family (63 generated clips across the seven races).
- Uses the character's existing armature and the shared ASTREA/Mixamo-style bone names; no external DCC application is required at runtime.
- Dedicated authored animation files can override the procedural clips later by using the `combo_<race>_<family>_<stage>.glb` naming convention.

These clips are a first playable motion pass, not final motion-captured or hand-authored production animation. Review weapon alignment, body proportions, foot contact and transition quality for every race/sex before treating the animation set as final.
