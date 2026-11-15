# ASTREA Mixamo animation intake

This folder is the drop location for FBX animation clips downloaded manually from Adobe Mixamo. Mixamo does not currently provide a supported public batch-export API for this workflow, so GitHub Actions must not attempt to log in, scrape the site, or store Adobe credentials.

## One-time character rigging

1. Wait until the generated ASTREA base character FBX exists at `Assets/Art/Characters/ASTREA_Humanoid_Meshy6.fbx`.
2. Open [Mixamo](https://www.mixamo.com/) in a browser and sign in with your Adobe ID.
3. Upload the ASTREA character FBX and place the auto-rig markers carefully at the chin, wrists, elbows, knees and groin as Mixamo requests.
4. Download the rigged character as FBX, with skin, in a neutral T-pose. Replace the unrigged source file at `Assets/Art/Characters/ASTREA_Humanoid_Meshy6.fbx` with this rigged version. Keep a backup of the original generated GLB/FBX outside this import path.
5. Let Unity import the character first. Its Humanoid Avatar is the reference for all animation clips.

## Animation downloads

Download clips as FBX without skin where Mixamo offers that option. Use consistent 30 FPS exports and descriptive file names. Place each FBX directly in this folder. Suggested first batch:

- `ASTREA_Idle.fbx`
- `ASTREA_Walk.fbx`
- `ASTREA_Run.fbx`
- `ASTREA_Jump.fbx`
- `ASTREA_Fall.fbx`
- `ASTREA_Land.fbx`
- `ASTREA_Attack_OneHanded.fbx`
- `ASTREA_Attack_TwoHanded.fbx`
- `ASTREA_HitReact.fbx`
- `ASTREA_Death.fbx`

The Unity editor importer configures these FBXs as Humanoid animations and reuses the ASTREA character Avatar when it is available. If an animation was imported before the rigged character, reimport it after the character is ready.

## Important limitations and rights

- Mixamo auto-rigging is a manual browser step. This repository integration configures Unity imports; it does not upload a character to Mixamo or download clips automatically.
- Mixamo's FAQ states that its characters and animations are free to use in personal, commercial and non-profit projects under its stated terms. Keep a record of the source and the exact downloaded clips.
- Retargeting success depends on the uploaded character having a suitable humanoid body and a valid Mixamo skeleton. Inspect feet, hands, weapon grip and root motion in Unity before accepting a clip.
- Mixamo clips are a starter library, not a finished ASTREA combat animation set. Weapon-specific attacks, spell casting, locomotion blending, facial animation and MMO combat timing will need further authoring and testing.
