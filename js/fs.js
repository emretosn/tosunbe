// fs.js
// ---------------------------------------------------------------------------
// A tiny pseudo filesystem for the terminal. It is just an in-memory map of
// file names to contents, exposed as window.vfs. main.js wires the ls, cat
// and pwd commands onto it. Keeping the data here separates "what files exist"
// from "how the terminal shows them".
// ---------------------------------------------------------------------------

(function () {
  // Each entry is a file. Text files have a "content" string. Binary files
  // (like the PDF) have no readable content, only a hint for cat.
  const FILES = {
    "about.txt": {
      content:
        "Emre Tosun, a security focused engineer and researcher\n" +
        "who loves working where cryptography, AI and cloud meet."
    },
    "cv.pdf": {
      binary: true,
      hint: "cat: cv.pdf: binary file, run: open cv.pdf"
    }
  };

  const HOME = "/home/visitor";   // what pwd reports; the prompt shows this as ~

  window.vfs = {
    // File names, sorted, for ls.
    list: function () {
      return Object.keys(FILES).sort();
    },
    exists: function (name) {
      return Object.prototype.hasOwnProperty.call(FILES, name);
    },
    get: function (name) {
      return FILES[name];
    },
    home: function () {
      return HOME;
    }
  };
})();
