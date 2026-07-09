/**
 * PulseForge — Arduino / ESP32 Baud Rate & UART Error Calculator.
 *
 * Two divisor models:
 *  - "direct"  (ESP32/ESP8266-style): divisor = round(clock / baud)
 *              actual = clock / divisor
 *  - "avr"     (classic AVR UBRR, x16 oversampling):
 *              UBRR = round(clock / (16 * baud)) - 1   (clamped to >= 0)
 *              actual = clock / (16 * (UBRR + 1))
 *
 * error% = (actual - desired) / desired * 100
 * Safe tolerance: |error%| <= 2%
 */

(function () {
  pfInitMobileNav();

  const PRESETS = {
    "esp32-apb": { clock: 80e6, mode: "direct", label: "ESP32 APB clock (80 MHz)" },
    "esp8266": { clock: 80e6, mode: "direct", label: "ESP8266 (80 MHz)" },
    "avr-16": { clock: 16e6, mode: "avr", label: "16 MHz AVR" },
    "avr-8": { clock: 8e6, mode: "avr", label: "8 MHz AVR" },
    "avr-20": { clock: 20e6, mode: "avr", label: "20 MHz AVR" },
  };

  const mcuPreset = document.getElementById("mcuPreset");
  const customClockField = document.querySelector("[data-custom-clock-field]");
  const customClock = document.getElementById("customClock");
  const customClockUnit = document.getElementById("customClockUnit");
  const customModeField = document.querySelector("[data-custom-mode-field]");
  const customMode = document.getElementById("customMode");
  const baudRate = document.getElementById("baudRate");
  const baudPreset = document.getElementById("baudPreset");
  const dataSize = document.getElementById("dataSize");
  const dataSizeUnit = document.getElementById("dataSizeUnit");

  const results = {
    divisor: document.querySelector('[data-result="divisor"]'),
    actualBaud: document.querySelector('[data-result="actualBaud"]'),
    errorPct: document.querySelector('[data-result="errorPct"]'),
    bitTime: document.querySelector('[data-result="bitTime"]'),
    byteTime: document.querySelector('[data-result="byteTime"]'),
    transferTime: document.querySelector('[data-result="transferTime"]'),
  };
  const verdict = document.querySelector("[data-baud-verdict]");
  const notice = document.querySelector("[data-calc-notice]");

  function getClockAndMode() {
    if (mcuPreset.value === "custom") {
      const val = parseFloat(customClock.value);
      const unit = parseFloat(customClockUnit.value);
      return { clock: val * unit, mode: customMode.value };
    }
    const preset = PRESETS[mcuPreset.value];
    return { clock: preset.clock, mode: preset.mode };
  }

  function updateFieldVisibility() {
    const isCustom = mcuPreset.value === "custom";
    customClockField.style.display = isCustom ? "block" : "none";
    customModeField.style.display = isCustom ? "block" : "none";
  }

  function formatHz(hz) {
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(hz % 1e6 === 0 ? 0 : 3)} MHz`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(hz % 1e3 === 0 ? 0 : 3)} kHz`;
    return `${hz} Hz`;
  }

  /** Formats a duration given in seconds as a compact, human-friendly string. */
  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(1)} ns`;
    if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`;
    if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
    if (seconds < 60) return `${seconds.toFixed(2)} s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(2)} min`;
    return `${(seconds / 3600).toFixed(2)} hr`;
  }

  function compute() {
    const { clock, mode } = getClockAndMode();
    const desired = parseFloat(baudRate.value);

    const clockValid = Number.isFinite(clock) && clock > 0;
    const baudValid = Number.isFinite(desired) && desired > 0;

    customClock.closest(".field")?.classList.toggle("has-error", mcuPreset.value === "custom" && !clockValid);
    baudRate.closest(".field")?.classList.toggle("has-error", !baudValid);

    if (!clockValid || !baudValid) {
      notice.style.display = "block";
      notice.textContent = "Fix the highlighted field(s) above to see a result.";
      results.divisor.textContent = "—";
      results.actualBaud.textContent = "—";
      results.errorPct.textContent = "—";
      results.bitTime.textContent = "—";
      results.byteTime.textContent = "—";
      results.transferTime.textContent = "—";
      verdict.innerHTML = "";
      verdict.className = "baud-verdict";
      return;
    }
    notice.style.display = "none";

    let divisor, actualBaud, divisorLabel;

    if (mode === "avr") {
      let ubrr = Math.round(clock / (16 * desired)) - 1;
      if (ubrr < 0) ubrr = 0;
      actualBaud = clock / (16 * (ubrr + 1));
      divisor = ubrr;
      divisorLabel = `UBRR = ${ubrr}`;
    } else {
      let div = Math.round(clock / desired);
      if (div < 1) div = 1;
      actualBaud = clock / div;
      divisor = div;
      divisorLabel = `Divisor = ${div}`;
    }

    const errorPct = ((actualBaud - desired) / desired) * 100;
    const absError = Math.abs(errorPct);

    results.divisor.textContent = `${divisorLabel} (clock ${formatHz(clock)})`;
    results.actualBaud.textContent = `${actualBaud.toFixed(actualBaud % 1 === 0 ? 0 : 2)} baud`;
    results.errorPct.textContent = `${errorPct >= 0 ? "+" : ""}${errorPct.toFixed(3)}%`;

    const bitTimeSec = 1 / actualBaud;
    const byteTimeSec = bitTimeSec * 10; // 8N1: 1 start + 8 data + 1 stop
    results.bitTime.textContent = formatDuration(bitTimeSec);
    results.byteTime.textContent = formatDuration(byteTimeSec);

    const bytes = parseFloat(dataSize.value) * parseFloat(dataSizeUnit.value);
    if (Number.isFinite(bytes) && bytes > 0) {
      results.transferTime.textContent = formatDuration(bytes * byteTimeSec);
    } else {
      results.transferTime.textContent = "—";
    }

    if (absError <= 1) {
      verdict.className = "baud-verdict baud-verdict--good";
      verdict.innerHTML = `<strong>✓ Safe.</strong> Error is well within the ~2% tolerance most UARTs need for reliable 8N1 framing.`;
    } else if (absError <= 2) {
      verdict.className = "baud-verdict baud-verdict--warn";
      verdict.innerHTML = `<strong>⚠ Borderline.</strong> Error is under 2% and usually fine, but close enough that noisy wiring, long cables, or a receiver with tight timing margins could cause occasional errors.`;
    } else {
      verdict.className = "baud-verdict baud-verdict--bad";
      verdict.innerHTML = `<strong>✗ Unsafe — expect garbled data.</strong> Error exceeds the ~2% threshold most UARTs can tolerate. Try a different baud rate, or a clock speed that divides more evenly into it.`;
    }
  }

  mcuPreset.addEventListener("change", () => {
    updateFieldVisibility();
    compute();
  });
  [customClock, customClockUnit, customMode, baudRate, dataSize, dataSizeUnit].forEach((el) => {
    el.addEventListener("input", compute);
    el.addEventListener("change", compute);
  });

  baudPreset.addEventListener("change", () => {
    if (baudPreset.value) {
      baudRate.value = baudPreset.value;
      compute();
    }
  });

  document.querySelectorAll("[data-example]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ex = JSON.parse(btn.dataset.example);
      mcuPreset.value = ex.preset;
      baudRate.value = ex.baud;
      updateFieldVisibility();
      compute();
      document.querySelector(".panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const key = btn.dataset.copy;
    pfWireCopyButton(btn, () => (results[key] ? results[key].textContent : ""));
  });

  pfWireCopyButton(document.querySelector("[data-copy-all]"), () => {
    const { clock, mode } = getClockAndMode();
    return [
      `UART Baud Rate Calculation`,
      `Clock: ${formatHz(clock)} (${mode === "avr" ? "x16 oversampling / UBRR" : "direct divisor"})`,
      `Desired baud: ${baudRate.value}`,
      `${results.divisor.textContent}`,
      `Actual baud: ${results.actualBaud.textContent}`,
      `Error: ${results.errorPct.textContent}`,
      `Time per bit: ${results.bitTime.textContent}`,
      `Time per byte (8N1): ${results.byteTime.textContent}`,
      `Time to send data size: ${results.transferTime.textContent}`,
    ].join("\n");
  });

  updateFieldVisibility();
  compute();
})();
