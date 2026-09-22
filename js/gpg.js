const emailLink = document.getElementById("email-link");
const gpgLine = document.getElementById("gpg-line");
let pinned = false;

if (emailLink && gpgLine) {
  emailLink.addEventListener("mouseenter", () => {
    gpgLine.classList.add("show");
  });

  emailLink.addEventListener("mouseleave", () => {
    if (!pinned) {
      gpgLine.classList.remove("show");
    }
  });

  emailLink.addEventListener("click", () => {
    pinned = true;
  });
}
