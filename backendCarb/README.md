# BackendCarb

API Flask connectee a PostgreSQL (`fuel_db`).

## Variables d'environnement

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`

## Endpoints

- `GET /test` : retourne `{ "stations": <count> }`
- `GET /stations?q=<terme>` :
  - liste des stations avec coordonnees, prix et dates de mise a jour ;
  - filtre optionnel sur `ville` ou `id`.

## Lancer hors Docker (optionnel)

```bash
pip install -r requirements.txt
python app.py
```

API disponible sur `http://localhost:5000`.

