/**
 * PulseForge — ESP32 GPIO Reference data.
 *
 * Facts here (strapping pins, reserved flash/PSRAM ranges, ADC/touch
 * mappings) are drawn from Espressif's official ESP-IDF GPIO documentation
 * and chip datasheets for each variant. Where a detail is a common Arduino
 * convention rather than a hardware-fixed default (e.g. Wire.h's default
 * SDA/SCL), that distinction is called out in the pin's notes.
 *
 * Only variants that have been verified against official documentation are
 * included. More can be added the same way later (see README).
 */

/** Builds one pin record with sensible general-purpose defaults. */
function pfPin(gpio, overrides = {}) {
  return Object.assign(
    {
      gpio,
      altName: null,
      input: true,
      output: true,
      strapping: false,
      strappingNote: null,
      reserved: false,
      reservedNote: null,
      caution: null,
      pwm: true,
      adc: null, // { unit: 1|2, channel: n }
      touch: null, // e.g. "T3"
      dac: null, // e.g. "DAC1"
      defaultRole: null,
      i2cDefault: null, // "SDA" | "SCL"
      notes: [],
    },
    overrides
  );
}

/** Builds a board's full pin array from a GPIO list + an overrides map. */
function pfBuildPins(gpioList, overridesByGpio) {
  return gpioList.map((n) => pfPin(n, overridesByGpio[n] || {}));
}

// ============================================================================
// ESP32 (original, WROOM-32 / WROVER) — Xtensa dual-core
// ============================================================================

const ESP32_GPIO = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22,
  23, 25, 26, 27, 32, 33, 34, 35, 36, 37, 38, 39,
];

const ESP32_OVERRIDES = {
  0: {
    strapping: true,
    strappingNote:
      "Must be LOW to enter UART download mode; internally pulled HIGH for normal boot. Usually wired to the BOOT button.",
    adc: { unit: 2, channel: 1 },
    touch: "T1",
    notes: ["Briefly toggles at boot on some boards — avoid driving critical outputs from it."],
  },
  1: {
    altName: "TX0",
    defaultRole: "UART0 TX (default)",
    caution: "UART0 TX — used for flashing and the serial monitor. Avoid unless you don't need USB serial.",
  },
  2: {
    strapping: true,
    strappingNote: "Must be LOW or floating to enter UART download mode.",
    adc: { unit: 2, channel: 2 },
    touch: "T2",
    notes: ["Wired to the onboard LED on many dev boards."],
  },
  3: {
    altName: "RX0",
    defaultRole: "UART0 RX (default)",
    caution: "UART0 RX — used for flashing and the serial monitor. Avoid unless you don't need USB serial.",
  },
  4: { adc: { unit: 2, channel: 0 }, touch: "T0" },
  5: {
    strapping: true,
    strappingNote: "Must be HIGH at boot — affects SDIO slave timing.",
    defaultRole: "VSPI CS0 (default)",
  },
  6: reservedFlash(),
  7: reservedFlash(),
  8: reservedFlash(),
  9: reservedFlash(),
  10: reservedFlash(),
  11: reservedFlash(),
  12: {
    strapping: true,
    strappingNote:
      "Sets flash voltage at boot: must be LOW (or floating) for standard 3.3V flash. Pulling HIGH selects 1.8V flash and will crash boards with 3.3V flash chips — the riskiest strapping pin on classic ESP32.",
    adc: { unit: 2, channel: 5 },
    touch: "T5",
    defaultRole: "HSPI MISO (default)",
  },
  13: { adc: { unit: 2, channel: 4 }, touch: "T4", defaultRole: "HSPI MOSI (default)" },
  14: {
    adc: { unit: 2, channel: 6 },
    touch: "T6",
    defaultRole: "HSPI CLK (default)",
    notes: ["Briefly outputs a signal at boot on some boards."],
  },
  15: {
    strapping: true,
    strappingNote: "Must be HIGH at boot, or ROM boot-log messages are suppressed on UART0.",
    adc: { unit: 2, channel: 3 },
    touch: "T3",
    defaultRole: "HSPI CS0 (default)",
  },
  16: {
    caution: "Reserved for PSRAM on WROVER modules — free to use on WROOM modules.",
    defaultRole: "UART2 RX (common default)",
  },
  17: {
    caution: "Reserved for PSRAM on WROVER modules — free to use on WROOM modules.",
    defaultRole: "UART2 TX (common default)",
  },
  18: { defaultRole: "VSPI CLK (default)" },
  19: { defaultRole: "VSPI MISO (default)" },
  21: { defaultRole: "I2C SDA (default Wire pin)", i2cDefault: "SDA" },
  22: { defaultRole: "I2C SCL (default Wire pin)", i2cDefault: "SCL" },
  23: { defaultRole: "VSPI MOSI (default)" },
  25: { adc: { unit: 2, channel: 8 }, dac: "DAC1" },
  26: { adc: { unit: 2, channel: 9 }, dac: "DAC2" },
  27: { adc: { unit: 2, channel: 7 }, touch: "T7" },
  32: { adc: { unit: 1, channel: 4 }, touch: "T9", notes: ["ADC1 — works fine with Wi-Fi active."] },
  33: { adc: { unit: 1, channel: 5 }, touch: "T8", notes: ["ADC1 — works fine with Wi-Fi active."] },
  34: inputOnly({ adc: { unit: 1, channel: 6 } }),
  35: inputOnly({ adc: { unit: 1, channel: 7 } }),
  36: inputOnly({ altName: "VP", adc: { unit: 1, channel: 0 }, notes: ["Low-noise ADC input — good for battery voltage sensing."] }),
  37: inputOnly({ adc: { unit: 1, channel: 1 }, notes: ["Rarely broken out on WROOM/WROVER modules."] }),
  38: inputOnly({ adc: { unit: 1, channel: 2 }, notes: ["Rarely broken out on WROOM/WROVER modules."] }),
  39: inputOnly({ altName: "VN", adc: { unit: 1, channel: 3 }, notes: ["Low-noise ADC input — good for battery voltage sensing."] }),
};

function reservedFlash() {
  return {
    reserved: true,
    reservedNote: "Connected to the module's integrated SPI flash — never use on WROOM/WROVER boards.",
    input: false,
    output: false,
    pwm: false,
  };
}

function inputOnly(extra = {}) {
  return Object.assign(
    { input: true, output: false, pwm: false, notes: ["Input only — no internal pull-up/down, cannot drive outputs."] },
    extra,
    { notes: [...(extra.notes || []), "Input only — no internal pull-up/down, cannot drive outputs."] }
  );
}

// ============================================================================
// ESP32-S3 — Xtensa dual-core, native USB
// ============================================================================

const ESP32S3_GPIO = [
  ...Array.from({ length: 22 }, (_, i) => i), // 0-21
  ...Array.from({ length: 23 }, (_, i) => i + 26), // 26-48
];

const ESP32S3_OVERRIDES = {};
ESP32S3_GPIO.forEach((n) => {
  const o = {};
  if (n >= 1 && n <= 10) o.adc = { unit: 1, channel: n - 1 };
  if (n >= 11 && n <= 20) o.adc = { unit: 2, channel: n - 11 };
  if (n >= 1 && n <= 14) o.touch = `T${n}`;
  ESP32S3_OVERRIDES[n] = o;
});
Object.assign(ESP32S3_OVERRIDES, {
  0: {
    ...ESP32S3_OVERRIDES[0],
    strapping: true,
    strappingNote: "Must be LOW to enter UART/USB download mode; internally pulled HIGH for normal boot.",
  },
  3: {
    ...ESP32S3_OVERRIDES[3],
    strapping: true,
    strappingNote: "JTAG signal source select at boot — treat as boot-sensitive even though it's rarely an issue in practice.",
  },
  8: { ...ESP32S3_OVERRIDES[8], i2cDefault: "SDA", defaultRole: "I2C SDA (common Arduino default, not a silicon fixed pin)" },
  9: { ...ESP32S3_OVERRIDES[9], i2cDefault: "SCL", defaultRole: "I2C SCL (common Arduino default, not a silicon fixed pin)" },
  19: { ...ESP32S3_OVERRIDES[19], caution: "Used for native USB (USB D-) and USB-Serial/JTAG by default." },
  20: { ...ESP32S3_OVERRIDES[20], caution: "Used for native USB (USB D+) and USB-Serial/JTAG by default." },
  26: reservedSpiPsram(),
  27: reservedSpiPsram(),
  28: reservedSpiPsram(),
  29: reservedSpiPsram(),
  30: reservedSpiPsram(),
  31: reservedSpiPsram(),
  32: reservedSpiPsram(),
  33: { caution: "Reserved for Octal PSRAM/flash on R8/R8V modules (e.g. -N8R8). Free to use on Quad-only modules." },
  34: { caution: "Reserved for Octal PSRAM/flash on R8/R8V modules. Free to use on Quad-only modules." },
  35: { caution: "Reserved for Octal PSRAM/flash on R8/R8V modules. Free to use on Quad-only modules." },
  36: { caution: "Reserved for Octal PSRAM/flash on R8/R8V modules. Free to use on Quad-only modules." },
  37: { caution: "Reserved for Octal PSRAM/flash on R8/R8V modules. Free to use on Quad-only modules." },
  43: { defaultRole: "UART0 TX (default)", caution: "Used for flashing and the serial console on most devkits." },
  44: { defaultRole: "UART0 RX (default)", caution: "Used for flashing and the serial console on most devkits." },
  45: {
    strapping: true,
    strappingNote:
      "Sets flash voltage (VDD_SPI): pull-up = 3.3V (default), pull-down = 1.8V. A mismatch can prevent boot — treat like classic ESP32's GPIO12.",
  },
  46: {
    strapping: true,
    strappingNote: "Selects ROM boot-log / JTAG source at boot.",
    input: true,
    output: false,
    pwm: false,
    notes: ["Input only on ESP32-S3."],
  },
  48: { notes: ["Wired to an onboard addressable RGB LED on some devkits (e.g. DevKitC-1)."] },
});

function reservedSpiPsram() {
  return {
    reserved: true,
    reservedNote: "Used for SPI flash/PSRAM in Quad mode — not available on modules using Quad flash or Quad PSRAM (most common S3 modules).",
    input: false,
    output: false,
    pwm: false,
  };
}

// ============================================================================
// ESP32-C3 — single-core RISC-V, no touch sensor peripheral, no DAC
// ============================================================================

const ESP32C3_GPIO = Array.from({ length: 22 }, (_, i) => i); // 0-21

const ESP32C3_OVERRIDES = {
  0: { adc: { unit: 1, channel: 0 }, notes: ["Can wake the chip from deep sleep."] },
  1: { adc: { unit: 1, channel: 1 }, notes: ["Can wake the chip from deep sleep."] },
  2: {
    strapping: true,
    strappingNote: "Boot-mode strapping pin (works together with GPIO8/GPIO9).",
    adc: { unit: 1, channel: 2 },
    notes: ["Can wake the chip from deep sleep."],
  },
  3: { adc: { unit: 1, channel: 3 }, notes: ["Can wake the chip from deep sleep."] },
  4: { adc: { unit: 1, channel: 4 }, notes: ["Can wake the chip from deep sleep."] },
  5: { adc: { unit: 2, channel: 0 }, notes: ["Can wake the chip from deep sleep."] },
  8: {
    strapping: true,
    strappingNote:
      "Controls ROM boot-log output. Also a common (non-fixed) I2C SDA default — using it for I2C risks boot interference if a device pulls it LOW at power-up.",
    i2cDefault: "SDA",
    defaultRole: "I2C SDA (common Arduino default, also a strapping pin)",
  },
  9: {
    strapping: true,
    strappingNote:
      "Primary boot-mode strapping pin: LOW at boot = download mode. Also a common (non-fixed) I2C SCL default — same caution as GPIO8.",
    i2cDefault: "SCL",
    defaultRole: "I2C SCL (common Arduino default, also a strapping pin)",
  },
  12: reservedFlashC3(),
  13: reservedFlashC3(),
  14: reservedFlashC3(),
  15: reservedFlashC3(),
  16: reservedFlashC3(),
  17: reservedFlashC3(),
  18: { caution: "Used by USB-JTAG by default; reconfiguring as plain GPIO disables the built-in USB-JTAG debug interface." },
  19: { caution: "Used by USB-JTAG by default; reconfiguring as plain GPIO disables the built-in USB-JTAG debug interface." },
  20: { defaultRole: "UART0 RX (default)" },
  21: { defaultRole: "UART0 TX (default)" },
};

function reservedFlashC3() {
  return {
    reserved: true,
    reservedNote: "Connected to the external SPI flash chip — not available on most ESP32-C3 modules.",
    input: false,
    output: false,
    pwm: false,
  };
}

// ============================================================================
// ESP32-C6 — single-core RISC-V, Wi-Fi 6 + Zigbee/Thread, no touch, no DAC
// ============================================================================

const ESP32C6_GPIO = Array.from({ length: 31 }, (_, i) => i); // 0-30

const ESP32C6_OVERRIDES = {
  0: { adc: { unit: 1, channel: 0 } },
  1: { adc: { unit: 1, channel: 1 } },
  2: { adc: { unit: 1, channel: 2 } },
  3: { adc: { unit: 1, channel: 3 } },
  4: {
    altName: "MTMS",
    strapping: true,
    strappingNote: "SDIO sampling/driving clock-edge control — rarely relevant outside JTAG-over-SDIO setups.",
    adc: { unit: 1, channel: 4 },
  },
  5: {
    altName: "MTDI",
    strapping: true,
    strappingNote: "SDIO sampling/driving clock-edge control — rarely relevant outside JTAG-over-SDIO setups.",
    adc: { unit: 1, channel: 5 },
  },
  6: { adc: { unit: 1, channel: 6 } },
  8: {
    strapping: true,
    strappingNote: "Boot-log output control; floating/pulled-up by default.",
  },
  9: {
    strapping: true,
    strappingNote: "Primary boot-mode strapping pin: LOW at boot = download mode. Wired to the BOOT button on most devkits.",
  },
  12: { caution: "Used for native USB (USB_D-) by default." },
  13: { caution: "Used for native USB (USB_D+) by default." },
  15: {
    strapping: true,
    strappingNote: "Selects JTAG signal source (only relevant once JTAG eFuses are configured).",
  },
  17: { defaultRole: "UART0 TX (common USB-serial bridge default)" },
  18: { defaultRole: "UART0 RX (common USB-serial bridge default)" },
  24: reservedFlashC6(),
  25: reservedFlashC6(),
  26: reservedFlashC6(),
  27: {
    caution: "Associated with VDD_SPI (flash voltage) on some modules — treat with the same care as a strapping pin.",
  },
  28: reservedFlashC6(),
  29: reservedFlashC6(),
  30: reservedFlashC6(),
};

function reservedFlashC6() {
  return {
    reserved: true,
    reservedNote: "Used for SPI flash — not available for other uses.",
    input: false,
    output: false,
    pwm: false,
  };
}

// ============================================================================
// ESP-WROOM-32 dev boards — 30-pin and 38-pin variants
// Same silicon as the classic ESP32 above; the pin difference is purely
// which GPIOs the specific devkit PCB breaks out to header pins.
// ============================================================================

const WROOM_38PIN_GPIO = ESP32_GPIO; // full 34-GPIO set
const WROOM_30PIN_GPIO = ESP32_GPIO; // same usable GPIO set — the 30-pin board just omits the flash test-point row (D0–D3/CMD/CLK) and a spare GND, it still breaks out GPIO16/17

// ============================================================================
// Seeed Studio XIAO ESP32-S3 — thumb-sized board, only 11 GPIOs broken out
// to castellated/header pins (silkscreened D0–D10). Same silicon as the
// generic ESP32-S3 above.
// ============================================================================

const SEEED_S3_GPIO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 43, 44];
const SEEED_S3_OVERRIDES = {};
SEEED_S3_GPIO.forEach((n) => {
  SEEED_S3_OVERRIDES[n] = { ...(ESP32S3_OVERRIDES[n] || {}) };
});
Object.assign(SEEED_S3_OVERRIDES, {
  1: { ...SEEED_S3_OVERRIDES[1], defaultRole: "Silkscreen D0 / A0" },
  2: { ...SEEED_S3_OVERRIDES[2], defaultRole: "Silkscreen D1 / A1" },
  3: { ...SEEED_S3_OVERRIDES[3], defaultRole: "Silkscreen D2 / A2" },
  4: { ...SEEED_S3_OVERRIDES[4], defaultRole: "Silkscreen D3 / A3" },
  5: { ...SEEED_S3_OVERRIDES[5], i2cDefault: "SDA", defaultRole: "Silkscreen D4 — I2C SDA (default)" },
  6: { ...SEEED_S3_OVERRIDES[6], i2cDefault: "SCL", defaultRole: "Silkscreen D5 — I2C SCL (default)" },
  7: { ...SEEED_S3_OVERRIDES[7], defaultRole: "Silkscreen D8 — SPI SCK (default)" },
  8: { ...SEEED_S3_OVERRIDES[8], defaultRole: "Silkscreen D9 — SPI MISO (default)" },
  9: { ...SEEED_S3_OVERRIDES[9], defaultRole: "Silkscreen D10 — SPI MOSI (default)" },
  10: { ...SEEED_S3_OVERRIDES[10], defaultRole: "Silkscreen D7" },
  43: { ...SEEED_S3_OVERRIDES[43], defaultRole: "Silkscreen D6 — UART0 TX (default)" },
  44: { ...SEEED_S3_OVERRIDES[44], defaultRole: "Silkscreen D7 — UART0 RX (default)" },
});

// ============================================================================
// ESP32-CAM (AI-Thinker) — ESP32 WROVER module on a camera carrier board.
// Most GPIOs are hard-wired to the OV2640 camera and/or the microSD slot,
// so only a handful remain free on the header. Camera-internal wiring is
// fixed by the board and is never user-configurable — listed separately
// below rather than as selectable header pins.
// ============================================================================

const ESP32CAM_HEADER_GPIO = [0, 1, 3, 4, 2, 12, 13, 14, 15, 16];
const ESP32CAM_OVERRIDES = {
  0: {
    ...ESP32_OVERRIDES[0],
    caution: "Also drives the camera XCLK signal — shared with the camera; also a strapping pin.",
  },
  1: { ...ESP32_OVERRIDES[1] },
  3: { ...ESP32_OVERRIDES[3] },
  2: {
    ...ESP32_OVERRIDES[2],
    caution: "Used by the microSD card (1-bit mode) when the SD slot is in use.",
  },
  4: {
    ...ESP32_OVERRIDES[4],
    caution: "Drives the onboard flash LED and is shared with the microSD card — expect it to flicker/toggle when the SD card is active.",
  },
  12: {
    ...ESP32_OVERRIDES[12],
    caution: "Shared with the microSD card (1-bit mode). Its flash-voltage strapping role still applies — be careful pulling it high at boot.",
  },
  13: { ...ESP32_OVERRIDES[13], caution: "Shared with the microSD card (1-bit mode)." },
  14: { ...ESP32_OVERRIDES[14], caution: "Shared with the microSD card (1-bit mode, CLK)." },
  15: { ...ESP32_OVERRIDES[15], caution: "Shared with the microSD card (1-bit mode, CMD)." },
  16: {
    ...ESP32_OVERRIDES[16],
    caution: "Used as the second UART (connect to an FTDI adapter to flash, since there's no onboard USB).",
  },
};

const ESP32CAM_INTERNAL_PINS = [
  { signal: "XCLK", gpio: 0, note: "Camera master clock input. Shared with a strapping pin — the board handles this internally." },
  { signal: "PCLK", gpio: 22, note: "Pixel clock from the camera." },
  { signal: "VSYNC", gpio: 25, note: "Vertical sync from the camera." },
  { signal: "HREF", gpio: 23, note: "Horizontal reference from the camera." },
  { signal: "SIOD (SDA)", gpio: 26, note: "Camera's SCCB/I2C data line — a separate bus from the header's user I2C." },
  { signal: "SIOC (SCL)", gpio: 27, note: "Camera's SCCB/I2C clock line." },
  { signal: "Y9 (D7)", gpio: 35, note: "Camera data bit 7." },
  { signal: "Y8 (D6)", gpio: 34, note: "Camera data bit 6." },
  { signal: "Y7 (D5)", gpio: 39, note: "Camera data bit 5." },
  { signal: "Y6 (D4)", gpio: 36, note: "Camera data bit 4." },
  { signal: "Y5 (D3)", gpio: 19, note: "Camera data bit 3." },
  { signal: "Y4 (D2)", gpio: 18, note: "Camera data bit 2." },
  { signal: "Y3 (D1)", gpio: 5, note: "Camera data bit 1." },
  { signal: "Y2 (D0)", gpio: 4, note: "Camera data bit 0 — also the flash LED / SD pin above." },
  { signal: "PWDN", gpio: 32, note: "Camera power-down control." },
  { signal: "RESET", gpio: -1, note: "Not connected on most AI-Thinker boards — camera reset is tied high on-module." },
];

// ============================================================================
// Seeed Studio XIAO ESP32-C3 — same 14-pin thumb form factor as the XIAO
// ESP32-S3, only 11 of the chip's 22 GPIOs are broken out (silkscreened
// D0–D10).
// ============================================================================

const XIAO_C3_GPIO = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21];
const XIAO_C3_OVERRIDES = {};
XIAO_C3_GPIO.forEach((n) => {
  XIAO_C3_OVERRIDES[n] = { ...(ESP32C3_OVERRIDES[n] || {}) };
});
Object.assign(XIAO_C3_OVERRIDES, {
  2: { ...XIAO_C3_OVERRIDES[2], defaultRole: "Silkscreen D0 / A0 — also a strapping pin" },
  3: { ...XIAO_C3_OVERRIDES[3], defaultRole: "Silkscreen D1 / A1" },
  4: { ...XIAO_C3_OVERRIDES[4], defaultRole: "Silkscreen D2 / A2" },
  5: { ...XIAO_C3_OVERRIDES[5], defaultRole: "Silkscreen D3 / A3" },
  6: { ...XIAO_C3_OVERRIDES[6], i2cDefault: "SDA", defaultRole: "Silkscreen D4 — I2C SDA (default)" },
  7: { ...XIAO_C3_OVERRIDES[7], i2cDefault: "SCL", defaultRole: "Silkscreen D5 — I2C SCL (default)" },
  8: { ...XIAO_C3_OVERRIDES[8], defaultRole: "Silkscreen D8 — strapping pin (boot-log output)" },
  9: { ...XIAO_C3_OVERRIDES[9], defaultRole: "Silkscreen D9 — connected to the BOOT button (LOW when pressed)" },
  10: { ...XIAO_C3_OVERRIDES[10], defaultRole: "Silkscreen D10" },
  20: { ...XIAO_C3_OVERRIDES[20], defaultRole: "Silkscreen D7 — UART0 RX (default)" },
  21: { ...XIAO_C3_OVERRIDES[21], defaultRole: "Silkscreen D6 — UART0 TX (default)" },
});

// ============================================================================
// Physical layouts — pin order exactly as printed on each board's silkscreen,
// used to render the interactive explorer in the same left/right positions
// as the reference photo above it. Non-GPIO pins (power/ground) are included
// as plain labels so the spacing lines up.
// ============================================================================

const PF_LAYOUTS = {
  esp32_wroom38: {
    left: [
      { label: "3V3" },
      { label: "EN" },
      { gpio: 36 },
      { gpio: 39 },
      { gpio: 34 },
      { gpio: 35 },
      { gpio: 32 },
      { gpio: 33 },
      { gpio: 25 },
      { gpio: 26 },
      { gpio: 27 },
      { gpio: 14 },
      { gpio: 12 },
      { label: "GND" },
      { gpio: 13 },
      { label: "D2 (GPIO9)", reservedGpio: 9 },
      { label: "D3 (GPIO10)", reservedGpio: 10 },
    ],
    right: [
      { label: "GND" },
      { gpio: 23 },
      { gpio: 22 },
      { gpio: 1, altLabel: "TX0" },
      { gpio: 3, altLabel: "RX0" },
      { gpio: 21 },
      { label: "GND" },
      { gpio: 19 },
      { gpio: 18 },
      { gpio: 5 },
      { gpio: 17 },
      { gpio: 16 },
      { gpio: 4 },
      { gpio: 0 },
      { gpio: 2 },
      { gpio: 15 },
      { label: "VIN" },
    ],
  },
  esp32_wroom30: {
    left: [
      { label: "3V3" },
      { gpio: 36 },
      { gpio: 39 },
      { gpio: 34 },
      { gpio: 35 },
      { gpio: 32 },
      { gpio: 33 },
      { gpio: 25 },
      { gpio: 26 },
      { gpio: 27 },
      { gpio: 14 },
      { gpio: 12 },
      { gpio: 13 },
      { label: "GND" },
      { label: "VIN" },
    ],
    right: [
      { label: "EN" },
      { gpio: 23 },
      { gpio: 22 },
      { gpio: 1, altLabel: "TX0" },
      { gpio: 3, altLabel: "RX0" },
      { gpio: 21 },
      { label: "GND" },
      { gpio: 19 },
      { gpio: 18 },
      { gpio: 5 },
      { gpio: 17 },
      { gpio: 16 },
      { gpio: 4 },
      { gpio: 2 },
      { gpio: 15 },
    ],
  },
  esp32cam: {
    left: [
      { label: "5V" },
      { label: "GND" },
      { gpio: 12 },
      { gpio: 13 },
      { gpio: 15 },
      { gpio: 14 },
      { gpio: 2 },
      { gpio: 4 },
    ],
    right: [
      { label: "3.3VDC" },
      { gpio: 16 },
      { gpio: 0 },
      { label: "GND" },
      { label: "VCC OUT" },
      { gpio: 3 },
      { gpio: 1 },
      { label: "GND" },
    ],
  },
  esp32s3seeed: {
    left: [
      { label: "5V" },
      { label: "3V3" },
      { gpio: 1, altLabel: "D0" },
      { gpio: 2, altLabel: "D1" },
      { gpio: 3, altLabel: "D2" },
      { gpio: 4, altLabel: "D3" },
      { gpio: 5, altLabel: "D4/SDA" },
    ],
    right: [
      { label: "GND" },
      { gpio: 9, altLabel: "D10" },
      { gpio: 8, altLabel: "D9" },
      { gpio: 7, altLabel: "D8" },
      { gpio: 44, altLabel: "D7" },
      { gpio: 43, altLabel: "D6" },
      { gpio: 6, altLabel: "D5/SCL" },
    ],
  },
  esp32c3xiao: {
    left: [
      { label: "5V" },
      { label: "3V3" },
      { gpio: 2, altLabel: "D0" },
      { gpio: 3, altLabel: "D1" },
      { gpio: 4, altLabel: "D2" },
      { gpio: 5, altLabel: "D3" },
      { gpio: 6, altLabel: "D4/SDA" },
    ],
    right: [
      { label: "GND" },
      { gpio: 10, altLabel: "D10" },
      { gpio: 9, altLabel: "D9" },
      { gpio: 8, altLabel: "D8" },
      { gpio: 20, altLabel: "D7" },
      { gpio: 21, altLabel: "D6" },
      { gpio: 7, altLabel: "D5/SCL" },
    ],
  },
  esp32c3supermini: {
    left: [
      { label: "5V" },
      { label: "GND" },
      { label: "3V3" },
      { gpio: 4 },
      { gpio: 3 },
      { gpio: 2 },
      { gpio: 1 },
      { gpio: 0 },
    ],
    right: [
      { gpio: 5, altLabel: "MISO" },
      { gpio: 6, altLabel: "SCK" },
      { gpio: 7, altLabel: "MOSI" },
      { gpio: 8 },
      { gpio: 9 },
      { gpio: 10, altLabel: "CS" },
      { gpio: 20, altLabel: "RX" },
      { gpio: 21, altLabel: "TX" },
    ],
  },
};

// ============================================================================
// Board registry
// ============================================================================

// ============================================================================
// ESP32-C3 Super Mini — ultra-compact generic dev board (not a Seeed
// product), 13 GPIOs broken out with different default SPI/UART pin
// assignments than the XIAO ESP32-C3 above.
// ============================================================================

const C3_SUPERMINI_GPIO = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21];
const C3_SUPERMINI_OVERRIDES = {};
C3_SUPERMINI_GPIO.forEach((n) => {
  C3_SUPERMINI_OVERRIDES[n] = { ...(ESP32C3_OVERRIDES[n] || {}) };
});
Object.assign(C3_SUPERMINI_OVERRIDES, {
  4: { ...C3_SUPERMINI_OVERRIDES[4], defaultRole: "Recommended I2C SDA (no dedicated I2C pins on this board)" },
  5: { ...C3_SUPERMINI_OVERRIDES[5], defaultRole: "Default SPI MISO; also recommended I2C SCL" },
  6: { ...C3_SUPERMINI_OVERRIDES[6], defaultRole: "Default SPI SCK" },
  7: { ...C3_SUPERMINI_OVERRIDES[7], defaultRole: "Default SPI MOSI" },
  10: { ...C3_SUPERMINI_OVERRIDES[10], defaultRole: "Default SPI CS" },
  20: { ...C3_SUPERMINI_OVERRIDES[20], defaultRole: "UART0 RX (default)" },
  21: { ...C3_SUPERMINI_OVERRIDES[21], defaultRole: "UART0 TX (default)" },
});

const PF_BOARDS = {
  esp32_wroom38: {
    id: "esp32_wroom38",
    image: {
      url: "https://www.upesy.com/cdn/shop/files/doc-esp32-pinout-reference-wroom-devkit.png?width=692",
      alt: "ESP32-WROOM-32 38-pin devkit pinout diagram",
      credit: "uPesy",
      creditUrl: "https://www.upesy.com/",
    },
    label: "ESP-WROOM-32 (38-pin)",
    core: "Xtensa dual-core",
    hasTouch: true,
    hasDac: true,
    hasAdc2: true,
    notes:
      "38-pin devkit — the wider board with both header rows fully populated, including GPIO16/17. GPIO6–11 are never available (integrated flash); GPIO37/38 exist on the bare chip but are rarely broken out.",
    pins: pfBuildPins(WROOM_38PIN_GPIO, ESP32_OVERRIDES),
    layout: PF_LAYOUTS.esp32_wroom38,
  },
  esp32_wroom30: {
    id: "esp32_wroom30",
    image: {
      url: "https://cdn.shopify.com/s/files/1/0870/0021/9940/files/ESP32-30PIN-DEVBOARD-PINOUT.png?v=1772243497",
      alt: "ESP32 30-pin devkit pinout diagram",
      credit: "the board manufacturer (via Shopify CDN)",
      creditUrl: "https://cdn.shopify.com/s/files/1/0870/0021/9940/files/ESP32-30PIN-DEVBOARD-PINOUT.png?v=1772243497",
    },
    label: "ESP-WROOM-32 (30-pin)",
    core: "Xtensa dual-core",
    hasTouch: true,
    hasDac: true,
    hasAdc2: true,
    notes:
      "30-pin devkit — the narrower board. It still breaks out the same GPIO set as the 38-pin board (including GPIO16/17); it just omits the flash test-point row (D0–D3/CMD/CLK, never usable anyway) and has VIN instead of a second 5V/GND pair.",
    pins: pfBuildPins(WROOM_30PIN_GPIO, ESP32_OVERRIDES),
    layout: PF_LAYOUTS.esp32_wroom30,
  },
  esp32cam: {
    id: "esp32cam",
    image: {
      url: "https://i0.wp.com/dronebotworkshop.com/wp-content/uploads/2020/05/ESP32-CAM-pinouts.jpeg?w=768&ssl=1",
      alt: "ESP32-CAM (AI-Thinker) pinout diagram",
      credit: "DroneBot Workshop",
      creditUrl: "https://dronebotworkshop.com/",
    },
    label: "ESP32-CAM (AI-Thinker)",
    core: "Xtensa dual-core",
    hasTouch: false,
    hasDac: false,
    hasAdc2: false,
    notes:
      "Header pins only — most GPIOs on this WROVER-based module are hard-wired to the onboard OV2640 camera and microSD slot. See the camera-internal pin map below the explorer for the fixed camera wiring.",
    pins: pfBuildPins(ESP32CAM_HEADER_GPIO, ESP32CAM_OVERRIDES),
    camPins: ESP32CAM_INTERNAL_PINS,
    layout: PF_LAYOUTS.esp32cam,
  },
  esp32s3seeed: {
    id: "esp32s3seeed",
    image: {
      url: "https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/2.jpg",
      alt: "Seeed Studio XIAO ESP32-S3 pinout diagram",
      credit: "Seeed Studio",
      creditUrl: "https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/",
    },
    label: "Seeed Studio XIAO ESP32-S3",
    core: "Xtensa dual-core + native USB",
    hasTouch: true,
    hasDac: false,
    hasAdc2: true,
    notes:
      "Thumb-sized board — only 11 of the ESP32-S3's GPIOs are broken out to header/castellated pads (silkscreened D0–D10). Same silicon and strapping behavior as the generic ESP32-S3.",
    pins: pfBuildPins(SEEED_S3_GPIO, SEEED_S3_OVERRIDES),
    layout: PF_LAYOUTS.esp32s3seeed,
  },
  esp32s3: {
    id: "esp32s3",
    image: {
      url: "https://mischianti.org/wp-content/uploads/2023/08/vcc-gnd-studio-yd-esp32-s3-devkitc-1-clone-pinout-mischianti-low-resolution-1-1024x560.jpg.webp",
      alt: "YD-ESP32-S3 DevKitC-1 clone pinout diagram",
      credit: "Renzo Mischianti (mischianti.org)",
      creditUrl: "https://mischianti.org/",
    },
    label: "ESP32-S3",
    core: "Xtensa dual-core + native USB",
    hasTouch: true,
    hasDac: false,
    hasAdc2: true,
    notes:
      "45 GPIOs (GPIO0–21, GPIO26–48; GPIO22–25 don't exist). Reserved ranges depend on your module's flash/PSRAM mode (Quad vs Octal) — check your specific module's datasheet. Note: the explorer below lists every GPIO the chip has, ordered by number — it doesn't mirror the exact left/right header positions of the specific DevKitC-1 clone pictured above, since header layout varies by board vendor.",
    pins: pfBuildPins(ESP32S3_GPIO, ESP32S3_OVERRIDES),
  },
  esp32c3xiao: {
    id: "esp32c3xiao",
    image: {
      url: "https://forum.seeedstudio.com/uploads/default/optimized/2X/9/96d54945575d63e62df19a60f4c47e3048c6f5ce_2_517x291.png",
      alt: "Seeed Studio XIAO ESP32-C3 pinout diagram",
      credit: "Seeed Studio Forum",
      creditUrl: "https://forum.seeedstudio.com/",
    },
    label: "XIAO ESP32-C3",
    core: "RISC-V single-core",
    hasTouch: false,
    hasDac: false,
    hasAdc2: true,
    notes:
      "Thumb-sized board — only 11 of the ESP32-C3's 22 GPIOs are broken out to header/castellated pads (silkscreened D0–D10), same 14-pin footprint as the XIAO ESP32-S3.",
    pins: pfBuildPins(XIAO_C3_GPIO, XIAO_C3_OVERRIDES),
    layout: PF_LAYOUTS.esp32c3xiao,
  },
  esp32c3supermini: {
    id: "esp32c3supermini",
    image: {
      url: "https://mischianti.org/wp-content/uploads/2025/07/ESP32-C3-Super-Mini-pinout-low-1024x440.jpg.webp",
      alt: "ESP32-C3 Super Mini pinout diagram",
      credit: "Renzo Mischianti (mischianti.org)",
      creditUrl: "https://mischianti.org/",
    },
    label: "ESP32 C3 Super Mini",
    core: "RISC-V single-core",
    hasTouch: false,
    hasDac: false,
    hasAdc2: true,
    notes:
      "Generic ultra-compact C3 board (not a Seeed product) — 13 GPIOs broken out, 8 per side. Different default SPI (SCK=6, MOSI=7, MISO=5, CS=10) and UART0 (TX=21, RX=20) pin assignments than the XIAO ESP32-C3. No dedicated I2C pins — GPIO4 (SDA) / GPIO5 (SCL) are the commonly recommended pair.",
    pins: pfBuildPins(C3_SUPERMINI_GPIO, C3_SUPERMINI_OVERRIDES),
    layout: PF_LAYOUTS.esp32c3supermini,
  },
  esp32c6: {
    id: "esp32c6",
    label: "ESP32-C6",
    core: "RISC-V single-core + Wi-Fi 6 / Zigbee / Thread",
    hasTouch: false,
    hasDac: false,
    hasAdc2: false,
    notes:
      "31 GPIOs (GPIO0–30). Single ADC unit only (7 channels, GPIO0–6) — no ADC2. No capacitive touch peripheral and no DAC on this chip family.",
    pins: pfBuildPins(ESP32C6_GPIO, ESP32C6_OVERRIDES),
  },
};
