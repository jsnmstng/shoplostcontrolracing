# LCR Dash Builder

Customer-facing configurator for the three LCR digital dashes:

| Platform | Source of truth |
|---|---|
| Carb / Analog (Mega sensor module → LCR Edge) | `git hub repos/Mustang-Digital-Dash`, `LCR-EDGE-` |
| Holley Terminator X / Dominator (Racepak CAN, 1 Mbps 29-bit) | `git hub repos/RosettaCan/defs/protocols/holley_hefi_racepak` |
| GM Gen 4 LS / E38 (HS CAN 500k + OBD2 fallback) | `lcr-h3-rpi-dash-build/CAN_SIGNAL_MAP.md` |

Customers pick a platform, their sensors/ECU, an artwork style (the real
Carbon Pro Mustang cluster or the Blue Lightning H3 cluster), accent color,
four gauge faces, nameplate text or logo, units and shift point. The page
produces a build sheet with a build ID and sends it to you.

Static site — no build step, no server code. Files:

- `index.html` — page
- `config.js` — **all product data, prices and the order endpoint**
- `app.js` — preview renderer + steps
- `assets/` — compressed copies of the real artwork (originals untouched)

## Before launch (edit `config.js`)

1. `shop.orderEndpoint` — a URL that accepts a JSON POST (e.g. a Formspree
   form endpoint). Empty = customer gets a copy-and-send build sheet instead.
2. `shop.email` / `shop.phone` — shown on the send step.
3. `pricing.*` — `null` shows "Request a quote"; a number shows "From $N".
4. Sensor/channel tiers — `proven` / `build` / `calibrate`. Promote an option
   to `proven` only after it has run on a delivered vehicle.

## Run locally

    python3 -m http.server 8797 --bind 127.0.0.1 --directory lcr-dash-configurator

(Port 8765 is Jarvis — don't use it.)

## Deploy

Upload the folder as-is to any static host (GitHub Pages, Netlify, Cloudflare
Pages, or the shop's existing web host). Nothing else is required.

## Honesty rules baked into the data

- Blue Lightning previews the customer's chosen gauges on the blank-face H3
  artwork; Carbon Pro faces are fixed and the page says so.
- Carb temp senders other than Dakota Digital, and fuel senders other than
  GM 0–90 Ω, are "We calibrate" — the firmware only has those curves today.
- Holley channels beyond the first-signal runtime path are "Set at build"
  (confirmed at install). Dominator is offered on the same protocol, confirm
  per order.
- E38 speed is calibrated per vehicle; fuel level depends on the PCM seeing
  the sender. Install starts with a CAN capture.
