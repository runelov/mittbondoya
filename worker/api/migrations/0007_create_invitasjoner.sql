-- Invitasjonslenker — erstatter manuell `wrangler d1 execute`-innsetting av
-- nye brukere (se konsept.md linje 135-136). Samme mønster som
-- innloggingstokens/sesjoner i migrations/0001: kun hash lagres, unix-ms-
-- epoch for utløp (ikke SQL datetime() — se begrunnelsen der).
CREATE TABLE invitasjoner (
  id INTEGER PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  opprettet_av_bruker_id INTEGER NOT NULL REFERENCES brukere(id),
  brukt INTEGER NOT NULL DEFAULT 0,
  brukt_av_bruker_id INTEGER REFERENCES brukere(id),
  utloper INTEGER NOT NULL,
  opprettet TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_invitasjoner_opprettet_av ON invitasjoner(opprettet_av_bruker_id);
