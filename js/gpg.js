const emailLink = document.getElementById("email-link");
const gpgLine = document.getElementById("gpg-line");

if (emailLink && gpgLine) {
  emailLink.addEventListener(
    "mouseenter",
    () => {
      gpgLine.classList.add("show");
    },
    { once: true }
  );
}
