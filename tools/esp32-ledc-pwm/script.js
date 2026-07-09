/**
 * PulseForge — ESP32 LEDC PWM Calculator.
 *
 * LEDC frequency and resolution share one hardware timer sourced from the
 * 80 MHz APB clock, so: maxFrequency = APB_CLK / 2^resolution. This script
 * validates user input, derives the raw duty value and hardware limits, and
 * generates matching Arduino code.
 */

(function () {
  pfInitMobileNav();

  const APB_CLK = 80_000_000;

  const fields = {
    freq: document.getElementById("freq"),
    duty: document.getElementById("duty"),
    resolution: document.getElementById("resolution"),
    channel: document.getElementById("channel"),
    gpio: document.getElementById("gpio"),
  };

  const results = {
    dutyRaw: document.querySelector('[data-result="dutyRaw"]'),
    maxResAtFreq: document.querySelector('[data-result="maxResAtFreq"]'),
    maxFreqAtRes: document.querySelector('[data-result="maxFreqAtRes"]'),
    code: document.querySelector('[data-result="code"]'),
  };

  const notice = document.querySelector("[data-calc-notice]");

  const validators = {
    freq: (v) => Number.isFinite(v) && v > 0,
    duty: (v) => Number.isFinite(v) && v >= 0 && v <= 100,
    resolution: (v) => Number.isInteger(v) && v >= 1 && v <= 16,
    channel: (v) => Number.isInteger(v) && v >= 0 && v <= 15,
    gpio: (v) => Number.isInteger(v) && v >= 0 && v <= 39,
  };

  function setFieldError(name, hasError) {
    const field = fields[name].closest(".field");
    field.classList.toggle("has-error", hasError);
  }

  function readValues() {
    return {
      freq: parseFloat(fields.freq.value),
      duty: parseFloat(fields.duty.value),
      resolution: parseInt(fields.resolution.value, 10),
      channel: parseInt(fields.channel.value, 10),
      gpio: parseInt(fields.gpio.value, 10),
    };
  }

  function generateCode({ gpio, channel, freq, resolution, dutyRaw }) {
    return `const int pwmPin = ${gpio};
const int pwmChannel = ${channel};
const int frequency = ${freq};
const int resolution = ${resolution};

void setup() {
    ledcSetup(pwmChannel, frequency, resolution);
    ledcAttachPin(pwmPin, pwmChannel);
    ledcWrite(pwmChannel, ${dutyRaw});
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

    const { freq, duty, resolution, channel, gpio } = values;

    const dutyMax = Math.pow(2, resolution) - 1;
    const dutyRaw = Math.round((duty / 100) * dutyMax);
    const maxFreqAtRes = Math.round(APB_CLK / Math.pow(2, resolution));
    const maxResAtFreq = Math.max(1, Math.min(16, Math.floor(Math.log2(APB_CLK / freq))));

    results.dutyRaw.textContent = `${dutyRaw} / ${dutyMax}`;
    results.maxResAtFreq.textContent = `${maxResAtFreq} bit${maxResAtFreq === 1 ? "" : "s"}`;
    results.maxFreqAtRes.textContent = `${maxFreqAtRes} Hz`;
    results.code.textContent = generateCode({ gpio, channel, freq, resolution, dutyRaw });

    if (freq > maxFreqAtRes) {
      notice.style.display = "block";
      notice.textContent = `${freq} Hz exceeds the ~${maxFreqAtRes} Hz maximum at ${resolution}-bit resolution — the ESP32 core will automatically reduce the effective resolution to hit this frequency. Lower the resolution or the frequency for predictable duty steps.`;
    } else {
      notice.style.display = "none";
      notice.textContent = "";
    }
  }

  Object.values(fields).forEach((field) => {
    field.addEventListener("input", pfDebounce(recalculate, 80));
  });

  // --- Copy buttons ------------------------------------------------------

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const key = button.dataset.copy;
    pfWireCopyButton(button, () => results[key].textContent.trim());
  });

  const copyAllButton = document.querySelector("[data-copy-all]");
  if (copyAllButton) {
    pfWireCopyButton(copyAllButton, () => {
      return [
        `Duty value: ${results.dutyRaw.textContent.trim()}`,
        `Max resolution at this frequency: ${results.maxResAtFreq.textContent.trim()}`,
        `Max frequency at this resolution: ${results.maxFreqAtRes.textContent.trim()}`,
        "",
        results.code.textContent.trim(),
      ].join("\n");
    });
  }

  // --- Examples ------------------------------------------------------------

  document.querySelectorAll("[data-example]").forEach((card) => {
    card.addEventListener("click", () => {
      const preset = JSON.parse(card.dataset.example);
      fields.freq.value = preset.freq;
      fields.duty.value = preset.duty;
      fields.resolution.value = preset.resolution;
      fields.channel.value = preset.channel;
      fields.gpio.value = preset.gpio;
      recalculate();
      document.querySelector(".panel").scrollIntoView({ behavior: "smooth", block: "start" });
      pfShowToast(`Loaded “${card.querySelector(".example-card__title").textContent}” preset`);
    });
  });

  recalculate();
})();
