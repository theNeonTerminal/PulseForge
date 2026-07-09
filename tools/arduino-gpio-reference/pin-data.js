/**
 * PulseForge — Arduino GPIO Reference & Pin Picker pin data.
 *
 * Same idea as the ESP32 GPIO Reference tool, adapted for classic AVR-based
 * Arduino boards. Each pin object:
 *   { id, altName, output, caution, cautionNote, pwm, adc, i2cDefault,
 *     spiRole, interrupt, defaultRole, notes[] }
 *
 * `id` is the pin's Arduino-sketch name — "D5", "A0", etc. — which is also
 * what gets used verbatim (with digital pins stripped to a bare number) when
 * generating code in the Pin Composer.
 */

function mkPin(id, opts = {}) {
  return {
    id,
    altName: opts.altName || null,
    output: opts.output !== false,
    caution: !!opts.caution,
    cautionNote: opts.cautionNote || null,
    pwm: !!opts.pwm,
    adc: opts.adc || null, // { channel: n }
    i2cDefault: opts.i2cDefault || null, // "SDA" | "SCL"
    spiRole: opts.spiRole || null, // "MOSI" | "MISO" | "SCK" | "SS"
    interrupt: opts.interrupt || null, // e.g. "INT0"
    defaultRole: opts.defaultRole || null,
    notes: opts.notes || [],
  };
}

function digitalRange(start, end, opts = {}) {
  const pins = [];
  for (let n = start; n <= end; n++) pins.push(mkPin(`D${n}`, opts));
  return pins;
}

function analogRange(startChannel, count, prefix = "A") {
  const pins = [];
  for (let i = 0; i < count; i++) {
    pins.push(mkPin(`${prefix}${i}`, { adc: { channel: startChannel + i }, defaultRole: `ADC${startChannel + i}` }));
  }
  return pins;
}

// ============================================================================
// Arduino Uno / Nano (ATmega328P) — identical pinout/header layout
// ============================================================================

const UNO_PINS = [
  mkPin("D0", { caution: true, cautionNote: "Shared with the USB-serial adapter — disconnect anything on D0/D1 before uploading a new sketch.", defaultRole: "UART0 RX (default)" }),
  mkPin("D1", { caution: true, cautionNote: "Shared with the USB-serial adapter — disconnect anything on D0/D1 before uploading a new sketch.", defaultRole: "UART0 TX (default)" }),
  mkPin("D2", { interrupt: "INT0", defaultRole: "External interrupt INT0" }),
  mkPin("D3", { pwm: true, interrupt: "INT1", defaultRole: "PWM; external interrupt INT1" }),
  mkPin("D4", {}),
  mkPin("D5", { pwm: true }),
  mkPin("D6", { pwm: true }),
  mkPin("D7", {}),
  mkPin("D8", {}),
  mkPin("D9", { pwm: true }),
  mkPin("D10", { pwm: true, spiRole: "SS", defaultRole: "PWM; SPI SS (default)" }),
  mkPin("D11", { pwm: true, spiRole: "MOSI", defaultRole: "PWM; SPI MOSI (default)" }),
  mkPin("D12", { spiRole: "MISO", defaultRole: "SPI MISO (default)" }),
  mkPin("D13", { spiRole: "SCK", caution: true, cautionNote: "Drives the onboard LED — it will flicker whenever this pin toggles.", defaultRole: "SPI SCK (default); built-in LED" }),
  mkPin("A0", { adc: { channel: 0 }, defaultRole: "ADC0" }),
  mkPin("A1", { adc: { channel: 1 }, defaultRole: "ADC1" }),
  mkPin("A2", { adc: { channel: 2 }, defaultRole: "ADC2" }),
  mkPin("A3", { adc: { channel: 3 }, defaultRole: "ADC3" }),
  mkPin("A4", { adc: { channel: 4 }, i2cDefault: "SDA", defaultRole: "ADC4; I2C SDA (default)" }),
  mkPin("A5", { adc: { channel: 5 }, i2cDefault: "SCL", defaultRole: "ADC5; I2C SCL (default)" }),
];

const UNO_LAYOUT = {
  left: [
    { id: "A5" },
    { id: "A4" },
    { id: "A3" },
    { id: "A2" },
    { id: "A1" },
    { id: "A0" },
    { label: "VIN" },
    { label: "GND" },
    { label: "GND" },
    { label: "5V" },
    { label: "3V3" },
    { label: "RESET" },
    { label: "IOREF" },
    { label: "NC" },
  ],
  right: [
    { id: "D0", altLabel: "RX" },
    { id: "D1", altLabel: "TX" },
    { id: "D2" },
    { id: "D3" },
    { id: "D4" },
    { id: "D5" },
    { id: "D6" },
    { id: "D7" },
    { id: "D8" },
    { id: "D9" },
    { id: "D10" },
    { id: "D11" },
    { id: "D12" },
    { id: "D13" },
    { label: "GND" },
    { label: "AREF" },
    { label: "SDA" },
    { label: "SCL" },
  ],
};

// ============================================================================
// Arduino Pro Micro (ATmega32U4)
// ============================================================================

const PRO_MICRO_PINS = [
  mkPin("D2", { i2cDefault: "SDA", interrupt: "INT1", defaultRole: "I2C SDA (default); external interrupt INT1" }),
  mkPin("D3", { pwm: true, i2cDefault: "SCL", interrupt: "INT0", defaultRole: "PWM; I2C SCL (default); external interrupt INT0" }),
  mkPin("D4", { adc: { channel: 6 }, altName: "A6", defaultRole: "Also analog A6" }),
  mkPin("D5", { pwm: true }),
  mkPin("D6", { pwm: true, adc: { channel: 7 }, altName: "A7", defaultRole: "PWM; also analog A7" }),
  mkPin("D7", {}),
  mkPin("D8", { adc: { channel: 8 }, altName: "A8", defaultRole: "Also analog A8" }),
  mkPin("D9", { pwm: true }),
  mkPin("D10", { pwm: true, spiRole: "SS", defaultRole: "PWM; SPI SS (default)" }),
  mkPin("D14", { spiRole: "MISO", defaultRole: "SPI MISO (default)" }),
  mkPin("D15", { spiRole: "SCK", defaultRole: "SPI SCK (default)" }),
  mkPin("D16", { spiRole: "MOSI", defaultRole: "SPI MOSI (default)" }),
  mkPin("A0", { adc: { channel: 0 }, defaultRole: "ADC0" }),
  mkPin("A1", { adc: { channel: 1 }, defaultRole: "ADC1" }),
  mkPin("A2", { adc: { channel: 2 }, defaultRole: "ADC2" }),
  mkPin("A3", { adc: { channel: 3 }, defaultRole: "ADC3" }),
];

const PRO_MICRO_LAYOUT = {
  left: [
    { label: "RAW" },
    { label: "GND" },
    { label: "RST" },
    { label: "VCC" },
    { id: "A3" },
    { id: "A2" },
    { id: "A1" },
    { id: "A0" },
    { id: "D15" },
    { id: "D14" },
    { id: "D16" },
    { id: "D10" },
  ],
  right: [
    { label: "TX0" },
    { label: "RX1" },
    { label: "GND" },
    { label: "GND" },
    { id: "D2" },
    { id: "D3" },
    { id: "D4" },
    { id: "D5" },
    { id: "D6" },
    { id: "D7" },
    { id: "D8" },
    { id: "D9" },
  ],
};

// ============================================================================
// Arduino Mega 2560
// ============================================================================

const MEGA_PINS = [
  mkPin("D0", { caution: true, cautionNote: "USART0 RX — shared with USB-serial upload.", defaultRole: "UART0 RX (default)" }),
  mkPin("D1", { caution: true, cautionNote: "USART0 TX — shared with USB-serial upload.", defaultRole: "UART0 TX (default)" }),
  mkPin("D2", { pwm: true, interrupt: "INT0" }),
  mkPin("D3", { pwm: true, interrupt: "INT1" }),
  mkPin("D4", { pwm: true }),
  mkPin("D5", { pwm: true }),
  mkPin("D6", { pwm: true }),
  mkPin("D7", { pwm: true }),
  mkPin("D8", { pwm: true }),
  mkPin("D9", { pwm: true }),
  mkPin("D10", { pwm: true }),
  mkPin("D11", { pwm: true }),
  mkPin("D12", { pwm: true }),
  mkPin("D13", { pwm: true, caution: true, cautionNote: "Drives the onboard LED." }),
  mkPin("D14", { defaultRole: "UART3 TX" }),
  mkPin("D15", { defaultRole: "UART3 RX" }),
  mkPin("D16", { defaultRole: "UART2 TX" }),
  mkPin("D17", { defaultRole: "UART2 RX" }),
  mkPin("D18", { interrupt: "INT5", defaultRole: "UART1 TX" }),
  mkPin("D19", { interrupt: "INT4", defaultRole: "UART1 RX" }),
  mkPin("D20", { i2cDefault: "SDA", interrupt: "INT3", defaultRole: "I2C SDA (default)" }),
  mkPin("D21", { i2cDefault: "SCL", interrupt: "INT2", defaultRole: "I2C SCL (default)" }),
  ...digitalRange(22, 43),
  mkPin("D44", { pwm: true }),
  mkPin("D45", { pwm: true }),
  mkPin("D46", { pwm: true }),
  ...digitalRange(47, 49),
  mkPin("D50", { spiRole: "MISO", defaultRole: "SPI MISO (default)" }),
  mkPin("D51", { spiRole: "MOSI", defaultRole: "SPI MOSI (default)" }),
  mkPin("D52", { spiRole: "SCK", defaultRole: "SPI SCK (default)" }),
  mkPin("D53", { spiRole: "SS", defaultRole: "SPI SS (default)" }),
  ...analogRange(0, 16),
];

function megaLeft() {
  const items = [];
  for (let n = 15; n >= 0; n--) items.push({ id: `A${n}` });
  items.push({ label: "VIN" }, { label: "GND" }, { label: "GND" }, { label: "5V" }, { label: "3V3" }, { label: "RESET" }, { label: "IOREF" }, { label: "NC" });
  return items;
}

function megaRight() {
  const items = [];
  for (let n = 0; n <= 53; n++) items.push({ id: `D${n}` });
  items.push({ label: "GND" }, { label: "AREF" }, { label: "SDA" }, { label: "SCL" });
  return items;
}

const MEGA_LAYOUT = { left: megaLeft(), right: megaRight() };

// ============================================================================
// Arduino Pro Mini (ATmega328P, no onboard USB — programmed via FTDI header)
// ============================================================================

const PRO_MINI_PINS = [
  mkPin("D0", { caution: true, cautionNote: "Connects to the FTDI programming header's RXI — shared during upload.", defaultRole: "UART0 RX (default)" }),
  mkPin("D1", { caution: true, cautionNote: "Connects to the FTDI programming header's TXO — shared during upload.", defaultRole: "UART0 TX (default)" }),
  mkPin("D2", { interrupt: "INT0", defaultRole: "External interrupt INT0" }),
  mkPin("D3", { pwm: true, interrupt: "INT1", defaultRole: "PWM; external interrupt INT1" }),
  mkPin("D4", {}),
  mkPin("D5", { pwm: true }),
  mkPin("D6", { pwm: true }),
  mkPin("D7", {}),
  mkPin("D8", {}),
  mkPin("D9", { pwm: true }),
  mkPin("D10", { pwm: true, spiRole: "SS", defaultRole: "PWM; SPI SS (default)" }),
  mkPin("D11", { pwm: true, spiRole: "MOSI", defaultRole: "PWM; SPI MOSI (default)" }),
  mkPin("D12", { spiRole: "MISO", defaultRole: "SPI MISO (default)" }),
  mkPin("D13", { spiRole: "SCK", caution: true, cautionNote: "Drives the onboard LED.", defaultRole: "SPI SCK (default); built-in LED" }),
  mkPin("A0", { adc: { channel: 0 }, defaultRole: "ADC0" }),
  mkPin("A1", { adc: { channel: 1 }, defaultRole: "ADC1" }),
  mkPin("A2", { adc: { channel: 2 }, defaultRole: "ADC2" }),
  mkPin("A3", { adc: { channel: 3 }, defaultRole: "ADC3" }),
  mkPin("A4", { adc: { channel: 4 }, i2cDefault: "SDA", defaultRole: "ADC4; I2C SDA (default)" }),
  mkPin("A5", { adc: { channel: 5 }, i2cDefault: "SCL", defaultRole: "ADC5; I2C SCL (default)" }),
  mkPin("A6", { adc: { channel: 6 }, output: false, defaultRole: "ADC6 — analog input only, no digital I/O on this physical pin" }),
  mkPin("A7", { adc: { channel: 7 }, output: false, defaultRole: "ADC7 — analog input only, no digital I/O on this physical pin" }),
];

const PRO_MINI_LAYOUT = {
  left: [
    { id: "D1", altLabel: "TX" },
    { id: "D3", altLabel: "PWM" },
    { id: "D5", altLabel: "PWM" },
    { id: "D7" },
    { id: "D9", altLabel: "PWM" },
    { id: "D11", altLabel: "PWM" },
    { id: "D13", altLabel: "SCK/LED" },
    { label: "GND" },
    { label: "AREF" },
    { id: "A2" },
    { label: "VCC" },
    { label: "RST" },
    { label: "GND" },
    { label: "RAW" },
  ],
  right: [
    { id: "D0", altLabel: "RX" },
    { id: "D2" },
    { id: "D4", altLabel: "PWM" },
    { id: "D6", altLabel: "PWM" },
    { id: "D8" },
    { id: "D10", altLabel: "SS/PWM" },
    { id: "D12", altLabel: "MISO" },
    { id: "A0" },
    { id: "A1" },
    { id: "A3" },
    { id: "A4", altLabel: "SDA" },
    { id: "A5", altLabel: "SCL" },
    { id: "A6" },
    { id: "A7" },
  ],
};

const PRO_MINI_AUX_PINS = [
  { signal: "DTR", id: null, note: "Auto-reset line for the FTDI/USB-serial adapter — triggers a reset when a new sketch upload begins." },
  { signal: "TXO", id: "D1", note: "Board's UART TX, brought out to the programming header." },
  { signal: "RXI", id: "D0", note: "Board's UART RX, brought out to the programming header." },
  { signal: "VCC", id: null, note: "Power from the FTDI adapter (3.3V or 5V, matching your board variant)." },
  { signal: "GND", id: null, note: "Ground." },
  { signal: "GND", id: null, note: "Ground (second pin)." },
];

// ============================================================================
// Board registry
// ============================================================================

const PF_BOARDS = {
  uno: {
    id: "uno",
    image: {
      url: "https://lastminuteengineers.com/wp-content/uploads/arduino/Arduino-Pinout.png",
      alt: "Arduino Uno pinout diagram",
      credit: "Last Minute Engineers",
      creditUrl: "https://lastminuteengineers.com/",
    },
    label: "Arduino Uno",
    core: "ATmega328P, 8-bit AVR",
    notes:
      "14 digital pins (D0–D13, 6 with PWM) and 6 analog inputs (A0–A5). One hardware UART, one I2C bus (A4/A5), one SPI bus.",
    pins: UNO_PINS,
    layout: UNO_LAYOUT,
  },
  nano: {
    id: "nano",
    image: {
      url: "https://lastminuteengineers.com/wp-content/uploads/arduino/Arduino-Nano-Pinout.png",
      alt: "Arduino Nano pinout diagram",
      credit: "Last Minute Engineers",
      creditUrl: "https://lastminuteengineers.com/",
    },
    label: "Arduino Nano",
    core: "ATmega328P, 8-bit AVR",
    notes:
      "Same ATmega328P core and pin capabilities as the Uno, in a smaller breadboard-friendly form factor. 14 digital pins (D0–D13, 6 with PWM), 6 analog inputs (A0–A5).",
    pins: UNO_PINS,
    layout: UNO_LAYOUT,
  },
  promicro: {
    id: "promicro",
    image: {
      url: "https://images.theengineeringprojects.com/image/webp/2020/12/Introduction-to-Arduino-Pro-Micro-2.png.webp",
      alt: "Arduino Pro Micro pinout diagram",
      credit: "The Engineering Projects",
      creditUrl: "https://www.theengineeringprojects.com/",
    },
    label: "Arduino Pro Micro",
    core: "ATmega32U4, 8-bit AVR with native USB",
    notes:
      "Native USB (no separate USB-serial chip) — appears as a USB HID/serial device directly. D4/D6/D8 double as analog A6/A7/A8. SPI is on D14–D16 rather than D10–D13.",
    pins: PRO_MICRO_PINS,
    layout: PRO_MICRO_LAYOUT,
  },
  mega2560: {
    id: "mega2560",
    image: {
      url: "https://lastminuteengineers.com/wp-content/uploads/arduino/Arduino-Mega-2560-Pinout.png",
      alt: "Arduino Mega 2560 pinout diagram",
      credit: "Last Minute Engineers",
      creditUrl: "https://lastminuteengineers.com/",
    },
    label: "Arduino Mega 2560",
    core: "ATmega2560, 8-bit AVR",
    notes:
      "54 digital pins (D0–D53, 15 with PWM), 16 analog inputs (A0–A15), and four hardware UARTs (vs. the Uno's one) — useful when you need multiple serial devices at once.",
    pins: MEGA_PINS,
    layout: MEGA_LAYOUT,
  },
  promini: {
    id: "promini",
    image: {
      url: "https://images.theengineeringprojects.com/image/webp/2018/06/introduction-to-arduino-pro-mini-2.png.webp",
      alt: "Arduino Pro Mini pinout diagram",
      credit: "The Engineering Projects",
      creditUrl: "https://www.theengineeringprojects.com/",
    },
    label: "Arduino Pro Mini",
    core: "ATmega328P, 8-bit AVR",
    notes:
      "No onboard USB — programmed via an external FTDI/USB-serial adapter plugged into the header at the bottom. A6/A7 are analog-input-only pins (no digital I/O). Available in 3.3V/8MHz and 5V/16MHz variants.",
    pins: PRO_MINI_PINS,
    layout: PRO_MINI_LAYOUT,
    auxPins: PRO_MINI_AUX_PINS,
  },
};
