# site

Minimal personal site with a terminal-like ASCII aesthetic.

## Structure
```
site/
  index.html      single page
  css/styles.css  terminal-like styling
  js/main.js      interactions & animations
  assets/         ascii, icons...
```

## Run locally
Open `index.html` in a browser, or serve it:
```
python3 -m http.server
```
then visit http://localhost:8000

## Deploy
Static, deploys to Cloudflare Pages with no build command.
