-- Funn (artsobservasjoner): erstatter data/funn.json i bondoya-db.
-- Se konsept.md ("Fase 3") og Milestone B-planen for begrunnelsen bak
-- eierskaps-denormaliseringen og TEXT-tidsstempelet under.

CREATE TABLE funn (
  id INTEGER PRIMARY KEY,
  art_norsk TEXT NOT NULL,
  art_latinsk TEXT,
  art_taxon_id INTEGER,
  artstype TEXT NOT NULL CHECK (artstype IN ('fugl','sjøpattedyr','pattedyr','plante','alge','annet')),
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  -- ISO 8601 UTC-streng, alltid generert av JS (aldri SQL datetime()) —
  -- trygt å sortere leksikografisk som TEXT siden formatet er konsistent.
  tidspunkt TEXT NOT NULL,
  bilde_r2_key TEXT,
  ki_konfidens REAL NOT NULL DEFAULT 0,
  ki_alternativer TEXT,
  -- Bevisst ingen ON DELETE CASCADE (i motsetning til sesjoner/innloggingstokens):
  -- funn skal bli stående med kortnavnet når en bruker slettes permanent.
  registrert_av_bruker_id INTEGER NOT NULL REFERENCES brukere(id),
  registrert_av_kortnavn TEXT NOT NULL,
  opprettet TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_funn_bruker ON funn(registrert_av_bruker_id);
