-- =========================================
-- 1. TABLE PRINCIPALE : stations carburant
-- =========================================

CREATE TABLE fuel_stations (
    id BIGINT PRIMARY KEY,

    -- localisation
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    code_postal TEXT,
    pop TEXT,
    adresse TEXT,
    ville TEXT,
    departement TEXT,
    code_departement TEXT,
    region TEXT,
    code_region TEXT,

    geom TEXT,

    -- horaires / services
    horaires TEXT,
    horaires_details TEXT,
    services TEXT,
    prix TEXT,
    services_proposes TEXT,
    automate_24_24 TEXT,

    -- disponibilité carburants
    carburants_disponibles TEXT,
    carburants_indisponibles TEXT,
    carburants_en_rupture_temporaire TEXT,
    carburants_en_rupture_definitive TEXT,
    rupture TEXT,

    -- =========================
    -- PRIX CARBURANTS
    -- =========================
    prix_gazole DOUBLE PRECISION,
    prix_sp95 DOUBLE PRECISION,
    prix_e85 DOUBLE PRECISION,
    prix_gplc DOUBLE PRECISION,
    prix_e10 DOUBLE PRECISION,
    prix_sp98 DOUBLE PRECISION,

    -- dates mise à jour
    gazole_mis_a_jour_le DATE,
    sp95_mis_a_jour_le DATE,
    e85_mis_a_jour_le DATE,
    gplc_mis_a_jour_le DATE,
    e10_mis_a_jour_le DATE,
    sp98_mis_a_jour_le DATE,

    -- ruptures détaillées
    debut_rupture_e10 DATE,
    type_rupture_e10 TEXT,

    debut_rupture_sp98 DATE,
    type_rupture_sp98 TEXT,

    debut_rupture_sp95 DATE,
    type_rupture_sp95 TEXT,

    debut_rupture_e85 DATE,
    type_rupture_e85 TEXT,

    debut_rupture_gplc DATE,
    type_rupture_gplc TEXT,

    debut_rupture_gazole DATE,
    type_rupture_gazole TEXT
);

-- =========================================
-- 2. IMPORT CSV (FR / MAURITANIE SIMULATION)
-- =========================================

COPY fuel_stations(
    id,
    latitude,
    longitude,
    code_postal,
    pop,
    adresse,
    ville,
    horaires,
    services,
    prix,
    rupture,
    geom,

    gazole_mis_a_jour_le,
    prix_gazole,

    sp95_mis_a_jour_le,
    prix_sp95,

    e85_mis_a_jour_le,
    prix_e85,

    gplc_mis_a_jour_le,
    prix_gplc,

    e10_mis_a_jour_le,
    prix_e10,

    sp98_mis_a_jour_le,
    prix_sp98,

    debut_rupture_e10,
    type_rupture_e10,

    debut_rupture_sp98,
    type_rupture_sp98,

    debut_rupture_sp95,
    type_rupture_sp95,

    debut_rupture_e85,
    type_rupture_e85,

    debut_rupture_gplc,
    type_rupture_gplc,

    debut_rupture_gazole,
    type_rupture_gazole,

    carburants_disponibles,
    carburants_indisponibles,
    carburants_en_rupture_temporaire,
    carburants_en_rupture_definitive,

    automate_24_24,
    services_proposes,
    departement,
    code_departement,
    region,
    code_region,
    horaires_details
)
FROM '/data/prix-des-carburants.csv'
DELIMITER ';'
CSV HEADER;

-- =========================================
-- 3. INDEX POUR PERFORMANCE (IMPORTANT)
-- =========================================

CREATE INDEX idx_fuel_ville ON fuel_stations(ville);
CREATE INDEX idx_fuel_geo ON fuel_stations(latitude, longitude);
CREATE INDEX idx_fuel_prix ON fuel_stations(prix_gazole);

-- Utilisateur lecture seule pour l’API (mot de passe aligné avec docker-compose).
CREATE ROLE app_readonly WITH LOGIN PASSWORD '1234';
GRANT CONNECT ON DATABASE fuel_db TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;