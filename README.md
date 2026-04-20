# CarburantProject

Application web de visualisation des stations carburant (Mauritanie) avec :
- un backend Flask + PostgreSQL ;
- un frontend Angular + Leaflet ;
- un mode de deploiement local (dev) et un mode hybride (prod VM).

## 1) Architecture rapide

- `database/` : script SQL d'initialisation + fichier CSV source.
- `backendCarb/` : API Flask (`/test`, `/stations`) en lecture seule.
- `frontendCarb/` : application Angular (carte, filtres, liste stations).
- `docker-compose.yml` : environnement local developpement.
- `docker-compose.prod.yml` : deploiement hybride (images depuis registry + base locale).

## 2) Prerequis

- Docker Desktop (ou Docker Engine + Compose v2)
- Ports libres :
  - `4200` (frontend)
  - `5000` (backend)
  - `5432` (PostgreSQL)

## 3) Lancer en local (dev)

```bash
docker compose -f docker-compose.yml up --build -d
```

Verification :
- Frontend : `http://localhost:4200`
- Backend : `http://localhost:5000/test`

Arret :

```bash
docker compose -f docker-compose.yml down
```

## 4) Deploiement hybride (VM)

Objectif : sur la VM, conserver uniquement `database/` + `docker-compose.prod.yml`, puis tirer backend/frontend depuis le registry.

### 4.1 Publier les images (depuis la machine de build)

```bash
docker build -t aminetou01/backendcarb:1.0 ./backendCarb
docker build -f frontendCarb/Dockerfile.prod -t aminetou01/frontendcarb:1.0 ./frontendCarb
docker push aminetou01/backendcarb:1.0
docker push aminetou01/frontendcarb:1.0
```

### 4.2 Sur la VM

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Verification :
- Frontend : `http://<IP_VM>:4200`
- Backend : `http://<IP_VM>:5000/test`

## 5) Base de donnees et mode ephemere

- Base : `fuel_db`
- Chargement initial via `database/init.sql`
- Donnees CSV montees en lecture seule depuis `database/data`
- Stockage PostgreSQL en `tmpfs` (RAM) : a chaque recreation du conteneur DB, la base est reconstruite.

## 6) Endpoints backend

- `GET /test`
  - Retourne le nombre de stations presentes en base.
- `GET /stations?q=<terme>`
  - Retourne une liste de stations (coordonnees, prix, dates de mise a jour).
  - Le filtre `q` cherche sur `ville` ou `id`.

## 7) Diagnostic rapide

Etat des services :

```bash
docker compose ps
```

Logs :

```bash
docker compose logs frontend --tail 100
docker compose logs backend --tail 100
docker compose logs db --tail 100
```

Verifier qu'un port ecoute (Windows PowerShell) :

```powershell
netstat -ano | findstr :4200
```

## 8) Points d'attention

- Sans `depends_on`, les services peuvent demarrer dans n'importe quel ordre.
- Si `localhost:4200` est inaccessible :
  1. verifier `docker compose ps`,
  2. verifier les logs frontend,
  3. verifier le port 4200.

