-- Utvider artstype-skjemaet til å dekke insekter, edderkoppdyr, krypdyr,
-- amfibier, nesledyr (+svamper/kammaneter), pigghud (+armfotinger/kappedyr)
-- og leddormer — samme hull som fisk/skjell/krepsdyr i 0013: disse havnet
-- tidligere i "annet" fordi utledArtstype() (nå lib/taxonomi.js) manglet
-- grener for dem. Verifisert live 2026-07-16 mot faktiske Artsdatabanken-
-- treff (løpebille/admiral/veps/skorpionflue → Class "Insecta" på tvers av
-- fire ulike TaxonGroup; hjulspinnere/skogflått → Class "Arachnida"; snok →
-- Class "Reptilia"; buttsnutefrosk/salamander → Class "Amphibia";
-- sjøanemone/brennmanet/glassvamp → TaxonGroup "svamper, nesledyr,
-- kammaneter"; sjøstjerne/kråkebolle/sjøpølse/sjøpung → TaxonGroup
-- "Armfotinger, pigghuder, kappedyr"; igle → TaxonGroup "Leddormer").
--
-- Omdøper også "skjell" til "bløtdyr", siden TaxonGroup "Bløtdyr" dekker
-- hele Mollusca (landsnegl, blekksprut — ikke bare skjell). Ingen
-- eksisterende rader har artstype='skjell' i produksjon (sjekket
-- 2026-07-16: kun alge/annet/fugl/pattedyr/plante er i bruk), så
-- omdøpingen krever ingen dataoppdatering — kun UPDATE for sikkerhets
-- skyld i tilfelle lokal utviklings-DB har testdata.
--
-- SQLite støtter ikke å endre en CHECK-constraint direkte via ALTER TABLE —
-- samme ombygningsmønster som 0011/0013: ny tabell med oppdatert CHECK,
-- kopier data eksplisitt kolonne for kolonne, bytt navn.
UPDATE funn SET artstype = 'bløtdyr' WHERE artstype = 'skjell';

CREATE TABLE funn_ny (
  id INTEGER PRIMARY KEY,
  art_norsk TEXT NOT NULL,
  art_latinsk TEXT,
  art_taxon_id INTEGER,
  artstype TEXT NOT NULL CHECK (artstype IN (
    'fugl', 'sjøpattedyr', 'pattedyr', 'plante', 'alge', 'sopp', 'fisk',
    'bløtdyr', 'krepsdyr', 'insekt', 'edderkoppdyr', 'krypdyr', 'amfibium',
    'nesledyr', 'pigghud', 'leddorm', 'annet'
  )),
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
-- fysisk kolonnerekkefølge i den gamle tabellen (se 0011: SELECT * feilet
-- her fordi synlig_for_public ikke var med i den første kladden).
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
