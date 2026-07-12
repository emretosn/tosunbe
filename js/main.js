// main.js, entry point for interactions and animations.

// Theme toggle: switch between light and dark, and remember the choice.
(function () {
  const btn = document.getElementById("theme-btn");
  if (!btn) return;

  btn.addEventListener("click", function () {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
})();

// Typewriter greeting: cycle through words, typing and deleting one letter
// at a time. The block cursor beside it blinks on its own through CSS.
(function () {
  const el = document.querySelector(".greeting");
  if (!el) return;

  const words = (el.dataset.words || "").split(",").map(function (w) {
    return w.trim();
  }).filter(Boolean);
  if (words.length === 0) return;

  // Honor the visitor's reduced-motion setting: show one word, no animation.
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    el.textContent = words[0];
    return;
  }

  const TYPE_MS = 110;      // delay between typing each letter
  const DELETE_MS = 55;     // delay between deleting each letter
  const HOLD_MS = 1400;     // pause once a word is fully typed
  const BETWEEN_MS = 400;   // pause after deleting, before the next word

  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const word = words[wordIndex];

    if (!deleting) {
      charIndex++;
      el.textContent = word.slice(0, charIndex);
      if (charIndex === word.length) {
        deleting = true;
        setTimeout(tick, HOLD_MS);
        return;
      }
      setTimeout(tick, TYPE_MS);
    } else {
      charIndex--;
      el.textContent = word.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        setTimeout(tick, BETWEEN_MS);
        return;
      }
      setTimeout(tick, DELETE_MS);
    }
  }

  tick();
})();
