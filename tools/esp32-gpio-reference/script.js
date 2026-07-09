/**
 * PulseForge — ESP32 GPIO Reference & Pin Picker.
 *
 * Renders the selected board's pins as two "rail" columns of clickable
 * chips, shows a full profile for whichever pin is selected, and can
 * highlight pins matching a quick scenario (safe output, Wi-Fi-safe ADC,
 * I2C defaults, touch). All pin facts come from pin-data.js.
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

  let currentBoardId = "esp32_wroom38";
  let selectedGpio = null;
  let activeScenario = null;

  const SCENARIOS = {
    output: {
      label: "General-purpose output",
      predicate: (pin) => pin.output && !pin.reserved && !pin.strapping && !pin.caution,
    },
    adc: {
      label: "Analog input, Wi-Fi safe",
      predicate: (pin) => pin.adc && pin.adc.unit === 1,
    },
    i2c: {
      label: "I2C default pins",
      predicate: (pin) => !!pin.i2cDefault,
    },
    spi: {
      label: "SPI / VSPI default pins",
      predicate: (pin) => !!(pin.defaultRole && /spi/i.test(pin.defaultRole)),
    },
    touch: {
      label: "Capacitive touch",
      predicate: (pin) => !!pin.touch,
      requiresTouch: true,
    },
  };

  function chipClasses(pin) {
    const classes = ["pin-chip"];
    if (pin.reserved) classes.push("is-reserved");
    else if (pin.strapping) classes.push("is-strapping");
    else if (pin.caution) classes.push("is-caution");
    else if (!pin.output) classes.push("is-input-only");
    return classes.join(" ");
  }

  function renderPins(board) {
    railA.innerHTML = "";
    railB.innerHTML = "";

    if (board.layout) {
      renderLayoutRail(railA, board.layout.left, board);
      renderLayoutRail(railB, board.layout.right, board);
      return;
    }

    // Fallback for boards without a known physical layout: just split the
    // GPIO list in half, sorted by number (not physically accurate).
    const mid = Math.ceil(board.pins.length / 2);
    const railAPins = board.pins.slice(0, mid);
    const railBPins = board.pins.slice(mid);

    [
      [railA, railAPins],
      [railB, railBPins],
    ].forEach(([rail, pins]) => {
      pins.forEach((pin) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = chipClasses(pin);
        chip.dataset.gpio = pin.gpio;
        chip.innerHTML = `GPIO${pin.gpio}${pin.altName ? `<span class="pin-chip__alt">${pin.altName}</span>` : ""}`;
        chip.addEventListener("click", () => selectPin(board, pin.gpio));
        rail.appendChild(chip);
      });
    });
  }

  /** Renders one physical rail (left or right column) from a layout array,
   *  mixing clickable GPIO chips with plain power/ground/reserved labels,
   *  in the exact top-to-bottom order printed on the board's silkscreen. */
  function renderLayoutRail(rail, layoutItems, board) {
    layoutItems.forEach((item) => {
      if (item.gpio !== undefined) {
        const pin = board.pins.find((p) => p.gpio === item.gpio);
        if (!pin) return; // shouldn't happen if layout matches board.pins
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = chipClasses(pin);
        chip.dataset.gpio = pin.gpio;
        chip.innerHTML = `GPIO${pin.gpio}${item.altLabel ? `<span class="pin-chip__alt">${item.altLabel}</span>` : ""}`;
        chip.addEventListener("click", () => selectPin(board, pin.gpio));
        rail.appendChild(chip);
      } else {
        // Non-GPIO pin (power, ground, EN, or a reserved flash test point) —
        // shown for physical reference but not clickable/selectable.
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
    if (pin.reserved) {
      outputText = "No — reserved";
      outputTone = "no";
    } else if (!pin.output) {
      outputText = "No — input only";
      outputTone = "no";
    } else if (pin.strapping) {
      outputText = "Caution — boot-sensitive";
      outputTone = "caution";
    } else if (pin.caution) {
      outputText = "Caution — shared/default use";
      outputTone = "caution";
    } else {
      outputText = "Yes";
      outputTone = "yes";
    }
    lines.push(["Safe for output?", outputText, outputTone]);

    lines.push(["PWM (LEDC) capable?", pin.pwm ? "Yes" : "No", pin.pwm ? "yes" : "no"]);

    let adcText;
    let adcTone;
    if (pin.adc) {
      adcText = `ADC${pin.adc.unit} CH${pin.adc.channel}`;
      if (pin.adc.unit === 2) {
        adcText += " — unusable while Wi-Fi is active";
        adcTone = "caution";
      } else {
        adcTone = "yes";
      }
    } else {
      adcText = "Not ADC-capable";
      adcTone = "no";
    }
    lines.push(["ADC channel?", adcText, adcTone]);

    lines.push([
      "I2C default?",
      pin.i2cDefault ? `Default ${pin.i2cDefault}` : "No fixed default",
      pin.i2cDefault ? "yes" : "no",
    ]);

    let touchText;
    let touchTone;
    if (!board.hasTouch) {
      touchText = "N/A — chip has no touch peripheral";
      touchTone = "no";
    } else if (pin.touch) {
      touchText = `Yes — ${pin.touch}`;
      touchTone = "yes";
    } else {
      touchText = "No";
      touchTone = "no";
    }
    lines.push(["Touch capable?", touchText, touchTone]);

    if (pin.dac) lines.push(["DAC?", pin.dac, "yes"]);
    if (pin.defaultRole) lines.push(["Default role", pin.defaultRole, null]);

    return lines;
  }

  function selectPin(board, gpio) {
    selectedGpio = gpio;
    const pin = board.pins.find((p) => p.gpio === gpio);

    document.querySelectorAll(".pin-chip").forEach((chip) => {
      chip.classList.toggle("is-selected", Number(chip.dataset.gpio) === gpio);
    });

    const rows = describePin(board, pin)
      .map(
        ([label, value, tone]) =>
          `<div class="pin-detail__row"><span class="pin-detail__label">${label}</span>${fieldValue(value, tone)}</div>`
      )
      .join("");

    const bootRestriction = pin.strappingNote || pin.reservedNote;
    const notesHtml =
      bootRestriction || pin.notes.length
        ? `<div class="pin-detail__notes">
            ${bootRestriction ? `<strong>Boot restrictions:</strong> ${bootRestriction}` : "<strong>Boot restrictions:</strong> None known."}
            ${pin.notes.length ? `<ul>${pin.notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
          </div>`
        : `<div class="pin-detail__notes"><strong>Boot restrictions:</strong> None known.</div>`;

    detailPanel.innerHTML = `
      <div class="pin-detail__title">GPIO${pin.gpio}${pin.altName ? ` <span class="text-muted" style="font-size:0.75rem;">(${pin.altName})</span>` : ""}</div>
      ${rows}
      ${notesHtml}
      <button type="button" class="btn btn--secondary btn--sm" data-copy-pin style="margin-top: var(--space-4); width:100%;">Copy summary</button>
    `;

    const copyBtn = detailPanel.querySelector("[data-copy-pin]");
    pfWireCopyButton(copyBtn, () => {
      const summaryLines = describePin(board, pin).map(([label, value]) => `${label} ${value}`);
      return [
        `${board.label} — GPIO${pin.gpio}${pin.altName ? ` (${pin.altName})` : ""}`,
        ...summaryLines,
        `Boot restrictions: ${bootRestriction || "None known."}`,
        ...pin.notes,
      ].join("\n");
    });

    updateFloatingDetailState();
  }

  // ==========================================================================
  // Mobile bottom-sheet behavior for the pin detail panel.
  //
  // On narrow screens, the detail panel normally sits below the pin rails in
  // the document flow (so you'd have to scroll past the rails to see it).
  // Instead, once a pin is selected AND the pin-selector area is substantially
  // in view (roughly 70%+ visible), the panel floats as a fixed sheet
  // covering the bottom of the screen. Scrolling away from the pin selector
  // (e.g. down to the board image/other sections) drops it back into normal
  // document flow. Desktop is unaffected — this only applies below the `lg`
  // breakpoint.
  // ==========================================================================

  const mobileFloatQuery =
    typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 899px)") : { matches: false, addEventListener: null, addListener: null };
  const pinsContainer = document.querySelector("[data-pins-container]");
  let pinsContainerVisibleEnough = false;

  function updateFloatingDetailState() {
    if (!detailPanel) return;
    const shouldFloat = mobileFloatQuery.matches && selectedGpio !== null && pinsContainerVisibleEnough;
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

    if (scenario.requiresTouch && !board.hasTouch) {
      clearScenarioHighlight();
      scenarioNotice.style.display = "block";
      scenarioNotice.textContent = `${board.label} has no capacitive touch peripheral — try an ESP-WROOM-32 or ESP32-S3 board for touch pins.`;
      clearScenarioBtn.style.display = "inline-flex";
      return;
    }

    activeScenario = scenarioId;
    let matchCount = 0;

    document.querySelectorAll(".pin-chip").forEach((chip) => {
      const gpio = Number(chip.dataset.gpio);
      const pin = board.pins.find((p) => p.gpio === gpio);
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

  const camSection = document.querySelector("[data-cam-pins-section]");
  const camList = document.querySelector("[data-cam-pins-list]");

  function renderCamPins(board) {
    if (!camSection || !camList) return;
    if (!board.camPins) {
      camSection.hidden = true;
      camList.innerHTML = "";
      return;
    }
    camSection.hidden = false;
    camList.innerHTML = board.camPins
      .map(
        (p) => `
        <div class="pin-detail__row">
          <span class="pin-detail__label">${p.signal}</span>
          <span class="pin-detail__value">${p.gpio === -1 ? "Not connected" : `GPIO${p.gpio}`}</span>
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
    renderCamPins(board);
    renderBoardDiagram(board);
    clearScenarioHighlight();
    populateComposerSelect(board);
    composerPins = [];
    renderComposer();

    selectedGpio = null;
    detailPanel.innerHTML = '<p class="text-muted">Click a GPIO on the left to see its full profile.</p>';
    detailPanel.classList.remove("gpio-explorer__detail--floating");
  }

  // ==========================================================================
  // Pin composer — pick pins, name them, set input/output, generate bare code.
  // ==========================================================================

  let composerPins = []; // { gpio, varName, mode }

  const composerSelect = document.querySelector("[data-composer-select]");
  const composerAddBtn = document.querySelector("[data-composer-add]");
  const composerRows = document.querySelector("[data-composer-rows]");
  const composerEmpty = document.querySelector("[data-composer-empty]");
  const composerCodeEl = document.querySelector("[data-composer-code]");
  const composerCopyBtn = document.querySelector("[data-composer-copy]");

  function populateComposerSelect(board) {
    if (!composerSelect) return;
    composerSelect.innerHTML = board.pins
      .filter((p) => p.gpio !== undefined)
      .map((p) => `<option value="${p.gpio}">GPIO${p.gpio}${p.defaultRole ? ` — ${p.defaultRole}` : ""}</option>`)
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
          <span class="composer__row-pin">GPIO${row.gpio}</span>
          <input class="input composer__row-name" type="text" value="${row.varName}" data-composer-name="${idx}" aria-label="Variable name for GPIO${row.gpio}" />
          <select class="select composer__row-mode" data-composer-mode="${idx}" aria-label="Mode for GPIO${row.gpio}">
            <option value="OUTPUT" ${row.mode === "OUTPUT" ? "selected" : ""}>Output</option>
            <option value="INPUT" ${row.mode === "INPUT" ? "selected" : ""}>Input</option>
            <option value="INPUT_PULLUP" ${row.mode === "INPUT_PULLUP" ? "selected" : ""}>Input (pull-up)</option>
          </select>
          <button class="btn btn--secondary btn--sm" type="button" data-composer-remove="${idx}" aria-label="Remove GPIO${row.gpio}">Remove</button>
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

    const declarations = composerPins.map((row) => `const int ${row.varName} = ${row.gpio};`).join("\n");
    const pinModes = composerPins.map((row) => `  pinMode(${row.varName}, ${row.mode});`).join("\n");

    composerCodeEl.textContent = `${declarations}\n\nvoid setup() {\n${pinModes}\n}\n\nvoid loop() {\n\n}`;
  }

  composerAddBtn?.addEventListener("click", () => {
    if (!composerSelect || !composerSelect.value) return;
    const gpio = parseInt(composerSelect.value, 10);
    if (composerPins.some((r) => r.gpio === gpio)) return; // already added
    composerPins.push({
      gpio,
      varName: sanitizeVarName(`pin${gpio}`, `pin${gpio}`),
      mode: "OUTPUT",
    });
    renderComposer();
  });

  composerRows?.addEventListener("input", (e) => {
    const nameIdx = e.target.getAttribute("data-composer-name");
    if (nameIdx !== null) {
      composerPins[nameIdx].varName = sanitizeVarName(e.target.value, `pin${composerPins[nameIdx].gpio}`);
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
