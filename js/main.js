// main.js, entry point for the terminal emulator.


// Terminal emulator: a small command interpreter.
(function () {
  const form = document.getElementById("term-form");
  const input = document.getElementById("term-input");
  const output = document.getElementById("term-output");
  const mirror = document.getElementById("term-mirror");
  if (!form || !input || !output) return;

  const GITHUB_URL = "https://github.com/emretosn";
  const EMAIL = "info.emre@tosun.be";
  const CV_UPDATED = "July 2026";

  // Keep the visible mirror text in sync with the real (transparent) input,
  // so the block cursor sits right after what the visitor has typed.
  function syncMirror() {
    if (mirror) mirror.textContent = input.value;
  }
  input.addEventListener("input", syncMirror);

  // Print a line to the output area. When isHtml is true the content may
  // contain markup (used for links), otherwise it is inserted as plain text.
  function print(content, className, isHtml) {
    const line = document.createElement("div");
    line.className = "line" + (className ? " " + className : "");
    if (isHtml) {
      line.innerHTML = content;
    } else {
      line.textContent = content;
    }
    output.appendChild(line);
  }

  // Escape untrusted text before placing it near innerHTML.
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
      }[c];
    });
  }

  // The command registry. Each command prints its own output.
  const commands = {
    help: function () {
      print("available commands:");
      Object.keys(commands).sort().forEach(function (name) {
        print("  " + name.padEnd(8) + " " + descriptions[name]);
      });
    },
    about: function () {
      print("Emre Tosun, a security focused engineer and researcher");
      print("who loves working where cryptography, AI and cloud meet.");
    },
    whoami: function () {
      print("visitor");
    },
    github: function () {
      print('<a href="' + GITHUB_URL + '" target="_blank" ' +
            'rel="noopener">' + escapeHtml(GITHUB_URL) + "</a>", null, true);
    },
    email: function () {
      print('<a href="mailto:' + EMAIL + '">' +
            escapeHtml(EMAIL) + "</a>", null, true);
    },
    clear: function () {
      output.innerHTML = "";
    },
    open: function (args) {
      const target = (args[0] || "").toLowerCase();
      if (target === "cv.pdf" || target === "cv") {
        print("Opening CV: Last updated " + CV_UPDATED);
        if (typeof window.openCvWindow === "function") window.openCvWindow();
      } else if (!target) {
        print("usage: open cv.pdf", "term-error");
      } else {
        print("cannot open: " + target, "term-error");
      }
    }
  };

  const descriptions = {
    help:   "list available commands",
    about:  "who is Emre",
    whoami: "print the current user",
    github: "open my github profile",
    email:  "get in touch by email",
    open:   "open cv.pdf in a window",
    clear:  "clear the screen"
  };

  function run(raw) {
    const cmd = raw.trim();
    // Echo what the visitor typed, prefixed with the prompt.
    print("visitor@tosunbe:~$ " + cmd, "term-echo");
    if (cmd === "") return;

    const parts = cmd.split(/\s+/);
    const name = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (commands[name]) {
      commands[name](args);
    } else {
      print("command not found: " + name + ". type 'help'.", "term-error");
    }
  }

  const terminal = document.getElementById("terminal");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    run(input.value);
    input.value = "";
    syncMirror();
    terminal.scrollTop = terminal.scrollHeight;   // keep the input line in view
  });

  // Clicking anywhere in the box focuses the input, like a real terminal.
  terminal.addEventListener("click", function () {
    input.focus();
  });

  // Greet the visitor on load.
  print("welcome. type 'help' to see available commands.");
  input.focus();
})();

// tmux status clock: mimic the default tmux status-right format "%H:%M %d-%b-%y".
(function () {
  const clock = document.getElementById("tmux-clock");
  if (!clock) return;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function pad(n) { return String(n).padStart(2, "0"); }

  function render() {
    const d = new Date();
    const time = pad(d.getHours()) + ":" + pad(d.getMinutes());
    const date = pad(d.getDate()) + "-" + months[d.getMonth()] + "-" +
                 String(d.getFullYear()).slice(-2);
    clock.textContent = time + " " + date;
  }

  render();
  setInterval(render, 1000);
})();

// CV window: a draggable, resizable macOS-style window showing the CV PDF.
// The PDF is rendered by the browser's native viewer inside an iframe, which
// handles scrolling and zoom, so no PDF library is needed.
(function () {
  const win = document.getElementById("cv-window");
  const titlebar = document.getElementById("cv-titlebar");
  const closeBtn = document.getElementById("cv-close");
  const frame = document.getElementById("cv-frame");
  const handles = document.querySelectorAll(".win-resize");
  if (!win || !titlebar || !frame) return;

  const CV_SRC = "assets/Emre_Tosun.pdf";
  const MIN_W = 320;
  const MIN_H = 240;

  // On touch devices the window is fixed and padded (positioned by CSS), so we
  // skip dragging and clear any inline size/position that JS may have set.
  const mobileQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
  function isMobile() { return mobileQuery.matches; }
  function clearInlineBox() {
    win.style.left = win.style.top = win.style.width = win.style.height = "";
  }
  // Re-clear when rotating into (or resizing down to) the mobile layout.
  mobileQuery.addEventListener("change", function (e) {
    if (e.matches) {
      clearInlineBox();
      win.classList.remove("win--docked", "win--entering");
      document.body.classList.remove("cv-docked");
      document.body.style.removeProperty("--cv-reserve");
    }
  });

  function reservedSpace() {
    // Space the docked panel needs on the right: its own width, its gap from
    // the screen edge, and a matching gap between it and the content.
    const gap = 1.5 * parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    return win.offsetWidth + gap * 2;
  }

  function dockWidthUpdate() {
    document.body.style.setProperty("--cv-reserve", reservedSpace() + "px");
  }

  let closeTimer = null;

  function openCV() {
    // Load the PDF lazily the first time the window opens.
    if (frame.getAttribute("src") !== CV_SRC) frame.setAttribute("src", CV_SRC);
    clearTimeout(closeTimer);
    win.hidden = false;
    if (isMobile()) { clearInlineBox(); return; }   // CSS handles placement

    // Desktop: dock as a static A4 panel on the right and let the content
    // column slide left to sit beside it.
    clearInlineBox();                 // drop any leftover drag position
    win.classList.add("win--docked", "win--entering");
    // Force a layout read so the panel has real dimensions before we measure.
    dockWidthUpdate();
    document.body.classList.add("cv-docked");
    // Next frame: remove the entering offset so it slides into place.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { win.classList.remove("win--entering"); });
    });
  }

  function closeCV() {
    if (isMobile() || !win.classList.contains("win--docked")) {
      win.hidden = true;
      return;
    }
    // Desktop: slide the panel back out while the content floats to center.
    win.classList.add("win--entering");
    document.body.classList.remove("cv-docked");
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      win.hidden = true;
      win.classList.remove("win--docked", "win--entering");
      document.body.style.removeProperty("--cv-reserve");
    }, 460);
  }

  // Keep the reserved space correct if the viewport is resized while docked
  // (the A4 width tracks the viewport height).
  window.addEventListener("resize", function () {
    if (document.body.classList.contains("cv-docked")) dockWidthUpdate();
  });

  // Expose the opener so the terminal command can call it.
  window.openCvWindow = openCV;

  closeBtn.addEventListener("click", closeCV);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !win.hidden) closeCV();
  });

  // While dragging or resizing, disable pointer events on the iframe so it
  // does not swallow the pointermove events.
  function beginInteraction() { frame.style.pointerEvents = "none"; }
  function endInteraction() { frame.style.pointerEvents = ""; }

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  // Drag the window by its title bar, kept fully inside the viewport.
  let dragging = false, dsx, dsy, dox, doy;
  titlebar.addEventListener("pointerdown", function (e) {
    if (e.target === closeBtn || isMobile() ||
        win.classList.contains("win--docked")) return;
    dragging = true;
    dsx = e.clientX; dsy = e.clientY;
    const r = win.getBoundingClientRect();
    dox = r.left; doy = r.top;
    beginInteraction();
    titlebar.setPointerCapture(e.pointerId);
  });
  titlebar.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    const maxLeft = window.innerWidth - win.offsetWidth;
    const maxTop = window.innerHeight - win.offsetHeight;
    win.style.left = clamp(dox + e.clientX - dsx, 0, Math.max(0, maxLeft)) + "px";
    win.style.top = clamp(doy + e.clientY - dsy, 0, Math.max(0, maxTop)) + "px";
  });
  function stopDrag(e) {
    if (!dragging) return;
    dragging = false;
    endInteraction();
    try { titlebar.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  titlebar.addEventListener("pointerup", stopDrag);
  titlebar.addEventListener("pointercancel", stopDrag);

  // Resize from any of the four corners, staying within the viewport.
  let resizing = null, rsx, rsy, rleft, rtop, rw, rh, activeHandle;
  handles.forEach(function (handle) {
    handle.addEventListener("pointerdown", function (e) {
      if (win.classList.contains("win--docked")) return;
      resizing = handle.dataset.dir;
      activeHandle = handle;
      rsx = e.clientX; rsy = e.clientY;
      const r = win.getBoundingClientRect();
      rleft = r.left; rtop = r.top; rw = r.width; rh = r.height;
      beginInteraction();
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener("pointermove", function (e) {
      if (resizing !== handle.dataset.dir) return;
      const dir = resizing;
      const dx = e.clientX - rsx;
      const dy = e.clientY - rsy;
      let left = rleft, top = rtop, w = rw, h = rh;

      if (dir.indexOf("e") !== -1) w = rw + dx;
      if (dir.indexOf("s") !== -1) h = rh + dy;
      if (dir.indexOf("w") !== -1) { w = rw - dx; left = rleft + dx; }
      if (dir.indexOf("n") !== -1) { h = rh - dy; top = rtop + dy; }

      // Enforce minimum size, keeping the opposite edge anchored.
      if (w < MIN_W) { if (dir.indexOf("w") !== -1) left -= (MIN_W - w); w = MIN_W; }
      if (h < MIN_H) { if (dir.indexOf("n") !== -1) top -= (MIN_H - h); h = MIN_H; }

      // Keep the window within the viewport edges.
      if (left < 0) { w += left; left = 0; }
      if (top < 0) { h += top; top = 0; }
      if (left + w > window.innerWidth) w = window.innerWidth - left;
      if (top + h > window.innerHeight) h = window.innerHeight - top;

      win.style.left = left + "px";
      win.style.top = top + "px";
      win.style.width = Math.max(MIN_W, w) + "px";
      win.style.height = Math.max(MIN_H, h) + "px";
    });
    function stopResize(e) {
      if (resizing !== handle.dataset.dir) return;
      resizing = null;
      endInteraction();
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    handle.addEventListener("pointerup", stopResize);
    handle.addEventListener("pointercancel", stopResize);
  });
})();

/* ============================================================
   Fluid background: a faint grid of 0/1 bits whose brightness
   ripples like slow waves. Drawn on a single canvas for speed,
   so the browser paints once per frame instead of animating
   thousands of DOM nodes.
   ============================================================ */
(function () {
  const canvas = document.getElementById("fluid-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  // If the visitor prefers reduced motion, draw one static frame
  // and never animate.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CELL = 18;          // pixel size of one bit cell
  const BASE_ALPHA = 0.03;  // faint floor so it never distracts
  const WAVE_ALPHA = 0.035; // how much the ripple brightens a cell
  const FONT_PX = 12;

  let cols = 0, rows = 0;
  let bits = [];            // fixed 0/1 value per cell, assigned once
  let width = 0, height = 0;

  // Match the canvas to the screen and account for high-DPI displays
  // so the text stays crisp without over-drawing.
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT_PX + "px " +
      'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
    ctx.textBaseline = "top";

    cols = Math.ceil(width / CELL);
    rows = Math.ceil(height / CELL);
    bits = new Array(cols * rows);
    for (let i = 0; i < bits.length; i++) {
      bits[i] = Math.random() < 0.5 ? "0" : "1";
    }
  }

  // One frame: for every cell, a moving sine field decides its
  // brightness so waves appear to travel across the grid.
  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const t = time * 0.0006;   // slow time scale = calm waves
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const wave = Math.sin(x * 0.18 + y * 0.12 + t) *
                     Math.cos(x * 0.05 - y * 0.16 - t * 0.7);
        const alpha = BASE_ALPHA + Math.max(0, wave) * WAVE_ALPHA;
        ctx.fillStyle = "rgba(255, 255, 255, " + alpha.toFixed(3) + ")";
        ctx.fillText(bits[y * cols + x], x * CELL, y * CELL);
      }
    }
  }

  let running = false;
  function loop(time) {
    if (!running) return;
    draw(time);
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
  }

  // Pause when the tab is hidden so it costs no battery in the background.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (reduceMotion) draw(0);
    }, 150);
  });

  resize();
  if (reduceMotion) draw(0);
  else start();
})();
