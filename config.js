// LCR Digital Dash configurator — product data.
//
// Everything a customer sees about platforms, sensors and channels comes from
// this file. Edit here, not in app.js. Sources for each claim:
//   carb  : Mustang-Digital-Dash (Mega 2560 firmware + WIRING_GUIDE.md), LCR-EDGE-
//   holley: RosettaCan defs/protocols/holley_hefi_racepak (+ protocol.overlay.yaml)
//   e38   : lcr-h3-rpi-dash-build/CAN_SIGNAL_MAP.md (H3 LS3 crate + PSI harness)
//
// Support tiers shown to customers:
//   "proven"    — shown as "Standard". Internal rule: only options that have
//                 run on a real vehicle. Customer wording stays capability-based.
//   "build"     — shown as "Configured to order" (range / pulses set at build)
//   "calibrate" — shown as "Custom calibration" (we match the sender curve)
window.LCR_CONFIG = {
  shop: {
    name: "Lost Control Racing",
    // Where finished build sheets go. Leave "" to show the copy-and-send sheet.
    // Any endpoint that accepts a JSON POST works (Formspree, Getform, your own).
    orderEndpoint: "",
    // Shown as plain text on the confirmation step. Fill in before launch.
    email: "shoplostcontrolracing@gmail.com",
    phone: "",
  },

  // null = "Request a quote". Set a number (USD) to show a price.
  pricing: {
    carb: 1399,
    holley: 1399,
    e38: 1399,
    customArtwork: null, // nameplate / logo / custom gauge faces
  },

  platforms: {
    carb: {
      label: "Carb / Analog",
      tagline: "No ECU needed. We read your senders directly.",
      proof: "Works with the senders you already run",
      bus: "LCR sensor module (Arduino Mega class) → LCR Edge dash, 20 Hz",
      summary:
        "For carbureted and non-networked engines. An LCR sensor module wires to your tach signal, VSS and analog senders, conditions every input, and feeds the dash. You choose the sensors; we set the ranges before it ships.",
      // Each input: options[0] is the default. tier per option.
      inputs: [
        { id: "tach", label: "Tach signal", options: [
          { v: "Coil negative / ignition box tach output — V8", tier: "proven" },
          { v: "Coil negative / tach output — 4 or 6 cyl", tier: "build" },
        ]},
        { id: "vss", label: "Vehicle speed", options: [
          { v: "Electronic VSS pulse sender (Dakota Digital SEN-01-5)", tier: "proven" },
          { v: "Transmission VSS output — pulses/mile set at build", tier: "build" },
          { v: "No speed input", tier: "proven" },
        ]},
        { id: "oilp", label: "Oil pressure", options: [
          { v: "0–100 psi, 0.5–4.5 V sensor", tier: "proven" },
          { v: "0–150 psi, 0.5–4.5 V sensor", tier: "build" },
          { v: "None", tier: "proven" },
        ]},
        { id: "fuelp", label: "Fuel pressure", options: [
          { v: "0–30 psi, 0.5–4.5 V sensor (carb)", tier: "proven" },
          { v: "0–100 psi, 0.5–4.5 V sensor (EFI / return style)", tier: "build" },
          { v: "None", tier: "proven" },
        ]},
        { id: "clt", label: "Coolant temp", options: [
          { v: "Dakota Digital resistive sender", tier: "proven" },
          { v: "Other resistive sender (tell us the part #)", tier: "calibrate" },
        ]},
        { id: "oilt", label: "Oil temp", options: [
          { v: "None", tier: "proven" },
          { v: "Dakota Digital resistive sender", tier: "proven" },
          { v: "Other resistive sender (tell us the part #)", tier: "calibrate" },
        ]},
        { id: "fuel", label: "Fuel level sender", options: [
          { v: "GM 0–90 Ω", tier: "proven" },
          { v: "Ford 73–10 Ω", tier: "calibrate" },
          { v: "Universal 240–33 Ω", tier: "calibrate" },
          { v: "None", tier: "proven" },
        ]},
        { id: "afr", label: "Wideband AFR", options: [
          { v: "14Point7 Spartan 3 Lite, 0–5 V output", tier: "proven" },
          { v: "Other wideband with 0–5 V output (AEM, Innovate…)", tier: "build" },
          { v: "None", tier: "proven" },
        ]},
        { id: "boost", label: "Boost / vacuum", options: [
          { v: "None", tier: "proven" },
          { v: "ProSport gauge analog output", tier: "proven" },
          { v: "0.5–4.5 V MAP sensor (1/2/3 bar) — set at build", tier: "build" },
        ]},
        { id: "n2o", label: "Nitrous bottle pressure", options: [
          { v: "None", tier: "proven" },
          { v: "0–1600 psi, 0.5–4.5 V sensor", tier: "proven" },
        ]},
      ],
      included: ["Battery volts", "Turn signals", "High beam", "Check engine", "Parking brake", "Odometer (saved across key cycles)"],
      // Channels a customer may assign to the four round gauges.
      gauges: ["oilp", "clt", "volts", "fuel", "fuelp", "oilt", "afr", "boost", "n2o"],
    },

    holley: {
      label: "Holley EFI",
      tagline: "Terminator X / Dominator over the Racepak CAN port.",
      proof: "Native Holley CAN — no extra senders",
      bus: "Holley CAN (Racepak port) · 1 Mbps · 29-bit extended IDs",
      summary:
        "Plugs into the Holley CAN network and reads what the ECU already knows — no extra senders for anything Holley is measuring. Works with Terminator X, Terminator X Max and Dominator; we confirm your channel list when we set up your build.",
      // Channels decoded from the Holley HEFI stream. "proven" = on the decoded
      // runtime path; "build" = defined in the protocol, confirmed at install.
      channels: [
        { id: "rpm", v: "Engine RPM", tier: "proven" },
        { id: "clt", v: "Coolant temp", tier: "proven" },
        { id: "oilp", v: "Oil pressure", tier: "proven" },
        { id: "map", v: "MAP / boost", tier: "proven" },
        { id: "afr", v: "AFR (left bank)", tier: "proven" },
        { id: "afrt", v: "Target AFR", tier: "proven" },
        { id: "timing", v: "Ignition timing", tier: "proven" },
        { id: "iat", v: "Manifold air temp", tier: "proven" },
        { id: "gear", v: "Transmission gear", tier: "proven" },
        { id: "tps", v: "Throttle position", tier: "build" },
        { id: "speed", v: "Vehicle speed", tier: "build" },
        { id: "volts", v: "Battery volts", tier: "build" },
        { id: "fuelp", v: "Fuel pressure", tier: "build" },
        { id: "afrr", v: "AFR (right bank)", tier: "build" },
        { id: "knock", v: "Knock retard", tier: "build" },
        { id: "duty", v: "Injector duty cycle", tier: "build" },
        { id: "boostt", v: "Target boost", tier: "build" },
        { id: "linep", v: "Trans line pressure / temp", tier: "build" },
      ],
      ecuChoices: ["Terminator X", "Terminator X Max", "Dominator"],
      extras: [
        { id: "fuel", label: "Fuel level", note: "Tank level isn't in the Holley CAN stream we read — add an LCR sender input", options: [
          { v: "GM 0–90 Ω sender via LCR input", tier: "proven" },
          { v: "Other sender (tell us the part #)", tier: "calibrate" },
          { v: "None", tier: "proven" },
        ]},
      ],
      gauges: ["oilp", "clt", "volts", "map", "afr", "fuelp", "iat", "fuel"],
    },

    e38: {
      label: "GM Gen 4 LS · E38",
      tagline: "LS3 / Gen 4 crate swaps on a PSI-style standalone harness.",
      proof: "Made for LS3 crate engines on PSI-style harnesses",
      bus: "GM high-speed CAN · 500 kbps · 11-bit, with OBD2 polling fallback",
      summary:
        "Reads the E38's own broadcast — RPM, coolant, oil pressure, speed and PRNDL — straight off the harness data link. Setup includes a quick scan of your vehicle's data network, and speed is calibrated to your gears and tires.",
      channels: [
        { id: "rpm", v: "Engine RPM", tier: "proven" },
        { id: "clt", v: "Coolant temp", tier: "proven" },
        { id: "oilp", v: "Oil pressure", tier: "proven" },
        { id: "speed", v: "Vehicle speed (calibrated to your gear + tire)", tier: "proven" },
        { id: "gear", v: "PRNDL / gear (GM electronic trans on the bus)", tier: "proven" },
        { id: "volts", v: "Charging volts (read by the dash)", tier: "proven" },
        { id: "fuel", v: "Fuel level — PCM broadcast where your sender is wired to it", tier: "build" },
        { id: "obd", v: "Anything not broadcast: OBD2 PID polling", tier: "build" },
      ],
      ecuChoices: ["E38 (LS3 / L99 / L92 crate)", "E67 (LS2 / LY / LMG)", "Not sure — we'll check"],
      extras: [
        { id: "trans", label: "Transmission", options: [
          { v: "GM electronic 4L60E / 4L70E / 6L80 (PRNDL on bus)", tier: "proven" },
          { v: "Manual or non-electronic trans (no PRNDL)", tier: "proven" },
        ]},
        { id: "tire", label: "Speed calibration", note: "We calibrate speed to your setup at install", options: [
          { v: "I'll send axle ratio + tire size", tier: "proven" },
          { v: "Stock gearing and tire size", tier: "proven" },
        ]},
      ],
      gauges: ["oilp", "clt", "volts", "fuel"],
    },
  },

  // Round-gauge faces the Blue Lightning artwork can draw.
  gaugeFaces: {
    oilp:  { label: "OIL",       unit: "PSI", min: 0,   max: 100, ticks: [0, 25, 50, 75, 100] },
    clt:   { label: "WATER",     unit: "°F",  min: 100, max: 260, ticks: [100, 140, 180, 220, 260] },
    volts: { label: "VOLTS",     unit: "V",   min: 8,   max: 18,  ticks: [8, 10, 12, 14, 18] },
    fuel:  { label: "FUEL LEVEL",unit: "",    min: 0,   max: 100, ticks: ["E", "¼", "½", "¾", "F"] },
    fuelp: { label: "FUEL PRESS",unit: "PSI", min: 0,   max: 60,  ticks: [0, 15, 30, 45, 60] },
    oilt:  { label: "OIL TEMP",  unit: "°F",  min: 100, max: 300, ticks: [100, 150, 200, 250, 300] },
    afr:   { label: "AFR",       unit: "A/F", min: 10,  max: 18,  ticks: [10, 12, 14, 16, 18] },
    boost: { label: "BOOST",     unit: "PSI", min: -20, max: 30,  ticks: [-20, -10, 0, 15, 30] },
    map:   { label: "BOOST",     unit: "PSI", min: -15, max: 30,  ticks: [-15, 0, 10, 20, 30] },
    iat:   { label: "IAT",       unit: "°F",  min: 0,   max: 250, ticks: [0, 60, 125, 190, 250] },
    n2o:   { label: "NITROUS",   unit: "PSI", min: 0,   max: 1600,ticks: [0, 400, 800, 1200, 1600] },
  },

  // Real LCR artwork. Geometry is in each image's native pixels.
  themes: {
    carbon: {
      label: "Carbon Pro",
      note: "Carbon-fiber race cluster. Faces are fixed: oil, water, volts, nitrous.",
      src: "assets/carbon-pro.jpg", w: 1968, h: 799,
      customFaces: false,
      tach: { cx: 1026, cy: 367, len: 183, a0: 225, a1: -45, max: 10 },
      gauges: [
        { key: "oilp",  cx: 280,  cy: 438, len: 89, min: 0,   max: 100 },
        { key: "clt",   cx: 574,  cy: 432, len: 91, min: 100, max: 260 },
        { key: "volts", cx: 1483, cy: 433, len: 90, min: 8,   max: 18 },
        { key: "n2o",   cx: 1765, cy: 441, len: 89, min: 0,   max: 1000 },
      ],
      speed: { x: 503, y: 232, size: 78 },
      gear: { x: 1470, y: 204, size: 60 },
      shiftLeds: { x0: 802, dx: 58.5, y: 75, n: 9, r: 11 },
    },
    lightning: {
      label: "Blue Lightning",
      note: "Street cluster with lightning panels. You pick the four gauges and the nameplate.",
      src: "assets/blue-lightning.jpg", w: 1870, h: 841,
      customFaces: true,
      tach: { cx: 953, cy: 378, len: 200, r: 222, a0: 225, a1: -45, max: 10 },
      gauges: [
        { cx: 241,  cy: 430, r: 100 },
        { cx: 509,  cy: 430, r: 100 },
        { cx: 1391, cy: 432, r: 100 },
        { cx: 1646, cy: 430, r: 100 },
      ],
      speed: { x: 410, y: 212, size: 84 },
      gear: { x: 1470, y: 212, size: 84 },
      plate: { x: 712, y: 634, w: 530, h: 70, cx: 962, cy: 670 },
    },
  },
};
