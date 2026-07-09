/**
 * PulseForge — ESP32 Battery Life Estimator.
 *
 * Models a repeating wake/sleep cycle: the chip is active (and drawing
 * `activeCurrent`) for `activeDuration` seconds, then in deep sleep
 * (drawing `sleepCurrent`) for the remainder of `wakeInterval`. The
 * time-weighted average current across one full cycle is:
 *
 *   avgCurrent = (activeCurrent * activeDuration + sleepCurrent * sleepDuration)
 *                / (activeDuration + sleepDuration)
 *
 * Estimated runtime = usableCapacity(mAh) / avgCurrent(mA), in hours.
 */

(function () {
  pfInitMobileNav();

  const TIME_UNIT_SECONDS = { ms: 1e-3, s: 1, min: 60, hr: 3600 };

  const fields = {
    activeCurrent: document.getElementById("activeCurrent"),
    activeDuration: document.getElementById("activeDuration"),
    activeDurationUnit: document.getElementById("activeDurationUnit"),
    sleepCurrent: document.getElementById("sleepCurrent"),
    wakeInterval: document.getElementById("wakeInterval"),
    wakeIntervalUnit: document.getElementById("wakeIntervalUnit"),
    batteryCapacity: document.getElementById("batteryCapacity"),
    usableCapacity: document.getElementById("usableCapacity"),
  };

  const results = {
    avgCurrent: document.querySelector('[data-result="avgCurrent"]'),
    batteryLife: document.querySelector('[data-result="batteryLife"]'),
    wakesPerDay: document.querySelector('[data-result="wakesPerDay"]'),
  };

  const notice = document.querySelector("[data-calc-notice]");
  const chartActive = document.querySelector("[data-chart-active]");
  const chartSleep = document.querySelector("[data-chart-sleep]");
  const legendActive = document.querySelector("[data-legend-active]");
  const legendSleep = document.querySelector("[data-legend-sleep]");

  const validators = {
    activeCurrent: (v) => Number.isFinite(v) && v > 0,
    activeDuration: (v) => Number.isFinite(v) && v > 0,
    sleepCurrent: (v) => Number.isFinite(v) && v >= 0,
    wakeInterval: (v) => Number.isFinite(v) && v > 0,
    batteryCapacity: (v) => Number.isFinite(v) && v > 0,
    usableCapacity: (v) => Number.isInteger(v) && v >= 1 && v <= 100,
  };

  function setFieldError(name, hasError) {
    const field = fields[name].closest(".field");
    if (field) field.classList.toggle("has-error", hasError);
  }

  function readValues() {
    return {
      activeCurrent: parseFloat(fields.activeCurrent.value),
      activeDuration: parseFloat(fields.activeDuration.value),
      activeDurationUnit: fields.activeDurationUnit.value,
      sleepCurrent: parseFloat(fields.sleepCurrent.value),
      wakeInterval: parseFloat(fields.wakeInterval.value),
      wakeIntervalUnit: fields.wakeIntervalUnit.value,
      batteryCapacity: parseFloat(fields.batteryCapacity.value),
      usableCapacity: parseInt(fields.usableCapacity.value, 10),
    };
  }

  /** Formats a duration in hours as a compact, human-friendly string. */
  function formatRuntime(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "—";
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 48) return `${hours.toFixed(1)} hours`;
    const days = hours / 24;
    if (days < 90) return `${days.toFixed(1)} days`;
    const months = days / 30.44;
    if (months < 24) return `${months.toFixed(1)} months (${days.toFixed(0)} days)`;
    const years = days / 365.25;
    return `${years.toFixed(2)} years (${days.toFixed(0)} days)`;
  }

  function compute() {
    const v = readValues();

    let allValid = true;
    for (const key of Object.keys(validators)) {
      const ok = validators[key](v[key]);
      setFieldError(key, !ok);
      if (!ok) allValid = false;
    }

    if (!allValid) {
      notice.style.display = "block";
      notice.textContent = "Fix the highlighted field(s) above to see an estimate.";
      results.avgCurrent.textContent = "—";
      results.batteryLife.textContent = "—";
      results.wakesPerDay.textContent = "—";
      return;
    }
    notice.style.display = "none";

    const activeDurationSec = v.activeDuration * TIME_UNIT_SECONDS[v.activeDurationUnit];
    const wakeIntervalSec = v.wakeInterval * TIME_UNIT_SECONDS[v.wakeIntervalUnit];

    if (activeDurationSec >= wakeIntervalSec) {
      notice.style.display = "block";
      notice.textContent =
        "Active duration is longer than (or equal to) the wake interval — the chip never actually sleeps, so it's effectively always-on.";
    }

    const sleepDurationSec = Math.max(wakeIntervalSec - activeDurationSec, 0);
    const cycleSec = activeDurationSec + sleepDurationSec;

    const activeCharge = v.activeCurrent * activeDurationSec; // mA·s
    const sleepCharge = v.sleepCurrent * sleepDurationSec; // mA·s
    const totalCharge = activeCharge + sleepCharge;
    const avgCurrent = totalCharge / cycleSec; // mA

    const usableMah = v.batteryCapacity * (v.usableCapacity / 100);
    const batteryLifeHours = usableMah / avgCurrent;

    const wakesPerDay = 86400 / cycleSec;

    results.avgCurrent.textContent = `${avgCurrent < 1 ? avgCurrent.toFixed(4) : avgCurrent.toFixed(2)} mA average`;
    results.batteryLife.textContent = formatRuntime(batteryLifeHours);
    results.wakesPerDay.textContent =
      wakesPerDay >= 1
        ? `${wakesPerDay < 10 ? wakesPerDay.toFixed(1) : Math.round(wakesPerDay)} wake-ups/day`
        : `1 wake-up every ${(1 / wakesPerDay).toFixed(1)} days`;

    // Chart: share of total *energy* (charge), not share of time.
    const activePct = totalCharge > 0 ? (activeCharge / totalCharge) * 100 : 0;
    const sleepPct = 100 - activePct;
    chartActive.style.width = `${activePct}%`;
    chartSleep.style.width = `${sleepPct}%`;
    legendActive.textContent = `Active current draw — ${activePct.toFixed(1)}%`;
    legendSleep.textContent = `Deep sleep draw — ${sleepPct.toFixed(1)}%`;

    return { avgCurrent, batteryLifeHours, wakesPerDay, v };
  }

  Object.values(fields).forEach((el) => {
    el.addEventListener("input", compute);
    el.addEventListener("change", compute);
  });

  // Presets — fill just the deep sleep current field.
  document.querySelectorAll("[data-preset-current]").forEach((btn) => {
    btn.addEventListener("click", () => {
      fields.sleepCurrent.value = btn.dataset.presetCurrent;
      compute();
      fields.sleepCurrent.closest(".field")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  // Scenarios — fill the whole form.
  document.querySelectorAll("[data-scenario]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = JSON.parse(btn.dataset.scenario);
      fields.activeCurrent.value = s.active;
      fields.activeDuration.value = s.activeDuration;
      fields.activeDurationUnit.value = s.activeDurationUnit;
      fields.sleepCurrent.value = s.sleep;
      fields.wakeInterval.value = s.wakeInterval;
      fields.wakeIntervalUnit.value = s.wakeIntervalUnit;
      fields.batteryCapacity.value = s.capacity;
      fields.usableCapacity.value = s.usable;
      compute();
      document.querySelector(".panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Copy buttons
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const key = btn.dataset.copy;
    pfWireCopyButton(btn, () => (results[key] ? results[key].textContent : ""));
  });

  pfWireCopyButton(document.querySelector("[data-copy-all]"), () => {
    const v = readValues();
    return [
      `ESP32 Battery Life Estimate`,
      `Active current: ${v.activeCurrent} mA for ${v.activeDuration} ${v.activeDurationUnit} per wake`,
      `Deep sleep current: ${v.sleepCurrent} mA`,
      `Wake interval: ${v.wakeInterval} ${v.wakeIntervalUnit}`,
      `Battery: ${v.batteryCapacity} mAh at ${v.usableCapacity}% usable`,
      `Average current: ${results.avgCurrent.textContent}`,
      `Estimated battery life: ${results.batteryLife.textContent}`,
      `Wake-ups per day: ${results.wakesPerDay.textContent}`,
    ].join("\n");
  });

  compute();
})();
