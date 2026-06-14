import React, { useEffect } from "react";

/*
 * NextPlayButton — a glossy 3D candy "play / next" game button.
 * ---------------------------------------------------------------------------
 * Pure HTML + CSS: built entirely from <span>s, pseudo-elements, gradients and
 * shadows. No <img>, no SVG, transparent background. Scales with the `size`
 * prop (everything is %-based off a square box, so it stays crisp at any size).
 *
 * Look: a rounded-triangle play button pointing right — white inflated cushion
 * frame with a soft grey shadow, a thin darker-pink inner edge, a glossy pink
 * candy gradient fill with a top-left highlight + inner depth shadow, a thick
 * rounded ">" chevron, motion streaks trailing off the left, and two sparkles.
 *
 * Interactions: hover = scale up + stronger glow; click = compress like a
 * physical game button.
 *
 * Usage:
 *   <NextPlayButton onClick={handleNext} />
 *   <NextPlayButton size={150} label="Continue" />
 */

const CSS = `
.npb {
  position: relative;
  display: inline-block;
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  filter: drop-shadow(0 8px 14px rgba(160, 30, 100, .35));
  transition: transform .14s ease, filter .2s ease;
}
.npb:hover {
  transform: scale(1.06);
  filter: drop-shadow(0 0 16px rgba(255, 120, 200, .75)) drop-shadow(0 10px 18px rgba(211, 79, 163, .45));
}
.npb:active { transform: scale(.94); }
.npb:focus-visible { outline: 3px solid rgba(255, 150, 215, .9); outline-offset: 4px; border-radius: 16px; }

.npb-stage { position: absolute; inset: 0; }
.npb-stage > * { position: absolute; }
.npb-frame, .npb-edge, .npb-fill { inset: 0; }

/* white inflated frame + soft grey shadow around it */
.npb-frame {
  clip-path: polygon(16.0% 33.0%, 16.2% 29.9%, 16.7% 27.4%, 17.5% 25.4%, 18.7% 23.9%, 20.2% 22.9%, 22.1% 22.4%, 24.3% 22.5%, 26.8% 23.1%, 29.6% 24.2%, 63.3% 39.6%, 67.8% 41.9%, 71.1% 44.2%, 73.4% 46.5%, 74.5% 48.8%, 74.5% 51.2%, 73.4% 53.5%, 71.1% 55.8%, 67.8% 58.1%, 63.3% 60.4%, 29.6% 75.8%, 26.8% 76.9%, 24.3% 77.5%, 22.1% 77.6%, 20.2% 77.1%, 18.7% 76.1%, 17.5% 74.6%, 16.7% 72.6%, 16.2% 70.1%, 16.0% 67.0%);
  background: linear-gradient(155deg, #ffffff 0%, #f4f5f8 58%, #e2e5ec 100%);
  filter: drop-shadow(0 5px 6px rgba(70, 50, 80, .30)) drop-shadow(0 1px 1px rgba(70, 50, 80, .25));
  z-index: 1;
}
/* thin darker-pink ring just inside the white frame */
.npb-edge {
  clip-path: polygon(21.0% 40.8%, 21.2% 37.7%, 21.7% 35.2%, 22.5% 33.1%, 23.7% 31.6%, 25.2% 30.7%, 27.1% 30.2%, 29.3% 30.3%, 31.8% 30.9%, 34.6% 32.0%, 51.2% 39.6%, 55.7% 41.9%, 59.1% 44.2%, 61.3% 46.5%, 62.5% 48.8%, 62.5% 51.2%, 61.3% 53.5%, 59.1% 55.8%, 55.7% 58.1%, 51.2% 60.4%, 34.6% 68.0%, 31.8% 69.1%, 29.3% 69.7%, 27.1% 69.8%, 25.2% 69.3%, 23.7% 68.4%, 22.5% 66.9%, 21.7% 64.8%, 21.2% 62.3%, 21.0% 59.2%);
  background: linear-gradient(150deg, #e85bb0 0%, #c8327f 100%);
  z-index: 2;
}
/* candy pink gradient fill */
.npb-fill {
  clip-path: polygon(23.0% 43.9%, 23.2% 40.8%, 23.7% 38.3%, 24.5% 36.3%, 25.7% 34.8%, 27.2% 33.8%, 29.1% 33.3%, 31.3% 33.4%, 33.8% 34.0%, 36.6% 35.1%, 48.4% 40.5%, 52.5% 42.6%, 55.6% 44.7%, 57.6% 46.8%, 58.6% 48.9%, 58.6% 51.1%, 57.6% 53.2%, 55.6% 55.3%, 52.5% 57.4%, 48.4% 59.5%, 36.6% 64.9%, 33.8% 66.0%, 31.3% 66.6%, 29.1% 66.7%, 27.2% 66.2%, 25.7% 65.2%, 24.5% 63.7%, 23.7% 61.7%, 23.2% 59.2%, 23.0% 56.1%);
  background: linear-gradient(150deg, #ff7ccb 0%, #ff4fbd 46%, #ff2aa8 100%);
  z-index: 3;
}
/* glossy top-left highlight (clipped to the fill triangle) */
.npb-fill::before {
  content: "";
  position: absolute;
  left: 27%; top: 38%;
  width: 26%; height: 13%;
  border-radius: 50%;
  background: radial-gradient(60% 70% at 50% 40%, rgba(255, 255, 255, .92), rgba(255, 255, 255, 0) 72%);
  transform: rotate(-14deg);
}
/* inner shadow for depth along the lower-right */
.npb-fill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(80% 60% at 58% 70%, rgba(150, 8, 78, .55), rgba(150, 8, 78, 0) 58%);
}
/* motion streaks trailing off the left */
.npb-streaks {
  left: -1%; top: 35%;
  width: 22%; height: 30%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .9) 100%);
  -webkit-mask: repeating-linear-gradient(0deg, #000 0 3px, transparent 3px 9px);
          mask: repeating-linear-gradient(0deg, #000 0 3px, transparent 3px 9px);
  filter: blur(.3px);
  z-index: 0;
}
/* corner sparkles (4-point stars) */
.npb-spark {
  background: #fff;
  clip-path: polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%);
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, .9));
  z-index: 5;
}
.npb-spark-a { right: 5%;  top: 5%;  width: 12%; aspect-ratio: 1; }
.npb-spark-b { right: 15%; top: 30%; width: 6%;  aspect-ratio: 1; opacity: .85; }
`;

let injected = false;
function useNpbStyles() {
  useEffect(() => {
    if (injected || typeof document === "undefined") { return; }
    injected = true;
    const style = document.createElement("style");
    style.setAttribute("data-npb-styles", "");
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);
}

export default function NextPlayButton({ size = 120, label = "Next", className = "", ...rest }) {
  useNpbStyles();
  return (
    <button
      type="button"
      aria-label={label}
      className={"npb" + (className ? " " + className : "")}
      style={{ width: size }}
      {...rest}
    >
      <span className="npb-stage" aria-hidden="true">
        <span className="npb-streaks" />
        <span className="npb-frame" />
        <span className="npb-edge" />
        <span className="npb-fill" />
        <span className="npb-spark npb-spark-a" />
        <span className="npb-spark npb-spark-b" />
      </span>
    </button>
  );
}
