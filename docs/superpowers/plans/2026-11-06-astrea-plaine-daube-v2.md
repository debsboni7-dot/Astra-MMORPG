# ASTREA Plaine d'Aube Environment V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the streamed Three.js environment dressing for a bright, anime semi-realistic medieval starter plain without changing gameplay systems.

**Architecture:** Keep the existing world generator and its continental coordinates. Extract mobile-aware biome density budgets into a pure module, then use instanced terrain dressing and existing PBR texture sources inside the current chunk lifecycle.

**Tech Stack:** Three.js 0.170.0, ES modules, Node.js test runner, Playwright Chromium.

**Spec:** `docs/astrea-environment-redesign.md`

## Global Constraints
- Preserve Three.js 0.170.0 and the 1 km chunk streaming architecture.
- Preserve 1 unit = 1 metre and all eight regional coordinates.
- Preserve movement, camera, combat, save data, activity definitions and touch input.
- Do not add dependencies or replace existing licensed assets.
- Keep each biome's total instanced dressing at or below 6,200 instances per chunk.

## Review Focus
- Dense grass must not cover roads, the river, village plaza or building footprints.
- Instanced meshes must be disposed correctly when chunks stream out.
- Random dressing must be deterministic for stable chunk reloads.
- Terrain normals and height must remain continuous at chunk edges.
- Mobile GPU cost must remain bounded and not regress launch or input responsiveness.

---

### Task 1: Extract biome dressing budgets

**Files:**
- Create: `prototype/src/world/environment-profile.js`
- Create: `tests/astrea-environment-profile.test.js`

- [x] Write failing profile tests.
- [x] Verify RED due to missing module.
- [x] Implement frozen biome profiles and fallback.
- [x] Verify focused tests pass.

### Task 2: Rebuild terrain detail and natural dressing

**Files:**
- Modify: `prototype/src/world/astrea-world.js`
- Test: `tests/astrea-world.test.js`, `tests/astrea-environment-profile.test.js`

- [x] Use profile-driven 64-segment terrain grid.
- [x] Add instanced grass tufts, shrubs, flowers, rocks and pebbles per biome.
- [x] Keep the river, roads and village clearance zones free of ground dressing.
- [x] Add fenced crop plots and hay bales around the starter village.
- [x] Run focused and full automated tests (107/107 passed).

### Task 3: Browser verification and delivery

**Files:**
- Modify only if required by visual review.
- Update: `prototype/README.md`, `docs/astrea-environment.md` if behavior or asset provenance changes.

- [x] Launch the prototype in headless Chromium at a 412 × 915 mobile viewport.
- [x] Enter the game and inspect the actual 3D scene, including an overhead view.
- [x] Check console errors, canvas rendering and touch control visibility (zero console/page errors).
- [x] Re-run the complete Node test suite and JavaScript syntax checks.
- [x] Record real-device performance as unverified; headless Chromium uses software WebGL and is not a phone GPU benchmark.
