/**
 * PulseForge — ESP32 Timer Interrupt Calculator.
 *
 * ESP32 hardware timers are clocked from the 80 MHz APB bus through a
 * 16-bit prescaler: tickFrequency = 80,000,000 / prescaler. The alarm
 * value is the number of ticks to count before the timer fires, so:
 * alarmValue = round(intervalSeconds * tickFrequency). This script solves
 * that in both directions and generates matching timerBegin()/timerAlarm()
 * code for the current (v3+) Arduino-ESP32 core.
 */

(function () {
  pfInitMobileNav();

  const APB_CLK = 80_000_000;
  const UNIT_SECONDS = { us: 1e-6, ms: 1e-3, s: 1 };

  const fields = {
    intervalValue: document.getElementById("intervalValue"),
    intervalUnit: document.getElementById("intervalUnit"),
    prescaler: document.getElementById("prescaler"),
    autoreload: document.getElementById("autoreload"),
  };

  const results = {
    tickFreq: document.querySelector('[data-result="tickFreq"]'),
    alarmValue: document.querySelector('[data-result="alarmValue"]'),
    actualInterval: document.querySelector('[data-result="actualInterval"]'),
    code: document.querySelector('[data-result="code"]'),
  };

  const notice = document.querySelector("[data-calc-notice]");

  const validators = {
    intervalValue: (v) => Number.isFinite(v) && v > 0,
    prescaler: (v) => Number.isInteger(v) && v >= 1 && v <= 65535,
  };

  function setFieldError(name, hasError) {
    const field = fields[name].closest(".field");
    field.classList.toggle("has-error", hasError);
  }

  function readValues() {
    return {
      intervalValue: parseFloat(fields.intervalValue.value),
      intervalUnit: fields.intervalUnit.value,
      prescaler: parseInt(fields.prescaler.value, 10),
      autoreload: fields.autoreload.checked,
    };
  }

  /** Formats a duration in seconds as a compact, human-friendly string. */
  function formatDuration(seconds) {
    const round = (n, d) => parseFloat(n.toFixed(d));
    if (seconds < 1e-6) return `${round(seconds * 1e9, 2)} ns`;
    if (seconds < 1e-3) return `${round(seconds * 1e6, 3)} µs`;
    if (seconds < 1) return `${round(seconds * 1e3, 3)} ms`;
    return `${round(seconds, 6)} s`;
  }

  function generateCode({ tickFreq, alarmValue, autoreload }) {
    const reload = autoreload ? "true" : "false";
    return `hw_timer_t *timer = NULL;

void IRAM_ATTR onTimer() {
    // Your interrupt code here (keep it short!)
}

void setup() {
    timer = timerBegin(${tickFreq});          // ${tickFreq} Hz tick rate (80 MHz / prescaler ${fields.prescaler.value})
    timerAttachInterrupt(timer, &onTimer);
    timerAlarm(timer, ${alarmValue}, ${reload}, 0); // ${alarmValue} ticks, auto-reload ${reload}, repeat forever
}

void loop() {

}`;
  }

  function recalculate() {
    const values = readValues();
    let allValid = true;

    Object.keys(validators).forEach((name) => {
      const isValid = validators[name](values[name]);
      setFieldError(name, !isValid);
      if (!isValid) allValid = false;
    });

    if (!allValid) {
      notice.style.display = "block";
      notice.textContent = "Fix the highlighted fields above to see results.";
      return;
    }

    const { intervalValue, intervalUnit, prescaler, autoreload } = values;
    const intervalSeconds = intervalValue * UNIT_SECONDS[intervalUnit];

    const tickFreq = Math.round(APB_CLK / prescaler);
    const tickPeriodSeconds = 1 / tickFreq;
    const alarmValue = Math.round(intervalSeconds * tickFreq);
    const actualSeconds = alarmValue * tickPeriodSeconds;
    const errorPct = (Math.abs(actualSeconds - intervalSeconds) / intervalSeconds) * 100;

    results.tickFreq.textContent = `${tickFreq} Hz (1 tick every ${formatDuration(tickPeriodSeconds)})`;
    results.alarmValue.textContent = `${alarmValue}`;
    results.actualInterval.textContent =
      errorPct < 0.001
        ? `${formatDuration(actualSeconds)} (exact)`
        : `${formatDuration(actualSeconds)} (off by ${errorPct.toFixed(2)}% from requested)`;
    results.code.textContent = generateCode({ tickFreq, alarmValue, autoreload });

    if (alarmValue < 10) {
      notice.style.display = "block";
      notice.textContent = `Only ${alarmValue} tick${alarmValue === 1 ? "" : "s"} per interval — that's coarse timing resolution. Lower the prescaler for a higher tick frequency and finer control.`;
    } else if (errorPct >= 0.5) {
      notice.style.display = "block";
      notice.textContent = `This prescaler can't hit ${intervalValue}${intervalUnit} exactly — the closest match is ${formatDuration(actualSeconds)} (${errorPct.toFixed(2)}% off). Try a prescaler that divides 80,000,000 more evenly for this interval.`;
    } else {
      notice.style.display = "none";
      notice.textContent = "";
    }
  }

  fields.intervalValue.addEventListener("input", pfDebounce(recalculate, 80));
  fields.intervalUnit.addEventListener("change", recalculate);
  fields.prescaler.addEventListener("input", pfDebounce(recalculate, 80));
  fields.autoreload.addEventListener("change", recalculate);

  // --- Suggest prescaler ---------------------------------------------------
  // Heuristic: sub-100µs intervals get a fast 10 MHz tick (prescaler 8) for
  // fine resolution; everything else gets a clean 1 MHz, 1µs tick (prescaler 80).
  const suggestButton = document.querySelector("[data-suggest-prescaler]");
  if (suggestButton) {
    suggestButton.addEventListener("click", () => {
      const value = parseFloat(fields.intervalValue.value);
      const unit = fields.intervalUnit.value;
      if (!Number.isFinite(value) || value <= 0) return;

      const seconds = value * UNIT_SECONDS[unit];
      fields.prescaler.value = seconds < 100e-6 ? 8 : 80;
      recalculate();
      pfShowToast("Prescaler updated");
    });
  }

  // --- Copy buttons ------------------------------------------------------

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const key = button.dataset.copy;
    pfWireCopyButton(button, () => results[key].textContent.trim());
  });

  const copyAllButton = document.querySelector("[data-copy-all]");
  if (copyAllButton) {
    pfWireCopyButton(copyAllButton, () => {
      return [
        `Timer tick frequency: ${results.tickFreq.textContent.trim()}`,
        `Alarm value (ticks): ${results.alarmValue.textContent.trim()}`,
        `Actual interval achieved: ${results.actualInterval.textContent.trim()}`,
        "",
        results.code.textContent.trim(),
      ].join("\n");
    });
  }

  // --- Examples ------------------------------------------------------------

  document.querySelectorAll("[data-example]").forEach((card) => {
    card.addEventListener("click", () => {
      const preset = JSON.parse(card.dataset.example);
      fields.intervalValue.value = preset.value;
      fields.intervalUnit.value = preset.unit;
      fields.prescaler.value = preset.prescaler;
      fields.autoreload.checked = preset.autoreload;
      recalculate();
      document.querySelector(".panel").scrollIntoView({ behavior: "smooth", block: "start" });
      pfShowToast(`Loaded “${card.querySelector(".example-card__title").textContent}” preset`);
    });
  });

  recalculate();
})();
