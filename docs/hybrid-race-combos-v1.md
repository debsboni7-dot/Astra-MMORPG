# ASTREA — Hybrid and race combo foundation v1

## Input model

- Physical attack (`J` / Square / touch attack) is one combo input.
- Magic cast (`K` / Triangle / touch magic) is a second combo input.
- Both inputs share one timed chain. A successful physical → magic → physical sequence remains one combo instead of resetting when the player switches buttons.
- The chain advances only after a valid physical attack or successful spell cast. Failed casts do not consume a combo step.
- The input window is 800 ms; the chain resets after the window expires. Block and dodge still break the chain.
- The third step is the finisher stage. The existing physical attack damage multiplier and stamina cost progression remain in effect.

## Race identities

| Race | Physical signature | Magic signature | Hybrid signature |
|---|---|---|---|
| Human | balanced-strike | quick-weave | spellblade-link |
| Elf | flowing-cut | nature-weave | windstep-weave |
| Dwarf | stonebreaker | rune-impact | rune-smash |
| Demon | savage-rend | abyssal-burst | hellchain |
| Angel | radiant-lance | seraph-weave | judgement-chain |
| Orc | crusher | ember-burst | warfire-crash |
| Dragonoid | drake-claw | dragon-breath | wyrm-combo |

Race profiles also define a restrained animation tempo multiplier. Combo state exposes the full input sequence, race style, signature, and whether the last input created a physical/magic transition.

## Animation integration contract

The animation resolver first looks for race-specific clips (`combo_<race>_hybrid_<stage>`, `combo_<race>_<input>_<stage>`, and related variants). If those clips are not present in the character GLB archive, it safely falls back to the existing `attack` and `charged_spell_cast` clips. The current character packs only provide generic clips, so the combo chain and race identities are integrated, but bespoke per-race motion capture/animation assets remain a separate asset task.

## Multiplayer note

This v1 combo chain is client prototype state. It must be moved into authoritative server combat resolution before live competitive multiplayer; clients must not be trusted to report damage, combo multipliers, or mastery rewards.
