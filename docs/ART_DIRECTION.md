# ASTREA visual direction

## Visual pillars
1. **Luminous medieval realism**: grounded materials, readable silhouettes and believable scale; avoid muddy, permanently dark grading.
2. **Royal craft, not visual noise**: steel, aged silver, restrained gold, sapphire enamel, dark leather and carved stone. Ornament follows armor seams and faction identity.
3. **Readable adventure spaces**: warm daylight over Astrea's plains, cooler forest light in Van, hard sun and ochre bounce in Burg, restrained night lighting in Night, and dramatic but navigable contrast in Noir.

## Material palette
- Tempered midnight steel: cool blue-grey, metallic, fine directional forging marks.
- Forged silver: bright edge highlights, slightly varied roughness.
- Antique gold: warm, muted gold; use as trim, not broad uninterrupted surfaces.
- Oxblood leather: low-metallic, grain variation and matte response.
- Sapphire enamel: deep blue, glossy but not emissive by default.

## PBR production rules
- Author Base Color, Metallic/Roughness and tangent-space Normal maps as separate PNGs.
- Use seamless 512px maps for the current armor blockout; upgrade to 1K/2K only after checking memory and device performance.
- Metallic/Roughness follows glTF packing: Green = roughness, Blue = metallic.
- Keep texture detail subtle at gameplay camera distance. Large shapes and silhouette must read before micro-detail.
- Preserve source .blend and PNG maps. FBX is an interchange file for Unity; verify material links after import.

## World surface library
- AstreaGrass: muted green grass, low saturation for readable player silhouettes.
- AstreaSoil: warm brown earth for paths and cultivated fields.
- VanForestFloor: deep green-brown forest ground.
- BurgSandstone: sun-warmed ochre stone for desert architecture and cliffs.
- NoirSlate: cool charcoal stone for high-difficulty regions.
- Each surface is generated as a seamless 512px Base Color, Metallic/Roughness and Normal texture set. These are source maps; Unity terrain/material assignment and in-scene tuning remain required.

## World and lighting targets
- Starter continent Astrea: open grassy plains, soft blue sky, warm sunlight, distant hills and sparse landmarks.
- Prefer baked lighting for static architecture where possible; reserve real-time shadows for the player and nearby moving actors on mobile.
- Keep mobile shadows and post effects conservative. Provide a scalable quality profile rather than forcing desktop settings on phones.
- Avoid excessive bloom, chromatic aberration, film grain and depth of field during combat.

## Acceptance checks
- Inspect the model at close, medium and gameplay distances.
- Check the FBX in Unity for scale, normals, UVs, texture assignment and material response.
- Check Android memory and frame time before raising texture resolution or shadow distance.
- The current modular armor remains a visual blockout until it is fitted to a rigged humanoid and inspected in an actual Unity scene.
