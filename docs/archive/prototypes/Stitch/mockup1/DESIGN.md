# Design System Specification: High-End Editorial Minimalism

## 1. Overview & Creative North Star: "The Digital Curator"
This design system is built for an audience that values intentionality over excess. The **Creative North Star** is "The Digital Curator"—a philosophy where every element is framed like a piece of art in a high-end gallery. 

Unlike standard "template" designs that rely on rigid grids and boxy containment, this system breaks the mold through **asymmetrical vertical rhythm** and generous whitespace. It treats the browser window as a canvas where "Kim-san DOK" isn't just a name, but a mark of quality. We achieve a premium feel by prioritizing tonal depth over structural lines, creating a layout that feels fluid, breathable, and deeply professional.

---

## 2. Colors & Surface Philosophy
The palette is strictly monochromatic, utilizing a sophisticated range of charcoals and greys to create a hierarchy without the need for hue.

### The Palette (Core Tokens)
- **Background (`surface`):** `#f9f9f9` — A slightly "off-white" paper feel that reduces eye strain.
- **Primary Text (`on_surface`):** `#1a1c1c` — Deep charcoal for maximum readability and authority.
- **Secondary Accents (`secondary`):** `#5f5e5e` — For metadata and sub-labels.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning. To separate content, use background color shifts or the spacing scale.
- Use `surface_container_low` (`#f3f3f4`) to denote a section change against the main `surface`.
- Boundaries are felt through the "snap" of white space (`spacing-16` or `spacing-20`), not a line.

### Surface Hierarchy & Layering
Treat the UI as a series of nested physical layers. 
- **Base Layer:** `surface` (#f9f9f9).
- **Secondary Layer:** `surface_container_low` (#f3f3f4) for subtle grouping.
- **High Focus Layer:** `surface_container_lowest` (#ffffff) for floating cards or inputs to create a natural "lift."

### Glass & Texture
For floating elements (like navigation bars or mobile menus), use semi-transparent versions of `surface_container_lowest` with a `backdrop-blur` of 20px. This "Glassmorphism" ensures the layout feels integrated and light. Main CTAs may use a subtle gradient from `primary` (#000000) to `primary_container` (#3c3b3b) to provide a "tactile" depth that flat black cannot achieve.

---

## 3. Typography: The Editorial Voice
We use **Inter** to bridge the gap between technical precision and humanist warmth.

- **Branding (The Name):** "Kim-san DOK" must be set in `headline-lg` (2rem) with a semi-bold weight. Letter spacing should be tightened slightly (-0.02em) for a custom typographic feel.
- **Display Scales:** Use `display-lg` (3.5rem) for hero statements. This should be typeset with generous leading (1.1) to create an "Editorial" look.
- **Body & Labels:** `body-lg` (1rem) is the workhorse. For secondary metadata, use `label-md` (0.75rem) in `secondary` color tokens to create clear contrast.

---

## 4. Elevation & Depth
Elevation is communicated through **Tonal Layering** and **Ambient Light**, never through heavy drop shadows.

- **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#f3f3f4) section. The color shift creates a "soft lift" that feels architectural.
- **Ambient Shadows:** Only use shadows for interactive floating elements. Shadows must be extra-diffused: 
  - `box-shadow: 0 10px 40px rgba(26, 28, 28, 0.06);` (Using a 6% tint of `on_surface`).
- **The "Ghost Border" Fallback:** If a container needs more definition (e.g., in high-glare environments), use the `outline_variant` token at 15% opacity. Never use a 100% opaque border.

---

## 5. Components

### Input Fields (High Focus)
- **Style:** Use `surface_container_lowest` (#ffffff) for the background. 
- **Border:** Use `none` or a 10% `outline_variant`.
- **Focus State:** On focus, apply a high-blur ambient shadow (`blur: 30px`) and a subtle transition of the border to `primary` (#000000).
- **Radius:** `rounded-full` (9999px) for search/chat inputs to mirror the organic, humanist feel.

### Buttons
- **Primary:** Background `primary` (#000000), text `on_primary` (#e5e2e1). Shape: `rounded-md` (1.5rem).
- **Secondary/Ghost:** Background `transparent`, border `outline_variant` at 20%. 
- **Interaction:** All buttons must have a `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` for hover states, slightly increasing the ambient shadow on hover.

### Cards & Content Lists
- **Layout:** Strictly forbid divider lines.
- **Separation:** Use `spacing-8` (2.75rem) between list items. For cards, use a `surface_container_low` background with `rounded-lg` (2rem) corners.

### Custom Component: The "Chat-Style" Resume Input
Reflecting the personal nature of the site, the main interaction point (as seen in reference) should be a wide, pill-shaped input field. It should sit centered with massive vertical whitespace (`spacing-24`) above it to draw the eye exclusively to the interaction.

---

## 6. Do’s and Don’ts

### Do:
- **Use Asymmetry:** Place text blocks off-center to create a dynamic, sophisticated "magazine" feel.
- **Embrace Whitespace:** If a section feels crowded, double the spacing token (e.g., move from `10` to `20`).
- **Tinted Shadows:** Always ensure shadows carry a tiny hint of the surface color to prevent a "dirty" look.

### Don't:
- **Don't use Dividers:** Never use a horizontal rule (`<hr>`) or a bottom border to separate list items.
- **Don't use Pure Blue/Red:** For "Error" states, use the `error` token (#ba1a1a) sparingly, ensuring it is framed within an `error_container` to soften its impact.
- **Don't Over-Round:** Reserve `rounded-full` for interactive inputs and buttons; use `rounded-md` or `lg` for structural containers to maintain a professional edge.