// LCR Digital Dash configurator — preview renderer + build-sheet flow.
// Product data lives in config.js; this file only renders and collects.
(function () {
  "use strict";
  const C = window.LCR_CONFIG;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const TIER_TEXT = { proven: "Standard", build: "Configured to order", calibrate: "Custom calibration" };

  const ACCENTS = [
    { id: "lcr", label: "LCR Blue", hex: "#168cff", hue: null },
    { id: "ice", label: "Ice", hex: "#39d6ff", hue: 193 },
    { id: "red", label: "Race Red", hex: "#ff3526", hue: 4 },
    { id: "green", label: "Toxic", hex: "#48f26b", hue: 130 },
    { id: "amber", label: "Amber", hex: "#ffae1a", hue: 39 },
    { id: "violet", label: "Violet", hex: "#a35bff", hue: 268 },
  ];

  // ── state ────────────────────────────────────────────────────
  const state = {
    step: 0,
    platform: "e38",
    inputs: {},   // carb sensor picks + holley/e38 extras, by id → option index
    ecu: {},      // platform → ecu choice index
    theme: "lightning",
    accent: "lcr",
    plateMode: "text",
    plateText: "LOST CONTROL",
    logo: null,   // HTMLImageElement
    logoName: "",
    slots: ["oilp", "clt", "volts", "fuel"],
    speedUnit: "mph",
    tempUnit: "F",
    shiftRpm: 6500,
    demo: true,
  };
  for (const [pk, p] of Object.entries(C.platforms)) {
    for (const inp of (p.inputs || []).concat(p.extras || [])) state.inputs[pk + ":" + inp.id] = 0;
    state.ecu[pk] = 0;
  }
  const inputKey = (id) => state.platform + ":" + id;

  // ── preview renderer ─────────────────────────────────────────
  const canvas = $("#dash");
  const ctx = canvas.getContext("2d");
  const images = {};
  const baseCache = {}; // theme|accent → recolored canvas
  let needleImg = null;

  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToRgb(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }

  // Recolor only the LCR-blue band of the real artwork. Chrome, white
  // numerals, amber shift lights and the red redline keep their color.
  function baseFor(themeKey, accentId) {
    const key = themeKey + "|" + accentId;
    if (baseCache[key]) return baseCache[key];
    const t = C.themes[themeKey], img = images[themeKey];
    const off = document.createElement("canvas");
    off.width = t.w; off.height = t.h;
    const o = off.getContext("2d");
    o.drawImage(img, 0, 0, t.w, t.h);
    const acc = ACCENTS.find((a) => a.id === accentId);
    if (acc && acc.hue != null) {
      const px = o.getImageData(0, 0, t.w, t.h), d = px.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (b < 40 || b <= r || b <= g - 10) continue; // fast reject non-blue
        const [h, s, l] = rgbToHsl(r, g, b);
        if (h < 185 || h > 250 || s < 0.22) continue;
        const [nr, ng, nb] = hslToRgb(acc.hue, Math.min(1, s * 1.05), l);
        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
      }
      o.putImageData(px, 0, 0);
    }
    baseCache[key] = off;
    return off;
  }

  const accentHex = () => ACCENTS.find((a) => a.id === state.accent).hex;
  const rad = (deg) => (deg * Math.PI) / 180;

  // Photographic needle (assets/needle.png): hub (150,240), tip heading 29.2°
  // above 3 o'clock, hub→tip 364 px — same art the Edge dash runs.
  function photoNeedle(cx, cy, len, angle) {
    if (!needleImg) return;
    const s = len / 364;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad(29.2 - angle));
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 9 * s * 3;
    ctx.shadowOffsetY = 4 * s * 3;
    ctx.drawImage(needleImg, -150 * s, -240 * s, 525 * s, 374 * s);
    ctx.restore();
  }

  // Illuminated blade in the accent color (the H3 cluster's small needles).
  function bladeNeedle(cx, cy, r, angle, color) {
    const len = r * 0.8, tail = r * 0.14, w = Math.max(4, r * 0.05);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-rad(angle));
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-tail, -w / 2); ctx.lineTo(len, -w * 0.18); ctx.lineTo(len, w * 0.18); ctx.lineTo(-tail, w / 2);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(240,248,255,0.9)";
    ctx.fillRect(4, -1, len - 10, 2);
    const hub = r * 0.12;
    const g = ctx.createRadialGradient(-hub * 0.3, -hub * 0.3, 1, 0, 0, hub);
    g.addColorStop(0, "#4a525c"); g.addColorStop(1, "#07090c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, hub, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(200,210,220,0.5)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  function glowText(text, x, y, size, color, glow, font = "Orbitron", weight = 800, align = "center") {
    ctx.save();
    ctx.font = `${weight} ${size}px "${font}", "Arial Narrow", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  const toC = (f) => Math.round(((f - 32) * 5) / 9);
  function faceTicks(key) {
    const f = C.gaugeFaces[key];
    if (state.tempUnit === "C" && f.unit === "°F") return f.ticks.map(toC);
    return f.ticks;
  }
  function faceUnit(key) {
    const u = C.gaugeFaces[key].unit;
    return state.tempUnit === "C" && u === "°F" ? "°C" : u;
  }

  function drawCustomFace(g, key, value) {
    const f = C.gaugeFaces[key];
    const a0 = 210, a1 = -30, acc = accentHex();
    faceTicks(key).forEach((t, i, arr) => {
      const a = rad(a0 + ((a1 - a0) * i) / (arr.length - 1));
      glowText(String(t), g.cx + Math.cos(a) * g.r * 0.64, g.cy - Math.sin(a) * g.r * 0.64,
        g.r * 0.21, "#f2f6fb", "rgba(0,0,0,0.9)", "Orbitron", 600);
    });
    glowText(f.label, g.cx, g.cy + g.r * 0.5, f.label.length > 6 ? g.r * 0.17 : g.r * 0.22, acc, acc, "Barlow Semi Condensed", 700);
    const u = faceUnit(key);
    if (u) glowText(u, g.cx, g.cy + g.r * 0.72, g.r * 0.14, "#dfe7f0", "rgba(0,0,0,0.8)", "Barlow Semi Condensed", 600);
    const frac = Math.max(0, Math.min(1, (value - f.min) / (f.max - f.min)));
    bladeNeedle(g.cx, g.cy, g.r, a0 + (a1 - a0) * frac, acc);
  }

  // Default icon under each Blue Lightning gauge slot (oil, water, volts, fuel).
  const LIGHTNING_ICONS = ["oilp", "clt", "volts", "fuel"];
  const ICON_POS = [[237, 582], [512, 582], [1390, 582], [1655, 582]];
  function hideIcon(i) {
    const [x, y] = ICON_POS[i];
    const g = ctx.createRadialGradient(x, y, 4, x, y, 40);
    g.addColorStop(0, "rgba(6,8,11,1)"); g.addColorStop(0.7, "rgba(6,8,11,0.96)"); g.addColorStop(1, "rgba(6,8,11,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 42, y - 36, 84, 72);
  }

  function drawPlate(t) {
    const p = t.plate;
    if (state.plateMode === "stock") return;
    ctx.save();
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, "#0d1014"); g.addColorStop(0.5, "#15191e"); g.addColorStop(1, "#0a0c0f");
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.restore();
    if (state.plateMode === "logo" && state.logo) {
      const im = state.logo, s = Math.min((p.w - 30) / im.width, (p.h - 12) / im.height);
      ctx.drawImage(im, p.cx - (im.width * s) / 2, p.cy - (im.height * s) / 2, im.width * s, im.height * s);
      return;
    }
    const text = (state.plateText || "").toUpperCase().slice(0, 22);
    if (!text) return;
    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.transform(1, 0, -0.2, 1, 0, 0); // italic chrome, like the stock plaque
    let size = 50;
    ctx.font = `900 ${size}px "Orbitron", sans-serif`;
    while (ctx.measureText(text).width > p.w - 40 && size > 20) { size -= 2; ctx.font = `900 ${size}px "Orbitron", sans-serif`; }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const chrome = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    chrome.addColorStop(0, "#f4f8fc"); chrome.addColorStop(0.45, "#8e9aa8"); chrome.addColorStop(0.55, "#3a4450"); chrome.addColorStop(1, "#c9d3de");
    ctx.shadowColor = accentHex(); ctx.shadowBlur = 10;
    ctx.lineWidth = 3; ctx.strokeStyle = accentHex();
    ctx.strokeText(text, 0, 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = chrome;
    ctx.fillText(text, 0, 2);
    ctx.restore();
  }

  // ── demo drive loop: launch, four gears, cruise, lift ──────────
  function simulate(tSec) {
    const cycle = 14, t = tSec % cycle;
    let rpm, speed, gear, wot;
    if (t < 1.5) { rpm = 850 + Math.sin(t * 9) * 25; speed = 0; gear = "D"; wot = false; }
    else if (t < 8.5) {
      const k = t - 1.5, g = Math.min(3, Math.floor(k / 1.75)), within = (k - g * 1.75) / 1.75;
      rpm = [3200, 4300, 4700, 5000][g] + within * (state.shiftRpm + 200 - [3200, 4300, 4700, 5000][g]);
      speed = 12 + k * 15.5; gear = String(g + 1); wot = true;
    } else if (t < 11.5) { const k = (t - 8.5) / 3; rpm = 2400 - k * 500; speed = 120 - k * 45; gear = "D"; wot = false; }
    else { const k = (t - 11.5) / 2.5; rpm = 1900 - k * 1050; speed = 75 - k * 75; gear = "D"; wot = false; }
    const load = wot ? 1 : 0.15;
    return {
      rpm, speed: Math.max(0, speed), gear,
      oilp: 22 + (rpm / 7000) * 55, clt: 188 + Math.sin(tSec / 3) * 4, volts: 14.1 + Math.sin(tSec) * 0.15,
      fuel: 62, fuelp: 7 + load * 0.6, oilt: 212, afr: wot ? 12.6 : 14.7, boost: -17 + load * 26,
      map: -14 + load * 24, iat: 104 + load * 8, n2o: wot ? 880 : 950,
    };
  }
  const REST = { rpm: 850, speed: 0, gear: "P", oilp: 34, clt: 186, volts: 14.1, fuel: 62, fuelp: 7, oilt: 205, afr: 14.7, boost: -17, map: -14, iat: 98, n2o: 950 };

  function render(tSec) {
    const t = C.themes[state.theme];
    if (!images[state.theme]) return;
    const cssW = canvas.clientWidth || 800, dpr = Math.min(2, window.devicePixelRatio || 1);
    const pw = Math.round(cssW * dpr), ph = Math.round((pw * t.h) / t.w);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    const k = pw / t.w;
    $("#stage").style.aspectRatio = t.w + " / " + t.h;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.drawImage(baseFor(state.theme, state.accent), 0, 0);

    const v = state.demo ? simulate(tSec) : REST;
    const acc = accentHex();
    const tach = t.tach, fr = Math.max(0, Math.min(1, v.rpm / (tach.max * 1000)));

    if (t.customFaces) {
      // tach numerals over the blank Blue Lightning face
      for (let n = 0; n <= 10; n++) {
        const a = rad(tach.a0 + ((tach.a1 - tach.a0) * n) / 10);
        const hot = n * 1000 >= 7500;
        glowText(String(n), tach.cx + Math.cos(a) * tach.r * 0.86, tach.cy - Math.sin(a) * tach.r * 0.86,
          36, hot ? "#ff3b30" : "#f2f6fb", hot ? "rgba(255,59,48,0.6)" : "rgba(0,0,0,0.9)", "Orbitron", 600);
      }
      state.slots.forEach((key, i) => {
        if (key !== LIGHTNING_ICONS[i]) hideIcon(i);
        drawCustomFace(t.gauges[i], key, v[key] != null ? v[key] : C.gaugeFaces[key].min);
      });
      glowText("SPEED", t.speed.x - 40, 145, 30, acc, acc, "Barlow Semi Condensed", 700);
      glowText(state.speedUnit.toUpperCase(), t.speed.x + 70, 147, 22, "#dfe7f0", "rgba(0,0,0,0.8)", "Barlow Semi Condensed", 600);
      glowText("GEAR", t.gear.x, 145, 30, acc, acc, "Barlow Semi Condensed", 700);
      drawPlate(t);
    } else {
      t.gauges.forEach((g) => {
        const f = Math.max(0, Math.min(1, (v[g.key] - g.min) / (g.max - g.min)));
        photoNeedle(g.cx, g.cy, g.len, 225 - 270 * f);
      });
      const s = t.shiftLeds;
      for (let i = 0; i < s.n; i++) {
        const on = v.rpm >= state.shiftRpm - 1800 + i * 225;
        if (!on) continue;
        const col = i >= s.n - 2 ? "#ff3b30" : "#ffb020";
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(s.x0 + i * s.dx, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      glowText(v.fuelp.toFixed(1), 371, 690, 30, "#eef5fc", acc, "Orbitron", 700);
      glowText(state.tempUnit === "C" ? String(toC(v.iat)) : String(Math.round(v.iat)), 652, 690, 30, "#eef5fc", acc, "Orbitron", 700);
      glowText(v.afr.toFixed(1), 1351, 690, 30, "#eef5fc", acc, "Orbitron", 700);
    }
    photoNeedle(tach.cx, tach.cy, tach.len, tach.a0 + (tach.a1 - tach.a0) * fr);

    const spd = state.speedUnit === "kmh" ? v.speed * 1.609 : v.speed;
    glowText(String(Math.round(spd)), t.speed.x, t.speed.y, t.speed.size, "#ffffff", acc);
    glowText(v.gear, t.gear.x, t.gear.y, t.gear.size, "#ffffff", acc, "Orbitron", 900);
  }

  let rafStart = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) state.demo = false;
  function frame(ts) {
    if (rafStart == null) rafStart = ts;
    render((ts - rafStart) / 1000);
    if (state.demo) requestAnimationFrame(frame); else looping = false;
  }
  let looping = false;
  function redraw() {
    if (state.demo) { if (!looping) { looping = true; requestAnimationFrame(frame); } }
    else render(0);
  }
  window.addEventListener("resize", () => { if (!state.demo) render(0); });

  // ── step UI ──────────────────────────────────────────────────
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tierChip = (tier) => `<span class="tier tier--${tier}">${TIER_TEXT[tier]}</span>`;

  function renderPlatforms() {
    $("#platforms").innerHTML = Object.entries(C.platforms).map(([k, p]) => `
      <label class="plat ${state.platform === k ? "is-on" : ""}">
        <input type="radio" name="platform" id="plat-${k}" value="${k}" ${state.platform === k ? "checked" : ""}>
        <span class="plat__label">${esc(p.label)}</span>
        <span class="plat__tag">${esc(p.tagline)}</span>
        <span class="plat__proof">${esc(p.proof)}</span>
        <span class="plat__price">${priceText(k)}</span>
      </label>`).join("");
    $$("#platforms input").forEach((r) => r.addEventListener("change", () => {
      state.platform = r.value;
      const allowed = C.platforms[state.platform].gauges;
      state.slots = state.slots.map((s, i) => (allowed.includes(s) ? s : allowed[i % allowed.length]));
      refreshAll();
    }));
  }

  function priceText(k) {
    const p = C.pricing[k];
    return p == null ? "Request a quote" : "From $" + Number(p).toLocaleString();
  }

  function selectRow(inp) {
    const key = inputKey(inp.id), cur = state.inputs[key];
    const opt = inp.options[cur];
    return `<div class="row">
      <label class="row__label" for="in-${key.replace(":", "-")}">${esc(inp.label)}</label>
      <div class="row__ctl">
        <select id="in-${key.replace(":", "-")}" data-key="${key}">
          ${inp.options.map((o, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${esc(o.v)}</option>`).join("")}
        </select>
        ${tierChip(opt.tier)}
      </div>
      ${inp.note ? `<p class="row__note">${esc(inp.note)}</p>` : ""}
    </div>`;
  }

  function renderInputs() {
    const p = C.platforms[state.platform];
    let html = `<p class="lede">${esc(p.summary)}</p><p class="bus"><span>Connection</span> ${esc(p.bus)}</p>`;
    if (p.inputs) {
      html += `<div class="rows">${p.inputs.map(selectRow).join("")}</div>`;
      html += `<p class="incl"><span>Always included</span> ${p.included.map(esc).join(" · ")}</p>`;
    } else {
      html += `<div class="rows"><div class="row">
        <label class="row__label" for="ecu-${state.platform}">Your ECU</label>
        <div class="row__ctl"><select id="ecu-${state.platform}" data-ecu="1">
          ${p.ecuChoices.map((e, i) => `<option value="${i}" ${i === state.ecu[state.platform] ? "selected" : ""}>${esc(e)}</option>`).join("")}
        </select></div></div>${(p.extras || []).map(selectRow).join("")}</div>`;
      html += `<h4 class="chan-h">What the dash reads from your ECU</h4><ul class="chans">${p.channels.map((c) =>
        `<li>${esc(c.v)} ${tierChip(c.tier)}</li>`).join("")}</ul>`;
    }
    html += `<p class="legend">${tierChip("proven")} supported out of the box · ${tierChip("build")} set up for your exact parts when we build it · ${tierChip("calibrate")} tell us the part number and we match its curve</p>`;
    $("#inputs").innerHTML = html;
    $$("#inputs select[data-key]").forEach((s) => s.addEventListener("change", () => {
      state.inputs[s.dataset.key] = Number(s.value); renderInputs(); renderArtwork(); renderSummary();
    }));
    const ecu = $("#inputs select[data-ecu]");
    if (ecu) ecu.addEventListener("change", () => { state.ecu[state.platform] = Number(ecu.value); renderSummary(); });
  }

  // A carb gauge channel needs its sender picked (not "None").
  function channelMissing(key) {
    if (state.platform !== "carb" || key === "volts") return false;
    const inp = C.platforms.carb.inputs.find((i) => i.id === key);
    return inp ? inp.options[state.inputs["carb:" + key]].v === "None" : false;
  }

  function renderArtwork() {
    const t = C.themes[state.theme];
    const allowed = C.platforms[state.platform].gauges;
    $("#themes").innerHTML = Object.entries(C.themes).map(([k, th]) => `
      <label class="theme ${state.theme === k ? "is-on" : ""}">
        <input type="radio" name="theme" id="theme-${k}" value="${k}" ${state.theme === k ? "checked" : ""}>
        <img src="${th.src}" alt="" loading="lazy">
        <span class="theme__name">${esc(th.label)}</span>
        <span class="theme__note">${esc(th.note)}</span>
      </label>`).join("");
    $$("#themes input").forEach((r) => r.addEventListener("change", async () => {
      state.theme = r.value; await ensureTheme(state.theme); refreshAll();
    }));

    $("#accents").innerHTML = ACCENTS.map((a) => `
      <button type="button" class="swatch ${state.accent === a.id ? "is-on" : ""}" data-accent="${a.id}"
        aria-pressed="${state.accent === a.id}" style="--sw:${a.hex}"><span></span>${esc(a.label)}</button>`).join("");
    $$("#accents .swatch").forEach((b) => b.addEventListener("click", () => {
      state.accent = b.dataset.accent; renderArtwork(); renderSummary(); if (!state.demo) render(0);
    }));

    $("#custom-only").hidden = !t.customFaces;
    $("#fixed-note").hidden = t.customFaces;
    if (t.customFaces) {
      $("#slots").innerHTML = state.slots.map((s, i) => `
        <div class="slot">
          <label for="slot-${i}">Gauge ${i + 1}</label>
          <select id="slot-${i}" data-slot="${i}">
            ${allowed.map((g) => `<option value="${g}" ${g === s ? "selected" : ""}>${esc(C.gaugeFaces[g].label)}${C.gaugeFaces[g].unit ? " · " + esc(C.gaugeFaces[g].unit) : ""}</option>`).join("")}
          </select>
          ${channelMissing(s) ? `<span class="warn">Pick a sender in step 2</span>` : ""}
        </div>`).join("");
      $$("#slots select").forEach((s) => s.addEventListener("change", () => {
        state.slots[Number(s.dataset.slot)] = s.value; renderArtwork(); renderSummary(); if (!state.demo) render(0);
      }));
      $$("input[name=plate]").forEach((r) => { r.checked = r.value === state.plateMode; });
      $("#plate-text-row").hidden = state.plateMode !== "text";
      $("#plate-logo-row").hidden = state.plateMode !== "logo";
      $("#logo-name").textContent = state.logoName || "PNG with a transparent background works best";
    }
  }

  function buildSheet() {
    const p = C.platforms[state.platform], t = C.themes[state.theme];
    const lines = [];
    lines.push(`Platform: ${p.label}`);
    if (p.inputs) p.inputs.forEach((i) => { const o = i.options[state.inputs["carb:" + i.id]]; lines.push(`  ${i.label}: ${o.v} [${TIER_TEXT[o.tier]}]`); });
    else {
      lines.push(`  ECU: ${p.ecuChoices[state.ecu[state.platform]]}`);
      (p.extras || []).forEach((i) => { const o = i.options[state.inputs[inputKey(i.id)]]; lines.push(`  ${i.label}: ${o.v} [${TIER_TEXT[o.tier]}]`); });
    }
    lines.push(`Artwork: ${t.label} · accent ${ACCENTS.find((a) => a.id === state.accent).label}`);
    if (t.customFaces) {
      lines.push(`  Gauges: ${state.slots.map((s) => C.gaugeFaces[s].label).join(" / ")}`);
      lines.push(`  Nameplate: ${state.plateMode === "logo" ? "customer logo (" + (state.logoName || "to be sent") + ")" : state.plateMode === "stock" ? "LCR stock plate" : (state.plateText || "(blank)").toUpperCase()}`);
    }
    lines.push(`Units: ${state.speedUnit === "kmh" ? "km/h" : "mph"}, °${state.tempUnit} · Shift light at ${state.shiftRpm} rpm`);
    return lines;
  }

  function buildId() {
    const s = JSON.stringify([state.platform, state.inputs, state.ecu, state.theme, state.accent, state.slots, state.plateText, state.plateMode]);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return "LCR-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
  }

  function renderSummary() {
    const p = C.platforms[state.platform], t = C.themes[state.theme];
    $("#chip-platform").textContent = p.label;
    $("#chip-theme").textContent = t.label + " · " + ACCENTS.find((a) => a.id === state.accent).label;
    $("#chip-price").textContent = priceText(state.platform);
    $("#sheet").textContent = buildSheet().join("\n");
    $("#build-id").textContent = buildId();
  }

  function setStep(n) {
    state.step = n;
    $$(".step").forEach((s, i) => { s.hidden = i !== n; });
    $$(".steps__tab").forEach((b, i) => { b.classList.toggle("is-on", i === n); b.setAttribute("aria-current", i === n ? "step" : "false"); });
    $("#back").hidden = n === 0;
    $("#next").hidden = n === 3;
  }

  function refreshAll() { renderPlatforms(); renderInputs(); renderArtwork(); renderSummary(); if (!state.demo) render(0); }

  async function ensureTheme(k) {
    if (!images[k]) images[k] = await loadImage(C.themes[k].src);
  }

  // ── wiring ───────────────────────────────────────────────────
  $$(".steps__tab").forEach((b, i) => b.addEventListener("click", () => setStep(i)));
  $("#next").addEventListener("click", () => setStep(Math.min(3, state.step + 1)));
  $("#back").addEventListener("click", () => setStep(Math.max(0, state.step - 1)));
  $("#plate-text").addEventListener("input", (e) => { state.plateText = e.target.value; renderSummary(); if (!state.demo) render(0); });
  $$("input[name=plate]").forEach((r) => r.addEventListener("change", () => { state.plateMode = r.value; renderArtwork(); renderSummary(); if (!state.demo) render(0); }));
  $("#logo").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    loadImage(url).then((im) => { state.logo = im; state.logoName = f.name; renderArtwork(); renderSummary(); if (!state.demo) render(0); })
      .catch(() => { $("#logo-name").textContent = "That file isn't an image we can read — try PNG or JPG."; });
  });
  $("#speed-unit").addEventListener("change", (e) => { state.speedUnit = e.target.value; renderSummary(); if (!state.demo) render(0); });
  $("#temp-unit").addEventListener("change", (e) => { state.tempUnit = e.target.value; renderSummary(); if (!state.demo) render(0); });
  $("#shift-rpm").addEventListener("input", (e) => { state.shiftRpm = Number(e.target.value); $("#shift-rpm-out").textContent = state.shiftRpm; renderSummary(); if (!state.demo) render(0); });
  $("#demo").addEventListener("click", () => {
    state.demo = !state.demo;
    $("#demo").setAttribute("aria-pressed", state.demo);
    $("#demo").textContent = state.demo ? "Pause demo pass" : "Play demo pass";
    redraw();
  });

  function contactFields() {
    return {
      name: $("#c-name").value.trim(), email: $("#c-email").value.trim(), phone: $("#c-phone").value.trim(),
      vehicle: $("#c-vehicle").value.trim(), notes: $("#c-notes").value.trim(),
    };
  }

  function sheetText() {
    const c = contactFields();
    return [`LCR DIGITAL DASH BUILD ${buildId()}`, "", ...buildSheet(), "",
      `Name: ${c.name}`, `Email: ${c.email}`, `Phone: ${c.phone}`, `Vehicle: ${c.vehicle}`, c.notes ? `Notes: ${c.notes}` : ""].join("\n").trim();
  }

  $("#order").addEventListener("submit", async (e) => {
    e.preventDefault();
    const c = contactFields(), out = $("#order-result");
    if (!c.name || (!c.email && !c.phone)) {
      out.className = "result result--err";
      out.textContent = "Add your name and an email or phone so we can reach you about the build.";
      return;
    }
    const payload = { buildId: buildId(), ...c, build: buildSheet(), config: {
      platform: state.platform, inputs: state.inputs, ecu: state.ecu[state.platform], theme: state.theme,
      accent: state.accent, slots: state.slots, plateMode: state.plateMode, plateText: state.plateText,
      logoFile: state.logoName, speedUnit: state.speedUnit, tempUnit: state.tempUnit, shiftRpm: state.shiftRpm } };
    if (C.shop.orderEndpoint) {
      out.className = "result"; out.textContent = "Sending your build sheet…";
      try {
        const r = await fetch(C.shop.orderEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(String(r.status));
        out.className = "result result--ok";
        out.textContent = `Build ${payload.buildId} received. ${C.shop.name} will reach out to confirm your inputs and quote.` + (state.logoName ? " Keep your logo file handy — we'll ask for it." : "");
        return;
      } catch (err) {
        out.className = "result result--err";
        out.textContent = "We couldn't send it just now. Copy the build sheet below and send it to us directly.";
      }
    } else {
      out.className = "result";
      out.textContent = "Copy your build sheet and send it to us" + (C.shop.email ? ` at ${C.shop.email}` : "") + (C.shop.phone ? ` or text ${C.shop.phone}` : "") + ".";
    }
    $("#final").hidden = false;
    $("#final-text").value = sheetText();
  });

  $("#copy").addEventListener("click", () => {
    const ta = $("#final-text"), btn = $("#copy");
    const done = () => { btn.textContent = "Copied"; setTimeout(() => { btn.textContent = "Copy build sheet"; }, 1600); };
    const fallback = () => { ta.focus(); ta.select(); btn.textContent = "Selected — press Ctrl+C"; };
    try { navigator.clipboard.writeText(ta.value).then(done, fallback); } catch (err) { fallback(); }
  });

  $("#plate-text").value = state.plateText;
  $("#shift-rpm").value = state.shiftRpm;
  $("#shift-rpm-out").textContent = state.shiftRpm;
  if (!state.demo) { $("#demo").setAttribute("aria-pressed", "false"); $("#demo").textContent = "Play demo pass"; }
  setStep(0);
  refreshAll();
  Promise.all([ensureTheme(state.theme), loadImage("assets/needle.png").then((im) => { needleImg = im; })])
    .then(() => (document.fonts ? document.fonts.ready : null))
    .then(() => { $("#stage").classList.add("is-ready"); redraw(); })
    .catch(() => { $("#stage").classList.add("is-error"); });
  ensureTheme("carbon").catch(() => {});
})();
