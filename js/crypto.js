// crypto.js
// ---------------------------------------------------------------------------
// Really encrypts the ASCII portrait with AES-256-GCM using the browser's
// Web Crypto API, then decrypts it on click with a character-by-character
// "decoding" reveal.
//
// The scramble you see is not the raw ciphertext (that would be a different
// shape). Instead we keep the portrait's silhouette and replace every visible
// character with a random one from the art's own alphabet, so it reads as
// "the portrait, but encrypted". The actual bytes are held as real AES-GCM
// ciphertext and genuinely decrypted before the reveal runs.
//
// Public entry points:
//   window.encryptAscii()  -> Promise<boolean>  (false if already encrypted)
//   Clicking the scrambled portrait decrypts it.
// ---------------------------------------------------------------------------

(function () {
  const pre = document.querySelector(".ascii-art");
  if (!pre || !window.crypto || !window.crypto.subtle) return;

  // The pristine art, captured once. Decryption must reproduce this exactly.
  const original = pre.textContent;

  // The alphabet used for the random scramble: every distinct visible glyph in
  // the portrait. Reusing the art's own characters keeps the look native.
  const CHARS = Array.from(new Set(original.replace(/[\n ]/g, "").split("")));
  function randChar() {
    return CHARS[(Math.random() * CHARS.length) | 0];
  }

  // state: "plain" | "encrypted" | "revealing"
  let state = "plain";
  let rafId = null;

  // Held between encrypt and decrypt so the round trip is real.
  let key = null;
  let iv = null;
  let cipher = null;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Replace every visible character with a random one; keep spaces and
  // newlines so the silhouette and layout stay intact.
  function scrambleArray() {
    const arr = original.split("");
    for (let i = 0; i < arr.length; i++) {
      const ch = arr[i];
      if (ch !== "\n" && ch !== " ") arr[i] = randChar();
    }
    return arr;
  }

  async function encrypt() {
    if (state !== "plain") return false;

    // Genuine AES-256-GCM: fresh key and random 96-bit IV each time.
    key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
    iv = crypto.getRandomValues(new Uint8Array(12));
    cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv }, key, encoder.encode(original)
    );

    pre.textContent = scrambleArray().join("");
    pre.classList.add("is-encrypted");
    state = "encrypted";
    return true;
  }

  async function decrypt() {
    if (state !== "encrypted") return;
    state = "revealing";
    pre.classList.remove("is-encrypted");

    // Really decrypt the ciphertext back to the original text.
    let target = original;
    try {
      const plainBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv }, key, cipher
      );
      target = decoder.decode(plainBuf);
    } catch (_) {
      target = original;   // fall back to the known art if anything goes wrong
    }

    // Reveal in reading order (top-left to bottom-right). Characters not yet
    // revealed keep flickering with random glyphs for the decoding effect.
    const display = scrambleArray();
    const n = target.length;
    const perFrame = Math.max(1, Math.ceil(n / 150));   // ~2.5s reveal at 60fps
    let idx = 0;

    function frame() {
      const end = Math.min(n, idx + perFrame);
      for (; idx < end; idx++) display[idx] = target[idx];
      for (let k = idx; k < n; k++) {
        const t = target[k];
        if (t !== "\n" && t !== " ") display[k] = randChar();
      }
      pre.textContent = display.join("");
      if (idx < n) {
        rafId = requestAnimationFrame(frame);
      } else {
        pre.textContent = original;   // pixel-perfect restore
        cleanup();
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    key = iv = cipher = null;
    state = "plain";
  }

  // Clicking the scrambled portrait decrypts it.
  pre.addEventListener("click", function () {
    if (state === "encrypted") decrypt();
  });

  window.encryptAscii = encrypt;
})();
