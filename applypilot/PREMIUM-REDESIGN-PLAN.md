# ApplyPilot Premium Redesign — Execution Plan

**Date:** 2026-09-22
**Goal:** Complete premium light-mode redesign of ApplyPilot website with advanced 3D moving text, replacing the existing dashboard and all sections.
**Constraint:** Light mode only. Dark mode rejected by user.

## Design Direction
- **Aesthetic:** Ultra-premium SaaS — glassmorphism, 3D depth, kinetic typography
- **Palette:** Indigo/Trust Blue (#2563EB) primary · Coral accent (#EA580C) · Warm off-white surfaces
- **Type:** Sora (display) · Inter (body) · JetBrains Mono (code)
- **Depth:** Physical elevation cards, frosted glass, 3D tilt on hover

## Files to Modify (in order)

### Phase 1 — Design System
1. `src/index.css` — Overhaul tokens, add kinetic text classes, glassmorphism, 3D depth utilities

### Phase 2 — New Component
2. `src/components/KineticText.tsx` — 3D moving text with parallax, gradient, glow

### Phase 3 — Core Section Overhauls
3. `src/components/AnalyticsDashboard.tsx` — Premium glassmorphism + 3D orbital
4. `src/components/LandingPage.tsx` — Hero with 3D moving text + premium sections
5. `src/components/LandingHero3D.tsx` — Enhanced 3D hero background

### Phase 4 — Step Components
6. `src/components/DiscoveryStep.tsx` — Premium job discovery
7. `src/components/ScoringStep.tsx` — Premium fit scoring
8. `src/components/TailorStep.tsx` — Premium resume tailoring
9. `src/components/ApplyStep.tsx` — Premium application
10. `src/components/TrackerStep.tsx` — Premium tracking
11. `src/components/ResumeStep.tsx` — Premium resume builder

### Phase 5 — 3D Component Enhancements
12. `src/components/3d/HoloBadge.tsx` — Holographic badge
13. `src/components/3d/ThreeDRadarScope.tsx` — Radar scope
14. `src/components/3d/ThreeDScoreGem.tsx` — Score gem
15. `src/components/3d/ThreeDDocumentFolio.tsx` — Document folio
16. `src/components/3d/HeroProductCockpit3D.tsx` — Product cockpit
17. `src/components/3d/ThreeDWorkbenchStage.tsx` — Workbench stage

### Phase 6 — Verification
18. Run build: `npm run build` (or `pnpm build`)

## Key Design Tokens (Light Mode)
- `--color-primary: #2563EB`
- `--color-accent: #EA580C`
- `--color-bg: #F8FAFC`
- `--color-bg-alt: #FFFFFF`
- `--color-fg: #0F172A`
- `--color-fg-mid: #475569`
- `--color-fg-soft: #94A3B8`
- `--color-border: #E2E8F0`
- Glass: `rgba(255,255,255,0.78)` with `backdrop-filter: blur(20px) saturate(180%)`

## Kinetic Text Variants
- `kinetic-text-hero` — Large 3D moving text with gradient & glow
- `kinetic-text-section` — Medium 3D moving text for section headers
- `kinetic-text-badge` — Small 3D moving text for badges