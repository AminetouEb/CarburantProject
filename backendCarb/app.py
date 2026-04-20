from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import os

app = Flask(__name__)
CORS(app)

def get_conn():
    """Cree une connexion PostgreSQL a partir des variables d'environnement."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT")
    )

@app.route("/test")
def test():
    """Endpoint de sante logique: retourne le nombre de stations en base."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM fuel_stations;")
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return jsonify({"stations": count})

@app.route("/stations")
def stations():
    """
    Retourne les stations (coordonnees + prix + dates).
    Parametre optionnel:
      - q: recherche par ville ou identifiant partiel.
    """
    query = request.args.get("q", "").strip()
    conn = get_conn()
    cur = conn.cursor()
    try:
        # Selection volontairement limitee aux colonnes utiles au frontend.
        base_sql = """
            SELECT
                id, latitude, longitude, adresse, ville,
                prix_gazole, prix_sp95, prix_e10, prix_sp98, prix_e85, prix_gplc,
                gazole_mis_a_jour_le, sp95_mis_a_jour_le, e10_mis_a_jour_le,
                sp98_mis_a_jour_le, e85_mis_a_jour_le, gplc_mis_a_jour_le
            FROM fuel_stations
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
        params = []
        if query:
            # Parametrage SQL pour eviter les injections.
            base_sql += " AND (LOWER(ville) LIKE LOWER(%s) OR CAST(id AS TEXT) LIKE %s)"
            like_query = f"%{query}%"
            params = [like_query, like_query]
        base_sql += " ORDER BY id ASC LIMIT 12000"
        cur.execute(base_sql, params)
        rows = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    stations_list = []
    for row in rows:
        # Mapping tuple SQL -> structure JSON attendue par l'UI.
        station = {
            "id": row[0],
            "latitude": row[1],
            "longitude": row[2],
            "adresse": row[3],
            "ville": row[4],
            "prix": {
                "gazole": row[5],
                "sp95": row[6],
                "e10": row[7],
                "sp98": row[8],
                "e85": row[9],
                "gplc": row[10],
            },
            "datesMiseAJour": {
                "gazole": row[11].isoformat() if row[11] else None,
                "sp95": row[12].isoformat() if row[12] else None,
                "e10": row[13].isoformat() if row[13] else None,
                "sp98": row[14].isoformat() if row[14] else None,
                "e85": row[15].isoformat() if row[15] else None,
                "gplc": row[16].isoformat() if row[16] else None,
            },
        }
        stations_list.append(station)

    return jsonify(stations_list)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)