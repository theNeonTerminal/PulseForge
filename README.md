# PulseForge

A fully static site of small, fast utility tools for programming, Arduino,
ESP32, electronics, and general developer/maker work. Plain HTML, SCSS, and
vanilla JavaScript — no build framework, no backend.

## Name

**PulseForge** — "pulse" ties directly to PWM/signal-based embedded work (the
site's flagship tool is a PWM calculator), and "forge" signals a maker/builder
space for tools. Distinct from generic "ZapTools"/"DevTools"-style names.

Other names considered: ByteBench, LogicBench, EmbedLab, HexForge, VoltNest,
CodeCircuit, MakerGrid, NexaTools, CoreUtils, DevNest, BitFoundry, ToolNova,
CircuitAtlas, ByteWorks, SparkBench.

## Structure

```
pulseforge/
├── index.html              Homepage
├── styles.scss / .css      Homepage styles (compiled)
├── script.js                Homepage script (search, mobile nav)
├── shared/
│   ├── scss/                Design tokens + reusable components, imported
│   │   ├── _variables.scss     by every page's styles.scss
│   │   ├── _mixins.scss
│   │   ├── _base.scss
│   │   ├── _utilities.scss
│   │   ├── _components.scss
│   │   └── _accessibility.scss
│   └── js/
│       ├── utils.js          Clipboard copy, toast, debounce, mobile nav
│       └── accessibility.js  Floating a11y bubble + panel (all pages)
└── tools/
    ├── esp32-ledc-pwm/
    │   ├── index.html
    │   ├── styles.scss / .css
    │   └── script.js
    ├── esp32-timer-interrupt/
    │   ├── index.html
    │   ├── styles.scss / .css
    │   └── script.js
    └── esp32-gpio-reference/
        ├── index.html
        ├── styles.scss / .css
        ├── pin-data.js
        └── script.js
```

## Responsive design

Every component (navbar, hero, search, tool grid, calculator layout, examples,
accessibility panel) is built mobile-first with breakpoints at 600 / 900 /
1200 / 1440px (`shared/scss/_mixins.scss`). Notable mobile-specific behavior:

- The navbar collapses to a hamburger menu below 900px; the desktop GitHub
  button hides in favor of a GitHub entry inside that mobile menu.
- The hero's decorative circuit-trace graphic shrinks and fades further below
  600px so it never crowds the title.
- Calculator result rows, the code block header, and breadcrumbs wrap
  instead of clipping on narrow screens.
- The "copy all" button goes full-width below 600px for an easier tap target.
- The accessibility panel is `min(360px, 92vw)` wide, so it never overflows
  small phones.

## Theming

Every visual value (color, spacing, radius, font) is a CSS custom property
defined once in `shared/scss/_variables.scss`. Light/dark mode and the seven
accent colors (indigo default, red, orange, lime, green, blue, aqua) are
plain attribute selectors (`[data-color-scheme]`, `[data-accent]`) on
`<html>` — the accessibility panel just flips these attributes, so accent
changes recolor buttons, links, focus rings, card accents and nav highlights
without ever touching the page background.

## Accessibility system

`shared/js/accessibility.js` injects the floating bubble and settings panel
on every page (no markup duplication needed) and persists font size, font
family (six presets or any typed font name), cursor size, color scheme, and
accent under one `localStorage` key (`pulseforge:a11y`). The bubble is
draggable and snaps to the nearest left/right edge; its position persists too.

## Rebuilding CSS

SCSS is compiled with [Dart Sass](https://sass-lang.com/dart-sass/). From the
project root:

```bash
npm install -g sass
sass styles.scss styles.css
sass tools/esp32-ledc-pwm/styles.scss tools/esp32-ledc-pwm/styles.css
sass tools/esp32-timer-interrupt/styles.scss tools/esp32-timer-interrupt/styles.css
sass tools/esp32-gpio-reference/styles.scss tools/esp32-gpio-reference/styles.css
```

Re-run the relevant command after editing any `.scss` file — browsers can't
read Sass directly, so `styles.css` is what the HTML actually loads.

## Adding a new tool

1. Create `tools/<tool-name>/index.html`, `styles.scss`, `script.js` — copy
   the ESP32 LEDC PWM page as a starting layout (navbar → content → footer).
   Its `styles.scss` just imports the same six shared partials.
2. Compile its SCSS: `sass tools/<tool-name>/styles.scss tools/<tool-name>/styles.css`.
3. Add one `.tool-card` block to the homepage's tool grid, with a unique
   `data-tool-id` and a `data-tags` list of searchable keywords.

Everything else — layout, accessibility system, theming, search — is
inherited automatically.

For data-heavy tools (like the GPIO reference), keep the data in its own
file (e.g. `pin-data.js`) separate from the interaction logic (`script.js`),
so either can be edited without touching the other. The GPIO reference data
is sourced from Espressif's official ESP-IDF documentation and chip
datasheets; when adding more variants, verify strapping pins and reserved
ranges against the official docs rather than third-party pinout diagrams,
since these details vary in subtle, safety-relevant ways between chips.
