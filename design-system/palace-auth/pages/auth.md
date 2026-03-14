# Auth Page Overrides

> **PROJECT:** Palace Auth
> **Generated:** 2026-03-14 16:20:06
> **Page Type:** Authentication

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero with device mockup, 2. Screenshots carousel, 3. Features with icons, 4. Reviews/ratings, 5. Download CTAs

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Dark/light matching app store feel. Star ratings in gold. Screenshots with device frames.

### Component Overrides

- Avoid: Only test on your device
- Avoid: Skip heading levels or misuse for styling
- Avoid: Div soup with no semantics

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Morphing elements (SVG/CSS), fluid animations (400-600ms curves), dynamic blur (backdrop-filter), color transitions
- Responsive: Test at 320 375 414 768 1024 1440
- Accessibility: Use sequential heading levels h1-h6
- Accessibility: Use semantic HTML and ARIA properly
- CTA Placement: Download buttons prominent (App Store + Play Store) throughout
