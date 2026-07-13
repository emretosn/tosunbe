// heap.js
// ---------------------------------------------------------------------------
// Turns the ASCII portrait into a "falling sand" simulation: every character
// becomes a grain that pours down, piles up on whatever is beneath it, and
// slides sideways into a heap. This is NOT real fluid physics. It is a
// cellular automaton on a grid, which is cheap enough to run at 60fps while
// still reading as pouring and piling into a heap.
//
// The whole thing runs on a single <canvas> so the browser paints once per
// frame instead of animating thousands of DOM nodes.
//
// Public entry point: window.heapAscii()
//   Called by the terminal "heap" command. Snaps back to the original art on
//   the next click or key press.
// ---------------------------------------------------------------------------

(function () {
  const pre = document.querySelector(".ascii-art");
  const termWindow = document.querySelector(".term-window");
  if (!pre || !termWindow) return;

  // Only one heap animation can run at a time. These live across a run.
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let running = false;

  // The simulation grid. grid[row][col] holds a character, or null if empty.
  let grid = [];
  let rows = 0;
  let cols = 0;

  // Pixel size of one grid cell, measured from the real portrait so the first
  // frame lines up exactly with the art it replaces.
  let cellW = 0;
  let cellH = 0;
  let fontPx = 0;
  let fontFamily = "monospace";
  let fgColor = "#d0d0d0";

  // Where the canvas sits on screen (viewport coordinates, fixed positioning).
  let basin = { left: 0, top: 0, width: 0, height: 0 };

  // Read the exact font the portrait uses, so our canvas glyphs match it.
  function readMetrics() {
    const cs = getComputedStyle(pre);
    fontPx = parseFloat(cs.fontSize);
    fontFamily = cs.fontFamily;
    fgColor = cs.color;
    // line-height may come back as "normal"; fall back to a tight ratio.
    const lh = parseFloat(cs.lineHeight);
    cellH = isNaN(lh) ? fontPx * 1.1 : lh;
  }

  // Parse the portrait text into rows of characters and find its width.
  function parseArt() {
    // Strip a single leading and trailing newline the <pre> adds, but keep
    // interior blank lines so vertical spacing is preserved.
    const text = pre.textContent.replace(/^\n/, "").replace(/\n$/, "");
    const lines = text.split("\n");
    let maxCols = 0;
    for (const line of lines) maxCols = Math.max(maxCols, line.length);
    return { lines: lines, artCols: maxCols };
  }

  // Build the canvas, size it to the terminal's width (so the heap can spread
  // that wide) and the height from the art top down to the terminal top (the
  // floor the grains pool on).
  function setup() {
    readMetrics();

    // Measure one character's advance width in the portrait's own font.
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = fontPx + "px " + fontFamily;
    cellW = probe.measureText("m").width || fontPx * 0.6;

    const artRect = pre.getBoundingClientRect();
    const termRect = termWindow.getBoundingClientRect();

    // The basin: as wide as the terminal, spanning exactly the art's own
    // height. The floor sits where the art originally ended, so the heap keeps
    // the same gap to the terminal that the resting portrait has.
    basin.left = termRect.left;
    basin.width = termRect.width;
    basin.top = artRect.top;
    basin.height = artRect.height;

    cols = Math.max(1, Math.floor(basin.width / cellW));
    rows = Math.max(1, Math.floor(basin.height / cellH));

    // Empty grid.
    grid = new Array(rows);
    for (let r = 0; r < rows; r++) grid[r] = new Array(cols).fill(null);

    // Seed the grid with the portrait, centered horizontally in the basin so
    // it starts exactly where the real art was before we hid it.
    const art = parseArt();
    const offsetX = Math.floor((cols - art.artCols) / 2);
    for (let y = 0; y < art.lines.length && y < rows; y++) {
      const line = art.lines[y];
      for (let x = 0; x < line.length; x++) {
        const ch = line[x];
        if (ch === " ") continue;
        const c = offsetX + x;
        if (c >= 0 && c < cols) grid[y][c] = ch;
      }
    }

    // Create and place the canvas over the basin.
    canvas = document.createElement("canvas");
    canvas.className = "heap-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.left = basin.left + "px";
    canvas.style.top = basin.top + "px";
    canvas.style.width = basin.width + "px";
    canvas.style.height = basin.height + "px";
    canvas.style.zIndex = "50";           // above content, below the CV window
    canvas.style.pointerEvents = "auto";  // the heap itself is the click target
    canvas.style.cursor = "pointer";

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(basin.width * dpr);
    canvas.height = Math.floor(basin.height * dpr);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = fontPx + "px " + fontFamily;
    ctx.textBaseline = "top";
    ctx.fillStyle = fgColor;

    // Clicking the heap snaps the portrait back.
    canvas.addEventListener("click", restore);

    document.body.appendChild(canvas);
    pre.style.visibility = "hidden";       // hide the real art while it heaps
  }

  // One tick of the falling-sand rules. Returns true if anything moved, so we
  // can stop the loop once the heap has fully settled.
  function step() {
    let moved = false;
    // Scan from the bottom row upward. A grain that falls into row r+1 was
    // already processed this frame (bottom-up), so it never moves twice.
    for (let r = rows - 2; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        const ch = grid[r][c];
        if (ch === null) continue;

        // 1) Straight down if the cell below is empty.
        if (grid[r + 1][c] === null) {
          grid[r + 1][c] = ch;
          grid[r][c] = null;
          moved = true;
          continue;
        }

        // 2) Otherwise slide diagonally down. Pick a random side first so the
        //    heap does not lean consistently one way.
        const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
        for (let i = 0; i < 2; i++) {
          const nc = c + dirs[i];
          if (nc < 0 || nc >= cols) continue;
          if (grid[r + 1][nc] === null) {
            grid[r + 1][nc] = ch;
            grid[r][c] = null;
            moved = true;
            break;
          }
        }
      }
    }
    return moved;
  }

  // Draw the current grid state.
  function render() {
    ctx.clearRect(0, 0, basin.width, basin.height);
    for (let r = 0; r < rows; r++) {
      const row = grid[r];
      const y = r * cellH;
      for (let c = 0; c < cols; c++) {
        const ch = row[c];
        if (ch !== null) ctx.fillText(ch, c * cellW, y);
      }
    }
  }

  function loop() {
    if (!running) return;
    // A couple of substeps per frame makes the pour feel liquid rather than
    // like a slow, chunky drop.
    const moved = step() || step();
    render();
    if (moved) {
      rafId = requestAnimationFrame(loop);
    } else {
      running = false;   // settled: stop drawing, keep the heap on screen
    }
  }

  // Instantly return to the original portrait.
  function restore() {
    if (!canvas) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    canvas.remove();       // also drops its click listener
    canvas = null;
    ctx = null;
    pre.style.visibility = "";
  }

  function start() {
    if (canvas) return;    // ignore a second heap while one is on screen
    setup();
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  // Exposed for the terminal "heap" command.
  window.heapAscii = start;
})();
