/*
 * Layout Debug Overlay for PowerUp Bots.
 * ----------------------------------------------------------------------------
 * A self-contained, zero-dependency visual alignment tool. It is loaded ONLY
 * when the page URL contains `?debug=1` (see the conditional loader at the
 * bottom of index.html), so it is purely additive — removing that loader (or
 * the query flag) fully restores the original game with no overlay and no
 * interference with game input.
 *
 * What it does
 *   • Instruments every named, visible asset on the CURRENT screen with:
 *       - a draggable body (move freely within the 1280×720 game space)
 *       - 8 resize handles (corners + edge midpoints, min 10×10)
 *       - a live label:  id | x, y | w × h   (game-space pixels)
 *   • A floating panel lists every instrumented asset with its live x/y/w/h,
 *     a per-asset Reset, and a "Download Layout JSON" button.
 *   • Auto re-scans when the game changes screen (FLOW step changes).
 *
 * Exported JSON schema (filename: layout_[screen]_[timestamp].json):
 *   { "screen": "laser", "assets": [ { "id": "leftBot", "x": 246, "y": 360,
 *     "w": 134, "h": 160 }, ... ] }
 *
 * The companion "apply layout JSON" pass (feeding this file back to Claude to
 * bake the coordinates into index.html) is a separate, manual step.
 *
 * Coordinate space: all x/y/w/h are in the game's native 1280×720 space, the
 * same units used by the hardcoded CSS/JS positions in index.html, so the
 * exported numbers can be applied to source directly.
 */
(function () {
  "use strict";

  if (window.location.search.indexOf("debug=1") === -1) { return; }
  if (window.__layoutDebugLoaded) { return; }
  window.__layoutDebugLoaded = true;

  /* Candidate assets to instrument. Unique ids are used verbatim; class-only
     elements (the corner slots) fall back to their distinguishing class. Only
     the ones actually visible on the current screen get handles. */
  var CANDIDATES = [
    "#instruction", "#instructionText",
    "#leftBot", "#rightBot", "#midLeftBot", "#midRightBot",
    "#leftPod", "#rightPod",
    ".corner-slot", ".head-plug",
    "#machineImg", "#machineBlock", "#laserImg", "#beamImg",
    "#blockCover", "#cutLine", "#wrongSlash",
    "#btnLeft", "#btnRight", "#btnCut", "#cutOverlay", "#handGesture",
    "#bubbleLeft", "#bubbleRight", "#bubbleCut",
    "#playButton", "#iraChar"
  ];

  /* Background layers must never be draggable/resizable — they are full-bleed
     and not positioned assets. Excluded by id/class and by a full-frame guard. */
  var BG_IDS = { sceneBg: 1, playBg: 1, completeBg: 1 };
  function isBackground(el) {
    if (el.id && BG_IDS[el.id]) { return true; }
    var cls = (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : (el.className || "");
    if (/\bbg\b/.test(String(cls))) { return true; }
    var gr = document.getElementById("game").getBoundingClientRect();
    var r = el.getBoundingClientRect();
    /* covers (almost) the entire game frame → treat as a background */
    if (r.width >= gr.width * 0.97 && r.height >= gr.height * 0.97) { return true; }
    return false;
  }

  function ready(cb) {
    if (window.state && window.FLOW && document.getElementById("game")) { cb(); }
    else { setTimeout(function () { ready(cb); }, 120); }
  }

  ready(function () { boot(); });

  function boot() {
    var game = document.getElementById("game");

    /* ── overlay layer (viewport-space; holds the per-asset handle boxes) ── */
    var layer = document.createElement("div");
    layer.id = "layoutDebugLayer";
    layer.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;pointer-events:none;";
    document.body.appendChild(layer);

    var STYLE = document.createElement("style");
    STYLE.textContent = [
      "#layoutDebugLayer .ld-box{position:fixed;border:1.5px solid #38f0ff;" +
        "box-shadow:0 0 0 1px rgba(0,0,0,.35);pointer-events:auto;cursor:move;" +
        "box-sizing:border-box;}",
      "#layoutDebugLayer .ld-box.ld-selected{border-color:#ffd23b;" +
        "box-shadow:0 0 0 1px rgba(0,0,0,.45),0 0 10px rgba(255,210,59,.6);}",
      "#layoutDebugLayer .ld-label{position:absolute;left:0;top:-19px;" +
        "font:10px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#06121f;" +
        "background:#38f0ff;padding:0 5px;border-radius:3px;white-space:nowrap;" +
        "pointer-events:none;font-weight:700;}",
      "#layoutDebugLayer .ld-box.ld-selected .ld-label{background:#ffd23b;}",
      "#layoutDebugLayer .ld-h{position:absolute;width:10px;height:10px;" +
        "background:#fff;border:1.5px solid #1782ff;border-radius:2px;" +
        "box-sizing:border-box;pointer-events:auto;}",
      "#layoutDebugLayer .ld-h.nw{left:-6px;top:-6px;cursor:nwse-resize;}",
      "#layoutDebugLayer .ld-h.n{left:50%;top:-6px;margin-left:-5px;cursor:ns-resize;}",
      "#layoutDebugLayer .ld-h.ne{right:-6px;top:-6px;cursor:nesw-resize;}",
      "#layoutDebugLayer .ld-h.e{right:-6px;top:50%;margin-top:-5px;cursor:ew-resize;}",
      "#layoutDebugLayer .ld-h.se{right:-6px;bottom:-6px;cursor:nwse-resize;}",
      "#layoutDebugLayer .ld-h.s{left:50%;bottom:-6px;margin-left:-5px;cursor:ns-resize;}",
      "#layoutDebugLayer .ld-h.sw{left:-6px;bottom:-6px;cursor:nesw-resize;}",
      "#layoutDebugLayer .ld-h.w{left:-6px;top:50%;margin-top:-5px;cursor:ew-resize;}"
    ].join("");
    document.head.appendChild(STYLE);

    /* ── floating control panel ── */
    var panel = document.createElement("div");
    panel.id = "layoutDebugPanel";
    panel.style.cssText = [
      "position:fixed", "top:8px", "right:8px", "z-index:2147483647",
      "background:rgba(16,24,44,.94)", "color:#fff",
      "font:11px/1.45 -apple-system,Segoe UI,Roboto,sans-serif",
      "padding:8px 10px", "border-radius:8px", "width:268px",
      "box-shadow:0 6px 24px rgba(0,0,0,.45)", "user-select:none",
      "backdrop-filter:blur(6px)"
    ].join(";");
    document.body.appendChild(panel);

    var scale = 1;
    function refreshScale() {
      var gr = game.getBoundingClientRect();
      scale = gr.width / 1280 || 1;
      return gr;
    }

    /* Game-space metrics for an element from its on-screen rect. */
    function metrics(el) {
      var gr = refreshScale();
      var r = el.getBoundingClientRect();
      return {
        x: Math.round((r.left - gr.left) / scale),
        y: Math.round((r.top - gr.top) / scale),
        w: Math.round(r.width / scale),
        h: Math.round(r.height / scale),
        screen: r
      };
    }

    function isVisible(el) {
      if (!el || el.offsetParent === null && el !== document.body) {
        /* offsetParent is null for display:none OR position:fixed; the game's
           assets are absolutely positioned, so null here means hidden. */
        if (!el) { return false; }
      }
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { return false; }
      var cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.02) { return false; }
      /* must be inside the game frame */
      var gr = game.getBoundingClientRect();
      if (r.right < gr.left || r.left > gr.right || r.bottom < gr.top || r.top > gr.bottom) { return false; }
      return true;
    }

    function assetIdFor(el, seenCounts) {
      if (el.id) { return el.id; }
      var cls = (el.className && el.className.baseVal !== undefined)
        ? el.className.baseVal : (el.className || "");
      /* corner slots: use the cs-* class */
      var m = String(cls).match(/cs-(tl|tr|bl|br)/);
      if (m) { return "corner-" + m[1]; }
      var base = String(cls).trim().split(/\s+/)[0] || el.tagName.toLowerCase();
      seenCounts[base] = (seenCounts[base] || 0) + 1;
      return base + "-" + seenCounts[base];
    }

    var tracked = [];   /* { el, id, box, label, origStyle } */
    var selected = null;

    function clearTracked() {
      tracked.forEach(function (t) { if (t.box.parentNode) { t.box.parentNode.removeChild(t.box); } });
      tracked = [];
      selected = null;
    }

    function currentScreenName() {
      try {
        var scene = window.FLOW[window.state.step] && window.FLOW[window.state.step].scene;
        var r = window.ROUNDS && window.ROUNDS[window.state.round];
        var rn = r ? (r.variant || r.name || r.label || ("round" + window.state.round)) : ("round" + window.state.round);
        return (scene || "screen") + "_" + rn;
      } catch (e) { return "screen"; }
    }

    function scan() {
      clearTracked();
      var seen = {};
      var seenEls = [];
      CANDIDATES.forEach(function (sel) {
        var nodes = game.querySelectorAll(sel);
        Array.prototype.forEach.call(nodes, function (el) {
          if (seenEls.indexOf(el) !== -1) { return; }
          if (!isVisible(el)) { return; }
          if (isBackground(el)) { return; }   /* never instrument the main background */
          seenEls.push(el);
          instrument(el, assetIdFor(el, seen));
        });
      });
      syncAll();
      renderList();
    }

    function instrument(el, id) {
      var box = document.createElement("div");
      box.className = "ld-box";
      var label = document.createElement("div");
      label.className = "ld-label";
      box.appendChild(label);
      ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach(function (dir) {
        var h = document.createElement("div");
        h.className = "ld-h " + dir;
        h.dataset.dir = dir;
        box.appendChild(h);
      });
      layer.appendChild(box);

      var t = {
        el: el, id: id, box: box, label: label,
        origStyle: {
          left: el.style.left, top: el.style.top,
          width: el.style.width, height: el.style.height,
          right: el.style.right, bottom: el.style.bottom,
          transform: el.style.transform, position: el.style.position,
          margin: el.style.margin, marginLeft: el.style.marginLeft
        }
      };
      tracked.push(t);

      box.addEventListener("pointerdown", function (e) {
        if (e.target.classList.contains("ld-h")) { return; } /* resize handled below */
        startDrag(t, e);
      });
      box.querySelectorAll(".ld-h").forEach(function (h) {
        h.addEventListener("pointerdown", function (e) { startResize(t, h.dataset.dir, e); });
      });
      box.addEventListener("pointerdown", function () { select(t); });
    }

    /* Pin the element to explicit game-space left/top/width/height so dragging
       and resizing are predictable regardless of its original CSS anchoring. */
    function pin(t) {
      var m = metrics(t.el);
      t.el.style.position = "absolute";
      t.el.style.left = m.x + "px";
      t.el.style.top = m.y + "px";
      t.el.style.right = "auto";
      t.el.style.bottom = "auto";
      t.el.style.margin = "0";
      t.el.style.marginLeft = "0";
      /* keep only a translate-free transform; preserve rotation-free assets */
      t.el.style.transform = "none";
      t.el.style.width = m.w + "px";
      t.el.style.height = m.h + "px";
      return m;
    }

    function startDrag(t, e) {
      e.preventDefault();
      select(t);
      pin(t);
      refreshScale();
      var startX = e.clientX, startY = e.clientY;
      var x0 = parseFloat(t.el.style.left), y0 = parseFloat(t.el.style.top);
      function move(ev) {
        var dx = (ev.clientX - startX) / scale;
        var dy = (ev.clientY - startY) / scale;
        t.el.style.left = Math.round(x0 + dx) + "px";
        t.el.style.top = Math.round(y0 + dy) + "px";
        syncOne(t); updateRow(t);
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    function startResize(t, dir, e) {
      e.preventDefault();
      e.stopPropagation();
      select(t);
      pin(t);
      refreshScale();
      var startX = e.clientX, startY = e.clientY;
      var x0 = parseFloat(t.el.style.left), y0 = parseFloat(t.el.style.top);
      var w0 = parseFloat(t.el.style.width), h0 = parseFloat(t.el.style.height);
      var west = dir.indexOf("w") !== -1, east = dir.indexOf("e") !== -1;
      var north = dir.indexOf("n") !== -1, south = dir.indexOf("s") !== -1;
      function move(ev) {
        var dx = (ev.clientX - startX) / scale;
        var dy = (ev.clientY - startY) / scale;
        var x = x0, y = y0, w = w0, h = h0;
        if (east) { w = Math.max(10, w0 + dx); }
        if (west) { w = Math.max(10, w0 - dx); x = x0 + (w0 - w); }
        if (south) { h = Math.max(10, h0 + dy); }
        if (north) { h = Math.max(10, h0 - dy); y = y0 + (h0 - h); }
        t.el.style.left = Math.round(x) + "px";
        t.el.style.top = Math.round(y) + "px";
        t.el.style.width = Math.round(w) + "px";
        t.el.style.height = Math.round(h) + "px";
        syncOne(t); updateRow(t);
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }

    function select(t) {
      selected = t;
      tracked.forEach(function (o) { o.box.classList.toggle("ld-selected", o === t); });
      renderList();
    }

    function syncOne(t) {
      var r = t.el.getBoundingClientRect();
      t.box.style.left = r.left + "px";
      t.box.style.top = r.top + "px";
      t.box.style.width = r.width + "px";
      t.box.style.height = r.height + "px";
      var m = metrics(t.el);
      t.label.textContent = t.id + "  |  " + m.x + "," + m.y + "  |  " + m.w + "×" + m.h;
    }

    function syncAll() { tracked.forEach(syncOne); }

    function resetOne(t) {
      var o = t.origStyle;
      t.el.style.left = o.left; t.el.style.top = o.top;
      t.el.style.width = o.width; t.el.style.height = o.height;
      t.el.style.right = o.right; t.el.style.bottom = o.bottom;
      t.el.style.transform = o.transform; t.el.style.position = o.position;
      t.el.style.margin = o.margin; t.el.style.marginLeft = o.marginLeft;
      syncOne(t); updateRow(t);
    }

    /* ── screen / round navigation ───────────────────────────────────────────
       Jump straight to any round + scene so every screen can be opened and
       aligned without playing through the game. Reaches into the game globals
       the main (non-IIFE) script exposes on window. */
    function currentScene() {
      try { return window.FLOW[window.state.step].scene; } catch (e) { return null; }
    }
    function flowScenes() {
      var seen = {}, out = [];
      (window.FLOW || []).forEach(function (s) {
        if (s && s.scene && !seen[s.scene]) { seen[s.scene] = 1; out.push(s.scene); }
      });
      return out;
    }
    function findStep(scene) {
      for (var i = 0; i < window.FLOW.length; i++) { if (window.FLOW[i].scene === scene) { return i; } }
      return -1;
    }
    function quietGame() {
      try { window.setInstruction && window.setInstruction("", { forceAudioStop: true }); } catch (e) {}
      try { window.stopInstructionAudio && window.stopInstructionAudio(true); } catch (e) {}
      try { window.clearTimers && window.clearTimers(); } catch (e) {}
      try {
        if (window._themeAudio && typeof window.THEME_BASE_VOLUME === "number") {
          window._themeAudio.volume = window.THEME_BASE_VOLUME;
        }
      } catch (e) {}
    }
    function jumpTo(roundIdx, scene) {
      if (!window.ROUNDS || !window.ROUNDS[roundIdx]) { return; }
      var step = findStep(scene);
      if (step < 0) { return; }
      quietGame();
      var s = window.state;
      s.round = roundIdx; s.step = step;
      s.locked = false; s.tutActive = false; s.teachingActive = false; s.nextAction = null;
      try { window.renderStep(); } catch (e) { console.warn("[layout-debug] jump failed:", e); }
      setTimeout(function () { scan(); buildNav(); }, 280);
    }
    function buildNav() {
      var roundsEl = panel.querySelector("#ldRounds");
      var scenesEl = panel.querySelector("#ldScenes");
      if (!roundsEl || !scenesEl) { return; }
      roundsEl.innerHTML = ""; scenesEl.innerHTML = "";
      (window.ROUNDS || []).forEach(function (r, idx) {
        var b = document.createElement("button");
        b.textContent = idx;
        b.title = (r.label || r.name) + (r.variant ? " · " + r.variant : "");
        var cur = window.state.round === idx;
        b.style.cssText = "background:" + (cur ? "#ffd23b;color:#06121f" : "#2a4378;color:#fff") +
          ";border:0;border-radius:4px;cursor:pointer;font:inherit;font-weight:700;padding:3px 8px";
        b.addEventListener("click", function () { jumpTo(idx, currentScene() || "laser"); });
        roundsEl.appendChild(b);
      });
      flowScenes().forEach(function (scene) {
        var a = document.createElement("button");
        a.textContent = scene;
        var cur = currentScene() === scene;
        a.style.cssText = "background:" + (cur ? "#ffd23b;color:#06121f" : "#16284a;color:#9fe9ff") +
          ";border:1px solid #3b5694;border-radius:4px;cursor:pointer;font:inherit;padding:2px 7px;text-decoration:underline";
        a.addEventListener("click", function () { jumpTo(window.state.round, scene); });
        scenesEl.appendChild(a);
      });
    }

    /* ── panel rendering ── */
    function buildPanel() {
      panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;margin-bottom:6px">' +
          '<span>🛠 Layout Debug</span>' +
          '<button id="ldClose" style="background:transparent;border:0;color:#fff;cursor:pointer;font-size:14px;padding:0 4px">✕</button>' +
        "</div>" +
        '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">' +
          '<span id="ldScreen" style="flex:1;color:#9fe9ff;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>' +
          '<button id="ldRescan" style="background:#2a4378;color:#fff;border:0;border-radius:4px;cursor:pointer;font:inherit;padding:3px 7px">Re-scan</button>' +
        "</div>" +
        '<div style="border-top:1px solid #2a3a60;padding-top:5px">' +
          '<div id="ldNavToggle" style="cursor:pointer;font-weight:700;color:#ffd23b;margin-bottom:5px">▴ Jump to screen</div>' +
          '<div id="ldNav">' +
            '<div style="color:#8fb;margin-bottom:3px">Round (shape)</div>' +
            '<div id="ldRounds" style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:7px"></div>' +
            '<div style="color:#8fb;margin-bottom:3px">Screen</div>' +
            '<div id="ldScenes" style="display:flex;flex-wrap:wrap;gap:3px"></div>' +
          "</div>" +
        "</div>" +
        '<div id="ldList" style="max-height:230px;overflow:auto;border-top:1px solid #2a3a60;margin-top:6px;padding-top:4px"></div>' +
        '<button id="ldDownload" style="width:100%;margin-top:8px;background:#1f8f43;color:#fff;border:0;border-radius:5px;cursor:pointer;font:inherit;font-weight:700;padding:7px">⬇ Download Layout JSON</button>' +
        '<div style="margin-top:6px;color:#8fa;font-size:10px;line-height:1.4">Drag to move · handles to resize · ` or Esc hides overlay</div>';

      panel.querySelector("#ldClose").addEventListener("click", toggle);
      panel.querySelector("#ldRescan").addEventListener("click", scan);
      panel.querySelector("#ldDownload").addEventListener("click", download);
      panel.querySelector("#ldNavToggle").addEventListener("click", function () {
        var nav = panel.querySelector("#ldNav");
        var open = nav.style.display === "none";
        nav.style.display = open ? "" : "none";
        panel.querySelector("#ldNavToggle").textContent = (open ? "▴" : "▾") + " Jump to screen";
        if (open) { buildNav(); }
      });
      buildNav();
    }

    function renderList() {
      var list = panel.querySelector("#ldList");
      if (!list) { return; }
      panel.querySelector("#ldScreen").textContent = currentScreenName();
      list.innerHTML = "";
      tracked.forEach(function (t) {
        var m = metrics(t.el);
        var row = document.createElement("div");
        row.dataset.id = t.id;
        row.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 2px;border-radius:4px;cursor:pointer;" +
          (t === selected ? "background:#3a4d22;" : "");
        row.innerHTML =
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + t.id + "</span>" +
          '<span class="ld-xy" style="color:#9fe9ff;font-variant-numeric:tabular-nums">' + m.x + "," + m.y + " · " + m.w + "×" + m.h + "</span>" +
          '<button class="ld-reset" style="background:#5a2a2a;color:#fff;border:0;border-radius:3px;cursor:pointer;font:inherit;padding:2px 5px">⟲</button>';
        row.addEventListener("click", function (e) {
          if (e.target.classList.contains("ld-reset")) { resetOne(t); return; }
          select(t);
        });
        list.appendChild(row);
        t.row = row;
      });
      if (panel.querySelector("#ldNav") && panel.querySelector("#ldNav").style.display !== "none") {
        buildNav();
      }
    }

    function updateRow(t) {
      if (!t.row) { return; }
      var m = metrics(t.el);
      var xy = t.row.querySelector(".ld-xy");
      if (xy) { xy.textContent = m.x + "," + m.y + " · " + m.w + "×" + m.h; }
    }

    function download() {
      var screen = currentScreenName();
      var assets = tracked.map(function (t) {
        var m = metrics(t.el);
        return { id: t.id, x: m.x, y: m.y, w: m.w, h: m.h };
      });
      var payload = { screen: screen, assets: assets };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      var stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = "layout_" + screen + "_" + stamp + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    /* ── visibility toggle ── */
    var visible = true;
    function toggle() {
      visible = !visible;
      layer.style.display = visible ? "" : "none";
      panel.style.display = visible ? "" : "none";
    }
    window.addEventListener("keydown", function (e) {
      if (e.key === "`" || e.key === "Escape") { toggle(); }
    });

    /* Keep boxes glued to their elements through animations/scroll/resize. */
    function tick() {
      if (visible) { syncAll(); }
      requestAnimationFrame(tick);
    }

    /* Auto re-scan when the game changes screen. */
    var lastSig = "";
    setInterval(function () {
      var sig = (window.state.step) + ":" + (window.state.round) + ":" + (window.state.tutActive ? "t" : "");
      if (sig !== lastSig) {
        lastSig = sig;
        setTimeout(scan, 220); /* let the new screen settle a frame */
      }
    }, 300);

    window.addEventListener("resize", function () { refreshScale(); syncAll(); });

    buildPanel();
    scan();
    requestAnimationFrame(tick);

    /* Public API (mirrors the skills.md register/setScreen contract) so the
       game can opt into explicit instrumentation later if desired. */
    window.DebugOverlay = {
      rescan: scan,
      setScreen: function () { scan(); },
      register: function (id, el) {
        if (el && tracked.every(function (t) { return t.el !== el; })) {
          instrument(el, id || assetIdFor(el, {}));
          syncAll(); renderList();
        }
      }
    };

    console.log("[layout-debug] active — " + tracked.length + " asset(s) on " + currentScreenName());
  }
})();
