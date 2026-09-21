const IMAGES = [
  "a2VkaQ.webp",
  "aXJvbg.webp",
  "bGV1dmVu.webp",
  "bW9uY2hpY2hp.webp",
  "c25haWw.webp",
  "dHdlbnR5Zml2ZQ.webp",
  "dHJlZQ.webp",
  "YmVsZ2l1bQ.webp",
  "YXJlbmJlcmdmb3Jlc3Q.webp",
  "ZXNhdA.webp",
];

const img = document.querySelector(".frame img");
const bar = document.querySelector(".frame-bar");

function decode(name) {
  try {
    return atob(name.replace(/\.[^.]+$/, ""));
  } catch (e) {
    return name;
  }
}

if (img && bar) {
  const last = sessionStorage.getItem("image");
  const pool = IMAGES.length > 1 ? IMAGES.filter((name) => name !== last) : IMAGES;
  const name = pool[Math.floor(Math.random() * pool.length)];
  img.src = "assets/" + name;
  img.alt = decode(name);
  bar.textContent = name;
  sessionStorage.setItem("image", name);
}
