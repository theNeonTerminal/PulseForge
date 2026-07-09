/**
 * PulseForge — Arduino GPIO Reference & Pin Picker.
 *
 * Same interaction model as the ESP32 GPIO Reference tool: two rail columns
 * of clickable pin chips (plus non-interactive power/ground labels), a full
 * profile panel for the selected pin, quick scenarios, and a pin composer
 * that generates a bare Arduino sketch skeleton. All facts come from
 * pin-data.js.
 */

(function () {
  pfInitMobileNav();

  const railA = document.querySelector('[data-rail="a"]');
  const railB = document.querySelector('[data-rail="b"]');
  const detailPanel = document.querySelector("[data-pin-detail]");
  const boardNote = document.querySelector("[data-board-note]");
  const tabs = Array.from(document.querySelectorAll("[data-board]"));
  const scenarioButtons = Array.from(document.querySelectorAll("[data-scenario]"));
  const scenarioNotice = document.querySelector("[data-scenario-notice]");
  const clearScenarioBtn = document.querySelector("[data-clear-scenario]");

  let currentBoardId = "uno";
  let selectedPinId = null;
  let activeScenario = null;

  const SCENARIOS = {
    output: {
      label: "General-purpose output",
      predicate: (pin) => pin.output && !pin.caution,
    },
    pwm: {
      label: "PWM-capable",
      predicate: (pin) => !!pin.pwm,
    },
    adc: {
      label: "Analog input",
      predicate: (pin) => !!pin.adc,
    },
    i2c: {
      label: "I2C default pins",
      predicate: (pin) => !!pin.i2cDefault,
    },
    spi: {
      label: "SPI default pins",
      predicate: (pin) => !!pin.spiRole,
    },
  };

  function chipClasses(pin) {
    const classes = ["pin-chip"];
    if (pin.caution) classes.push("is-caution");
    else if (!pin.output) classes.push("is-input-only");
    return classes.join(" ");
  }

  function renderPins(board) {
    railA.innerHTML = "";
    railB.innerHTML = "";
    renderLayoutRail(railA, board.layout.left, board);
    renderLayoutRail(railB, board.layout.right, board);
  }

  /** Renders one physical rail (left or right column) from a layout array,
   *  mixing clickable pin chips with plain power/ground labels, in the
   *  exact top-to-bottom order printed on the board's silkscreen. */
  function renderLayoutRail(rail, layoutItems, board) {
    layoutItems.forEach((item) => {
      if (item.id !== undefined) {
        const pin = board.pins.find((p) => p.id === item.id);
        if (!pin) return;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = chipClasses(pin);
        chip.dataset.pinId = pin.id;
        chip.innerHTML = `${pin.id}${item.altLabel ? `<span class="pin-chip__alt">${item.altLabel}</span>` : ""}`;
        chip.addEventListener("click", () => selectPin(board, pin.id));
        rail.appendChild(chip);
      } else {
        const el = document.createElement("div");
        el.className = "pin-slot-label";
        el.textContent = item.label;
        rail.appendChild(el);
      }
    });
  }

  function fieldValue(text, tone) {
    const cls = tone ? ` pin-detail__value--${tone}` : "";
    return `<span class="pin-detail__value${cls}">${text}</span>`;
  }

  function describePin(board, pin) {
    const lines = [];

    let outputText;
    let outputTone;
    if (!pin.output) {
      outputText = "No — analog input only";
      outputTone = "no";
    } else if (pin.caution) {
      outputText = "Caution — shared/default use";
      outputTone = "caution";
    } else {
      outputText = "Yes";
      outputTone = "yes";
    }
    lines.push(["Safe for output?", outputText, outputTone]);

    lines.push(["PWM capable?", pin.pwm ? "Yes" : "No", pin.pwm ? "yes" : "no"]);

    lines.push([
      "ADC channel?",
      pin.adc ? `ADC channel ${pin.adc.channel}` : "Not ADC-capable",
      pin.adc ? "yes" : "no",
    ]);

    lines.push([
      "I2C default?",
      pin.i2cDefault ? `Default ${pin.i2cDefault}` : "No fixed default",
      pin.i2cDefault ? "yes" : "no",
    ]);

    lines.push([
      "SPI default?",
      pin.spiRole ? `Default ${pin.spiRole}` : "No fixed default",
      pin.spiRole ? "yes" : "no",
    ]);

    if (pin.interrupt) lines.push(["External interrupt?", pin.interrupt, "yes"]);
    if (pin.defaultRole) lines.push(["Default role", pin.defaultRole, null]);

    return lines;
  }

  function selectPin(board, pinId) {
    selectedPinId = pinId;
    const pin = board.pins.find((p) => p.id === pinId);

    document.querySelectorAll(".pin-chip").forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.pinId === pinId);
    });

    const rows = describePin(board, pin)
      .map(
        ([label, value, tone]) =>
          `<div class="pin-detail__row"><span class="pin-detail__label">${label}</span>${fieldValue(value, tone)}</div>`
      )
      .join("");

    const notesHtml = pin.cautionNote
      ? `<div class="pin-detail__notes"><strong>Caution:</strong> ${pin.cautionNote}</div>`
      : "";

    detailPanel.innerHTML = `
      <div class="pin-detail__title">${pin.id}${pin.altName ? ` <span class="text-muted" style="font-size:0.75rem;">(${pin.altName})</span>` : ""}</div>
      ${rows}
      ${notesHtml}
      <button type="button" class="btn btn--secondary btn--sm" data-copy-pin style="margin-top: var(--space-4); width:100%;">Copy summary</button>
    `;

    const copyBtn = detailPanel.querySelector("[data-copy-pin]");
    pfWireCopyButton(copyBtn, () => {
      const summaryLines = describePin(board, pin).map(([label, value]) => `${label} ${value}`);
      return [
        `${board.label} — ${pin.id}${pin.altName ? ` (${pin.altName})` : ""}`,
        ...summaryLines,
        ...(pin.cautionNote ? [`Caution: ${pin.cautionNote}`] : []),
      ].join("\n");
    });

    updateFloatingDetailState();
  }

  // ==========================================================================
  // Mobile bottom-sheet behavior for the pin detail panel (see the ESP32
  // GPIO Reference tool for the full rationale — identical mechanism here).
  // ==========================================================================

  const mobileFloatQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 899px)")
      : { matches: false, addEventListener: null, addListener: null };
  const pinsContainer = document.querySelector("[data-pins-container]");
  let pinsContainerVisibleEnough = false;

  function updateFloatingDetailState() {
    if (!detailPanel) return;
    const shouldFloat = mobileFloatQuery.matches && selectedPinId !== null && pinsContainerVisibleEnough;
    detailPanel.classList.toggle("gpio-explorer__detail--floating", shouldFloat);
  }

  if (pinsContainer && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          pinsContainerVisibleEnough = entry.intersectionRatio >= 0.7;
        });
        updateFloatingDetailState();
      },
      { threshold: [0, 0.3, 0.5, 0.7, 0.9, 1] }
    );
    observer.observe(pinsContainer);
  }

  if (mobileFloatQuery.addEventListener) {
    mobileFloatQuery.addEventListener("change", updateFloatingDetailState);
  } else if (mobileFloatQuery.addListener) {
    mobileFloatQuery.addListener(updateFloatingDetailState);
  }

  function clearScenarioHighlight() {
    activeScenario = null;
    document.querySelectorAll(".pin-chip").forEach((chip) => {
      chip.classList.remove("is-match", "is-dimmed");
    });
    scenarioNotice.style.display = "none";
    clearScenarioBtn.style.display = "none";
  }

  function applyScenario(scenarioId, board) {
    const scenario = SCENARIOS[scenarioId];
    activeScenario = scenarioId;
    let matchCount = 0;

    document.querySelectorAll(".pin-chip").forEach((chip) => {
      const pin = board.pins.find((p) => p.id === chip.dataset.pinId);
      if (!pin) return;
      const isMatch = scenario.predicate(pin);
      chip.classList.toggle("is-match", isMatch);
      chip.classList.toggle("is-dimmed", !isMatch);
      if (isMatch) matchCount += 1;
    });

    scenarioNotice.style.display = "block";
    scenarioNotice.textContent = `${matchCount} pin${matchCount === 1 ? "" : "s"} match "${scenario.label}" on ${board.label}.`;
    clearScenarioBtn.style.display = "inline-flex";
  }

  const auxSection = document.querySelector("[data-aux-pins-section]");
  const auxList = document.querySelector("[data-aux-pins-list]");

  function renderAuxPins(board) {
    if (!auxSection || !auxList) return;
    if (!board.auxPins) {
      auxSection.hidden = true;
      auxList.innerHTML = "";
      return;
    }
    auxSection.hidden = false;
    auxList.innerHTML = board.auxPins
      .map(
        (p) => `
        <div class="pin-detail__row">
          <span class="pin-detail__label">${p.signal}</span>
          <span class="pin-detail__value">${p.id ? `Same net as ${p.id}` : "Dedicated header pin"}</span>
        </div>
        <p class="text-muted" style="margin: 0 0 var(--space-3); font-size: 0.875rem;">${p.note}</p>
      `
      )
      .join("");
  }

  const diagramImg = document.querySelector("[data-board-diagram-img]");
  const diagramCredit = document.querySelector("[data-board-diagram-credit]");

  function renderBoardDiagram(board) {
    if (!diagramImg) return;
    if (board.image) {
      diagramImg.src = board.image.url;
      diagramImg.alt = board.image.alt;
      diagramImg.closest("figure").hidden = false;
      if (diagramCredit) {
        diagramCredit.textContent = board.image.credit;
        diagramCredit.href = board.image.creditUrl;
      }
    } else if (diagramImg.closest("figure")) {
      diagramImg.closest("figure").hidden = true;
    }
  }

  function renderBoard(boardId) {
    currentBoardId = boardId;
    const board = PF_BOARDS[boardId];

    boardNote.textContent = board.notes;
    renderPins(board);
    renderAuxPins(board);
    renderBoardDiagram(board);
    clearScenarioHighlight();
    populateComposerSelect(board);
    composerPins = [];
    renderComposer();

    selectedPinId = null;
    detailPanel.innerHTML = '<p class="text-muted">Click a pin on the left to see its full profile.</p>';
    detailPanel.classList.remove("gpio-explorer__detail--floating");
  }

  // ==========================================================================
  // Pin composer — pick pins, name them, set input/output, generate bare code.
  // ==========================================================================

  let composerPins = []; // { id, varName, mode }

  const composerSelect = document.querySelector("[data-composer-select]");
  const composerAddBtn = document.querySelector("[data-composer-add]");
  const composerRows = document.querySelector("[data-composer-rows]");
  const composerEmpty = document.querySelector("[data-composer-empty]");
  const composerCodeEl = document.querySelector("[data-composer-code]");
  const composerCopyBtn = document.querySelector("[data-composer-copy]");

  /** Converts a pin id into the literal Arduino sketches would actually use:
   *  "D5" -> 5 (bare digital pin number), "A3" -> "A3" (a real Arduino macro). */
  function arduinoPinLiteral(id) {
    const m = /^D(\d+)$/.exec(id);
    return m ? m[1] : id;
  }

  function populateComposerSelect(board) {
    if (!composerSelect) return;
    composerSelect.innerHTML = board.pins
      .filter((p) => /^[DA]\d+$/.test(p.id))
      .map((p) => `<option value="${p.id}">${p.id}${p.defaultRole ? ` — ${p.defaultRole}` : ""}</option>`)
      .join("");
  }

  function sanitizeVarName(raw, fallback) {
    let v = (raw || "").trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (!v || /^[0-9]/.test(v)) v = fallback;
    return v;
  }

  function renderComposer() {
    if (!composerRows) return;

    if (composerPins.length === 0) {
      composerEmpty.style.display = "block";
      composerRows.querySelectorAll(".composer__row").forEach((el) => el.remove());
    } else {
      composerEmpty.style.display = "none";
      composerRows.querySelectorAll(".composer__row").forEach((el) => el.remove());

      composerPins.forEach((row, idx) => {
        const el = document.createElement("div");
        el.className = "composer__row";
        el.innerHTML = `
          <span class="composer__row-pin">${row.id}</span>
          <input class="input composer__row-name" type="text" value="${row.varName}" data-composer-name="${idx}" aria-label="Variable name for ${row.id}" />
          <select class="select composer__row-mode" data-composer-mode="${idx}" aria-label="Mode for ${row.id}">
            <option value="OUTPUT" ${row.mode === "OUTPUT" ? "selected" : ""}>Output</option>
            <option value="INPUT" ${row.mode === "INPUT" ? "selected" : ""}>Input</option>
            <option value="INPUT_PULLUP" ${row.mode === "INPUT_PULLUP" ? "selected" : ""}>Input (pull-up)</option>
          </select>
          <button class="btn btn--secondary btn--sm" type="button" data-composer-remove="${idx}" aria-label="Remove ${row.id}">Remove</button>
        `;
        composerRows.appendChild(el);
      });
    }

    generateComposerCode();
  }

  function generateComposerCode() {
    if (!composerCodeEl) return;
    if (composerPins.length === 0) {
      composerCodeEl.textContent = "// Add pins above to generate code.";
      return;
    }

    const declarations = composerPins.map((row) => `const int ${row.varName} = ${arduinoPinLiteral(row.id)};`).join("\n");
    const pinModes = composerPins.map((row) => `  pinMode(${row.varName}, ${row.mode});`).join("\n");

    composerCodeEl.textContent = `${declarations}\n\nvoid setup() {\n${pinModes}\n}\n\nvoid loop() {\n\n}`;
  }

  composerAddBtn?.addEventListener("click", () => {
    if (!composerSelect || !composerSelect.value) return;
    const id = composerSelect.value;
    if (composerPins.some((r) => r.id === id)) return; // already added
    composerPins.push({
      id,
      varName: sanitizeVarName(`pin${id}`, `pin${id}`),
      mode: "OUTPUT",
    });
    renderComposer();
  });

  composerRows?.addEventListener("input", (e) => {
    const nameIdx = e.target.getAttribute("data-composer-name");
    if (nameIdx !== null) {
      composerPins[nameIdx].varName = sanitizeVarName(e.target.value, `pin${composerPins[nameIdx].id}`);
      generateComposerCode();
    }
  });

  composerRows?.addEventListener("change", (e) => {
    const modeIdx = e.target.getAttribute("data-composer-mode");
    if (modeIdx !== null) {
      composerPins[modeIdx].mode = e.target.value;
      generateComposerCode();
    }
  });

  composerRows?.addEventListener("click", (e) => {
    const removeIdx = e.target.getAttribute("data-composer-remove");
    if (removeIdx !== null) {
      composerPins.splice(parseInt(removeIdx, 10), 1);
      renderComposer();
    }
  });

  if (composerCopyBtn) {
    pfWireCopyButton(composerCopyBtn, () => composerCodeEl.textContent);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      renderBoard(tab.dataset.board);
    });
  });

  scenarioButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyScenario(btn.dataset.scenario, PF_BOARDS[currentBoardId]);
    });
  });

  clearScenarioBtn.addEventListener("click", clearScenarioHighlight);

  renderBoard(currentBoardId);
})();
