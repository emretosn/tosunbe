# emre.tosun.be

Personal site. Static, no build step. One small script: picks a random image on refresh.
Palette: MSX2 16-color hardware palette.

## Structure
```
index.html              single page
css/styles.css          styling, msx palette tokens
js/images.js            random image picker
assets/                 dithered artwork
```

## Run locally
```
python3 -m http.server 8000
```
then visit http://localhost:8000

(Opening index.html directly in a browser also works.)

## Deploy
Static, deploys to Cloudflare Pages with no build command.
