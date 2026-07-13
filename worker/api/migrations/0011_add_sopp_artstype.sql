-- Legger til "sopp" som gyldig artstype. Kingdom Fungi hadde tidligere ingen
-- egen kategori og havnet i "annet" (se worker/api/src/routes/arter.js sin
-- utledArtstype()) — bekreftet 2026-07-13 at dette gjorde det umulig å
-- skille flere sopparter fra hverandre i artssøket (f.eks. søk på "multer").
--
-- SQLite støtter ikke å endre en CHECK-constraint direkte via ALTER TABLE —
-- bygger derfor om tabellen med samme mønster som SQLite-dokumentasjonen
-- anbefaler: ny tabell med oppdatert CHECK, kopier data, bytt navn.
CREATE TABLE funn_ny (
  id INTEGER PRIMARY KEY,
  art_norsk TEXT NOT NULL,
  art_latinsk TEXT,
  art_taxon_id INTEGER,
  artstype TEXT NOT NULL CHECK (artstype IN ('fugl','sjøpattedyr','pattedyr','plante','alge','sopp','annet')),
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  tidspunkt TEXT NOT NULL,
  bilde_r2_key TEXT,
  ki_konfidens REAL NOT NULL DEFAULT 0,
  ki_alternativer TEXT,
  registrert_av_bruker_id INTEGER NOT NULL REFERENCES brukere(id),
  registrert_av_kortnavn TEXT NOT NULL,
  opprettet TEXT NOT NULL DEFAULT (datetime('now')),
  synlig_for_public INTEGER NOT NULL DEFAULT 1
);

-- Eksplisitt kolonneliste begge veier (ikke SELECT *) — trygt uansett
-- fysisk kolonnerekkefølge i den gamle tabellen.
INSERT INTO funn_ny (
  id, art_norsk, art_latinsk, art_taxon_id, artstype, lat, lon, tidspunkt,
  bilde_r2_key, ki_konfidens, ki_alternativer, registrert_av_bruker_id,
  registrert_av_kortnavn, opprettet, synlig_for_public
)
SELECT
  id, art_norsk, art_latinsk, art_taxon_id, artstype, lat, lon, tidspunkt,
  bilde_r2_key, ki_konfidens, ki_alternativer, registrert_av_bruker_id,
  registrert_av_kortnavn, opprettet, synlig_for_public
FROM funn;

DROP TABLE funn;
ALTER TABLE funn_ny RENAME TO funn;

CREATE INDEX idx_funn_bruker ON funn(registrert_av_bruker_id);
