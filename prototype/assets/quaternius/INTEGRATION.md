# Quaternius — Modular Character Outfits (Standard)

Source: Modular Character Outfits - Fantasy, Standard edition.
License file: `License_Standard.txt` (CC0; keep this attribution and license information with the project).

## Imported content

- 4 complete outfit combinations: Male/Female Peasant and Male/Female Ranger.
- 20 independent skinned modular parts: 10 male and 10 female.
- Matching glTF buffers and texture maps.

The 20 pieces and their textures are hosted in a separate ASTREA asset archive and loaded by the browser only when the wardrobe is first used. They are deliberately not stored in the GitHub Pages repository, keeping the application repository lightweight.

## ASTREA prototype integration

The 20 modular parts are registered in `prototype/src/main.js` and appear in the creator for Human characters, filtered by sex. Slots: torso, arms/sleeves, legs, boots/feet, head/hood, accessories/pauldrons.

The Quaternius assets use a 65-joint skeleton. ASTREA base characters currently use a 24-joint skeleton. Runtime retargeting maps the shared body joints and folds Quaternius finger joints onto the ASTREA hand joints. This is an initial compatibility bridge, not a claim of final production-quality skinning.

The base ASTREA character models still contain their original clothing in a single skinned mesh. Consequently, an overlaid Quaternius piece may intersect with the baked-in outfit. Proper production integration requires hiding/replacing corresponding base-body regions and visual fit checks. The current catalogue is enabled only for Humans until each other race's proportions are checked.

The male Human Peasant and Ranger presets have been exercised in Chromium; this confirms loading and skeleton attachment, not final visual fit across all body proportions and animations. No paid generation was used.
