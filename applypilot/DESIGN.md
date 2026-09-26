# Design System (Impeccable Context)

## Philosophy
Strictly hierarchical, utility-driven, high-contrast, zero-gimmick UI.
No 3D tilting, no grid meshes, no stacked icons above headings, no glassmorphism for decoration.

## Typography
- **Headings & Displays:** `font-sora` (Sora).
- **Body & UI:** `font-inter` (Inter).
- **Code & Mono Data:** `font-jetbrains` (JetBrains Mono).
- **Constraints:**
  - `max-w-prose` on all multi-line text blocks.
  - Generous top margins for headings (`mt-10 mb-3` pattern).
  - Left-aligned body text always.

## Color Palette
- **Base Theme:** Dark mode first (`bg-slate-950`).
- **Primary Action:** Solid, high-contrast white or high-contrast slate.
- **Accents:** Slate and neutral grays. Avoid neon cyberpunk borders.
- **Text:** `text-slate-100` for primary, `text-slate-400` for secondary. High WCAG AA contrast.

## Surfaces & Elevations
- **Rule of Exclusive Borders/Shadows:** A card can have a subtle `border-slate-800` OR a drop shadow, never both.
- **Backgrounds:** Clean, flat `bg-slate-900` or `bg-slate-900/50`. No nested cards (card-in-card).
- **Corner Radii:** Consistent `rounded-xl` for cards, `rounded-lg` for buttons. No extreme pills for large items.

## Motion
- **Permitted:** Subtle opacity fades (`opacity-0` to `opacity-100`), slight Y-axis translations (`translate-y-4` to `translate-y-0`) for entrance.
- **Banned:** `animate-ping` on static statuses, bouncing/elastic spring easing, 3D CSS tilts. Use snappy, predictable transitions.
