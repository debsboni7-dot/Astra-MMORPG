# ASTREA — Hybrid and race combo foundation v1

Physical attack (Square/J/touch attack) and magic cast (Triangle/K/touch magic) share one timed chain. A successful physical → magic → physical sequence remains one combo. Failed casts do not advance it. The input window is 800 ms; block, dodge and expired windows reset it. The third step is the finisher stage.

## Race identities

| Race | Physical | Magic | Hybrid |
|---|---|---|---|
| Human | balanced-strike | quick-weave | spellblade-link |
| Elf | flowing-cut | nature-weave | windstep-weave |
| Dwarf | stonebreaker | rune-impact | rune-smash |
| Demon | savage-rend | abyssal-burst | hellchain |
| Angel | radiant-lance | seraph-weave | judgement-chain |
| Orc | crusher | ember-burst | warfire-crash |
| Dragonoid | drake-claw | dragon-breath | wyrm-combo |

The animation resolver looks for race-specific clips first and falls back to generic `attack` and `charged_spell_cast` clips. The current GLB archives still use generic clips; bespoke race motion assets remain to be authored. This v1 chain is client prototype state and must be server-authoritative before competitive multiplayer.
