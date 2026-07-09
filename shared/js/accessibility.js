/**
 * PulseForge — Accessibility system.
 *
 * Injects a single draggable, edge-snapping bubble + settings panel on every
 * page, and applies/persists: font size, font family (preset or custom),
 * cursor size, light/dark scheme, and accent color. All preferences are
 * stored under one localStorage key so every page shares the same state.
 */

(function () {
  const STORAGE_KEY = "pulseforge:a11y";

  const FONT_PRESETS = {
    system: { label: "System UI", value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
    arial: { label: "Arial", value: "Arial, Helvetica, sans-serif" },
    verdana: { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
    georgia: { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
    times: { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
    monospace: { label: "Monospace", value: "var(--font-mono)" },
  };

  const FONT_SIZES = {
    small: { label: "S", scale: 0.9 },
    default: { label: "M", scale: 1 },
    large: { label: "L", scale: 1.15 },
    xlarge: { label: "XL", scale: 1.3 },
  };

  const CURSOR_MODES = {
    default: { label: "Default" },
    big: { label: "Big" },
    ruler: { label: "Reading ruler" },
    mask: { label: "Reading mask" },
  };

  const ACCENTS = [
    { id: "indigo", label: "Indigo", hex: "#4f5bd5" },
    { id: "red", label: "Red", hex: "#d1373f" },
    { id: "orange", label: "Orange", hex: "#c2650a" },
    { id: "lime", label: "Lime", hex: "#5b8a11" },
    { id: "green", label: "Green", hex: "#1a7f5a" },
    { id: "blue", label: "Blue", hex: "#0969da" },
    { id: "aqua", label: "Aqua", hex: "#0f8b8d" },
  ];

  const DEFAULT_STATE = {
    fontSize: "default",
    fontFamily: "system",
    customFontValue: "",
    cursorMode: "default",
    highlightLinks: false,
    colorScheme: window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    accent: "indigo",
    bubble: { edge: "right", topPercent: 50 },
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed, bubble: { ...DEFAULT_STATE.bubble, ...(parsed.bubble || {}) } };
    } catch (err) {
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      // localStorage unavailable (private mode / quota) — fail silently,
      // preferences just won't persist across reloads.
    }
  }

  let state = loadState();

  // --- Apply state to the document --------------------------------------

  function applyState() {
    const root = document.documentElement;

    root.style.setProperty("--font-scale", FONT_SIZES[state.fontSize].scale);

    const fontValue =
      state.fontFamily === "custom"
        ? state.customFontValue || FONT_PRESETS.system.value
        : FONT_PRESETS[state.fontFamily].value;
    root.style.setProperty("--font-body", fontValue);

    document.body.classList.remove("cursor-big", "cursor-ruler-active", "cursor-mask-active");
    if (state.cursorMode === "big") document.body.classList.add("cursor-big");
    if (state.cursorMode === "ruler") document.body.classList.add("cursor-ruler-active");
    if (state.cursorMode === "mask") document.body.classList.add("cursor-mask-active");
    toggleRulerMaskListener();

    document.body.classList.toggle("highlight-links", !!state.highlightLinks);

    root.setAttribute("data-color-scheme", state.colorScheme);
    root.setAttribute("data-accent", state.accent);

    positionBubble();
  }

  // --- Reading ruler / reading mask overlays ------------------------------

  let rulerEl = null;
  let maskTopEl = null;
  let maskBottomEl = null;
  let rulerMaskListenerAttached = false;

  function ensureRulerMaskEls() {
    if (!rulerEl) {
      rulerEl = document.createElement("div");
      rulerEl.className = "a11y-reading-ruler";
      document.body.appendChild(rulerEl);
    }
    if (!maskTopEl) {
      maskTopEl = document.createElement("div");
      maskTopEl.className = "a11y-reading-mask a11y-reading-mask--top";
      document.body.appendChild(maskTopEl);
    }
    if (!maskBottomEl) {
      maskBottomEl = document.createElement("div");
      maskBottomEl.className = "a11y-reading-mask a11y-reading-mask--bottom";
      document.body.appendChild(maskBottomEl);
    }
  }

  function handlePointerMoveForOverlays(e) {
    if (state.cursorMode === "ruler" && rulerEl) {
      rulerEl.style.top = `${e.clientY}px`;
      rulerEl.style.display = "block";
    } else if (rulerEl) {
      rulerEl.style.display = "none";
    }

    if (state.cursorMode === "mask" && maskTopEl && maskBottomEl) {
      const bandHeight = 90;
      const y = e.clientY;
      maskTopEl.style.height = `${Math.max(y - bandHeight / 2, 0)}px`;
      maskTopEl.style.display = "block";
      const bottomTop = y + bandHeight / 2;
      maskBottomEl.style.top = `${bottomTop}px`;
      maskBottomEl.style.height = `${Math.max(window.innerHeight - bottomTop, 0)}px`;
      maskBottomEl.style.display = "block";
    } else {
      if (maskTopEl) maskTopEl.style.display = "none";
      if (maskBottomEl) maskBottomEl.style.display = "none";
    }
  }

  function toggleRulerMaskListener() {
    const needed = state.cursorMode === "ruler" || state.cursorMode === "mask";
    if (needed) {
      ensureRulerMaskEls();
      if (!rulerMaskListenerAttached) {
        document.addEventListener("pointermove", handlePointerMoveForOverlays);
        rulerMaskListenerAttached = true;
      }
    } else {
      if (rulerEl) rulerEl.style.display = "none";
      if (maskTopEl) maskTopEl.style.display = "none";
      if (maskBottomEl) maskBottomEl.style.display = "none";
    }
  }

  function update(partial) {
    state = { ...state, ...partial };
    saveState(state);
    applyState();
    syncPanelUI();
  }

  // --- Markup injection ----------------------------------------------------

  function buildChoiceRow(items, activeId, dataAttr, extraClass) {
    return Object.keys(items)
      .map((id) => {
        const item = items[id];
        const active = id === activeId ? " is-active" : "";
        return `<button type="button" class="a11y-choice${active}" data-${dataAttr}="${id}">${item.label}</button>`;
      })
      .join("");
  }

  function buildMarkup() {
    const overlay = document.createElement("div");
    overlay.className = "a11y-panel__overlay";
    overlay.setAttribute("data-a11y-overlay", "");

    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "a11y-bubble";
    bubble.setAttribute("aria-label", "Open accessibility settings");
    bubble.setAttribute("aria-haspopup", "dialog");
    bubble.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="4.5" r="2" fill="currentColor"/>
        <path d="M4 8.5l8-1.5 8 1.5M12 7v6m0 0l-4 8m4-8l4 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;

    const panel = document.createElement("div");
    panel.className = "a11y-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Accessibility settings");

    const accentSwatches = ACCENTS.map(
      (a) => `
      <button type="button" class="a11y-swatch${a.id === state.accent ? " is-active" : ""}" data-accent-choice="${a.id}" style="--color-swatch:${a.hex}" aria-label="${a.label} accent">
        <span class="a11y-swatch__dot"></span>
        <span class="a11y-swatch__label">${a.label}</span>
      </button>`
    ).join("");

    panel.innerHTML = `
      <div class="a11y-panel__header">
        <h2 class="a11y-panel__title">Accessibility</h2>
        <button type="button" class="btn btn--icon btn--ghost" data-a11y-close aria-label="Close accessibility settings">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="a11y-panel__body">
        <section>
          <h3 class="a11y-group__title">Font size</h3>
          <div class="a11y-choice-row" data-group="font-size">
            ${buildChoiceRow(FONT_SIZES, state.fontSize, "font-size")}
          </div>
        </section>

        <section>
          <h3 class="a11y-group__title">Font family</h3>
          <div class="a11y-choice-row a11y-choice-row--3" data-group="font-family">
            ${buildChoiceRow(FONT_PRESETS, state.fontFamily, "font-family")}
          </div>
          <input
            type="text"
            class="input a11y-font-input"
            data-custom-font
            placeholder="Or type any installed font…"
            value="${state.fontFamily === "custom" ? state.customFontValue : ""}"
            aria-label="Custom font family name"
          />
        </section>

        <section>
          <h3 class="a11y-group__title">Cursor</h3>
          <div class="a11y-choice-row a11y-choice-row--3" data-group="cursor-mode">
            ${buildChoiceRow(CURSOR_MODES, state.cursorMode, "cursor-mode")}
          </div>
        </section>

        <section>
          <h3 class="a11y-group__title">Links</h3>
          <div class="a11y-choice-row a11y-choice-row--3" data-group="highlight-links">
            <button type="button" class="a11y-choice${!state.highlightLinks ? " is-active" : ""}" data-highlight-links-choice="off">Off</button>
            <button type="button" class="a11y-choice${state.highlightLinks ? " is-active" : ""}" data-highlight-links-choice="on">Highlight links</button>
          </div>
        </section>

        <section>
          <h3 class="a11y-group__title">Color mode</h3>
          <div class="a11y-choice-row a11y-choice-row--3" data-group="color-scheme">
            <button type="button" class="a11y-choice${state.colorScheme === "light" ? " is-active" : ""}" data-color-scheme-choice="light">Light</button>
            <button type="button" class="a11y-choice${state.colorScheme === "dark" ? " is-active" : ""}" data-color-scheme-choice="dark">Dark</button>
          </div>
        </section>

        <section>
          <h3 class="a11y-group__title">Accent color</h3>
          <div class="a11y-swatch-row" data-group="accent">
            ${accentSwatches}
          </div>
        </section>

        <div class="a11y-panel__reset">
          <button type="button" class="btn btn--secondary" data-a11y-reset style="width:100%">Reset to defaults</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(bubble);
    document.body.appendChild(panel);

    return { overlay, bubble, panel };
  }

  let els = null;

  function syncPanelUI() {
    if (!els) return;
    const { panel } = els;

    panel.querySelectorAll("[data-font-size]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.fontSize === state.fontSize);
    });
    panel.querySelectorAll("[data-font-family]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.fontFamily === state.fontFamily);
    });
    panel.querySelectorAll("[data-cursor-mode]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.cursorMode === state.cursorMode);
    });
    panel.querySelectorAll("[data-highlight-links-choice]").forEach((btn) => {
      const isOn = btn.dataset.highlightLinksChoice === "on";
      btn.classList.toggle("is-active", isOn === !!state.highlightLinks);
    });
    panel.querySelectorAll("[data-color-scheme-choice]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.colorSchemeChoice === state.colorScheme);
    });
    panel.querySelectorAll("[data-accent-choice]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.accentChoice === state.accent);
    });
  }

  // --- Panel open/close ------------------------------------------------------

  function openPanel() {
    els.panel.classList.add("is-open");
    els.overlay.classList.add("is-open");
    els.bubble.setAttribute("aria-expanded", "true");
    const firstFocusable = els.panel.querySelector("button, input");
    if (firstFocusable) firstFocusable.focus({ preventScroll: true });
  }

  function closePanel() {
    els.panel.classList.remove("is-open");
    els.overlay.classList.remove("is-open");
    els.bubble.setAttribute("aria-expanded", "false");
  }

  // --- Bubble drag + edge snap -------------------------------------------

  function positionBubble() {
    if (!els) return;
    const { bubble } = els;
    const size = bubble.offsetWidth || 52;
    const margin = 16;
    const top = Math.min(
      Math.max((state.bubble.topPercent / 100) * window.innerHeight, margin),
      window.innerHeight - size - margin
    );

    bubble.style.top = `${top}px`;
    bubble.style.bottom = "auto";
    if (state.bubble.edge === "left") {
      bubble.style.left = `${margin}px`;
      bubble.style.right = "auto";
    } else {
      bubble.style.right = `${margin}px`;
      bubble.style.left = "auto";
    }
  }

  function wireDrag(bubble) {
    let dragging = false;
    let moved = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;

    bubble.addEventListener("pointerdown", (e) => {
      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      bubble.setPointerCapture(pointerId);
      bubble.classList.add("is-dragging");
    });

    bubble.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (!moved) return;

      const size = bubble.offsetWidth;
      const margin = 8;
      const x = Math.min(Math.max(e.clientX - size / 2, margin), window.innerWidth - size - margin);
      const y = Math.min(Math.max(e.clientY - size / 2, margin), window.innerHeight - size - margin);

      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
      bubble.style.right = "auto";
      bubble.style.bottom = "auto";
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      bubble.classList.remove("is-dragging");

      if (moved) {
        const rect = bubble.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const edge = centerX < window.innerWidth / 2 ? "left" : "right";
        const topPercent = (rect.top / window.innerHeight) * 100;
        update({ bubble: { edge, topPercent } });
      } else {
        openPanel();
      }
    }

    bubble.addEventListener("pointerup", endDrag);
    bubble.addEventListener("pointercancel", endDrag);
  }

  // --- Init --------------------------------------------------------------

  function init() {
    els = buildMarkup();
    applyState();

    wireDrag(els.bubble);

    els.overlay.addEventListener("click", closePanel);
    els.panel.querySelector("[data-a11y-close]").addEventListener("click", closePanel);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.panel.classList.contains("is-open")) closePanel();
    });

    els.panel.addEventListener("click", (e) => {
      const fontSizeBtn = e.target.closest("[data-font-size]");
      if (fontSizeBtn) return update({ fontSize: fontSizeBtn.dataset.fontSize });

      const fontFamilyBtn = e.target.closest("[data-font-family]");
      if (fontFamilyBtn) return update({ fontFamily: fontFamilyBtn.dataset.fontFamily });

      const cursorBtn = e.target.closest("[data-cursor-mode]");
      if (cursorBtn) return update({ cursorMode: cursorBtn.dataset.cursorMode });

      const highlightLinksBtn = e.target.closest("[data-highlight-links-choice]");
      if (highlightLinksBtn) return update({ highlightLinks: highlightLinksBtn.dataset.highlightLinksChoice === "on" });

      const schemeBtn = e.target.closest("[data-color-scheme-choice]");
      if (schemeBtn) return update({ colorScheme: schemeBtn.dataset.colorSchemeChoice });

      const accentBtn = e.target.closest("[data-accent-choice]");
      if (accentBtn) return update({ accent: accentBtn.dataset.accentChoice });

      const resetBtn = e.target.closest("[data-a11y-reset]");
      if (resetBtn) {
        state = { ...DEFAULT_STATE };
        saveState(state);
        applyState();
        rebuildPanelContent();
        return;
      }
    });

    const customFontInput = els.panel.querySelector("[data-custom-font]");
    customFontInput.addEventListener(
      "input",
      pfDebounce((e) => {
        const value = e.target.value.trim();
        if (!value) return;
        update({ fontFamily: "custom", customFontValue: value });
      }, 400)
    );

    window.addEventListener("resize", pfDebounce(positionBubble, 100));
  }

  function rebuildPanelContent() {
    els.panel.remove();
    els.overlay.remove();
    els.bubble.remove();
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
