// fs.js
// ---------------------------------------------------------------------------
// A tiny pseudo filesystem for the terminal. It is just an in-memory map of
// file names to contents, exposed as window.vfs. main.js wires the ls, cat
// and pwd commands onto it. Keeping the data here separates "what files exist"
// from "how the terminal shows them".
// ---------------------------------------------------------------------------

(function () {
  // Each entry is a file. Text files have a "content" string. Binary files
  // (like the PDF) carry only a hint for cat. Dotfiles (names starting with
  // ".") are hidden from a plain ls and only appear with "ls -a", just like a
  // real shell. "rootOnlyRead" files exist and are visible with -a, but cat
  // refuses to read them unless you are root (a real "Permission denied").
  const FILES = {
    "about.txt": {
      content:
        "Emre Tosun, a security focused engineer and researcher\n" +
        "who loves working where cryptography, AI and cloud meet."
    },
    "cv.pdf": {
      binary: true,
      hint: "cat: cv.pdf: binary file, run: open cv.pdf"
    },
    ".secrets": {
      rootOnlyRead: true,
      content:
        "root@tosunbe secrets\n" +
        "hidden abilities as root:\n" +
        "\n" +
        "  heap      pour the ascii portrait into a heap, then click to restore\n" +
        "  encrypt   encrypt the portrait with AES-256-GCM, click it to decrypt\n"
    }
  };

  const HOME = "/home/visitor";   // what pwd reports; the prompt shows this as ~

  function has(map, name) {
    return Object.prototype.hasOwnProperty.call(map, name);
  }

  window.vfs = {
    // File names, sorted, for ls. Dotfiles are hidden unless showAll ("-a").
    list: function (showAll) {
      return Object.keys(FILES).filter(function (n) {
        return showAll || n.charAt(0) !== ".";
      }).sort();
    },
    exists: function (name) {
      return has(FILES, name);
    },
    get: function (name) {
      return has(FILES, name) ? FILES[name] : undefined;
    },
    home: function () {
      return HOME;
    }
  };
})();
