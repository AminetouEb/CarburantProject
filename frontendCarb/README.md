# FrontendCarb

Interface Angular de visualisation des stations carburant :
- carte Leaflet (cluster de marqueurs),
- recherche texte (ville/id),
- filtres carburant et prix max,
- panneau de details de station.

## Lancer en developpement

```bash
npm install
npm start
```

Application disponible sur `http://localhost:4200`.

## Build production

```bash
npm run build
```

Le build est genere dans `dist/`.

## Variables/API

Le frontend appelle actuellement l'API via :
- `http://localhost:5000/stations`

En deploiement prod via Nginx, le proxy `/api` est configure dans `default.conf.template`.

## Fichiers importants

- `src/app/app.ts` : logique principale (chargement, filtres, carte, marqueurs)
- `src/app/app.html` : structure UI
- `src/app/app.css` : styles
- `Dockerfile` : image dev
- `Dockerfile.prod` : build Angular + runtime Nginx
