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
    }
  };

  const descriptions = {
    help:   "list available commands",
    about:  "who is Emre",
    whoami: "print the current user",
    github: "open my github profile",
    email:  "get in touch by email",
    clear:  "clear the screen"
  };

  function run(raw) {
    const cmd = raw.trim();
    // Echo what the visitor typed, prefixed with the prompt.
    print("visitor@tosunbe:~$ " + cmd, "term-echo");
    if (cmd === "") return;

    const name = cmd.split(/\s+/)[0].toLowerCase();
    if (commands[name]) {
      commands[name]();
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
