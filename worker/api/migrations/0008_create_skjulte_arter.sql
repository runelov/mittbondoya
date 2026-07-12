-- Erstatter den hardkodede SKJULT_FOR_PUBLIC_TAXON_IDER-settet i
-- worker/api/src/lib/artsvisibility.js — se konsept.md "Arter & synlighet".
-- lagt_til_av_bruker_id er nullable: seed-radene under representerer ingen
-- faktisk admin-handling (de var hardkodet fra før), kun rader admin legger
-- til fra nå av vil ha denne satt.
CREATE TABLE skjulte_arter (
  taxon_id INTEGER PRIMARY KEY,
  visningsnavn TEXT NOT NULL,
  grunn TEXT,
  lagt_til_av_bruker_id INTEGER REFERENCES brukere(id),
  opprettet TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Samme 7 rødlistede artene (NT/VU/EN, Norsk Rødliste 2021) som var
-- hardkodet i artsvisibility.js — uendret oppførsel ved lansering.
INSERT INTO skjulte_arter (taxon_id, visningsnavn, grunn) VALUES
  (3491, 'Ærfugl', 'Rødlistet (VU) — Norsk Rødliste 2021'),
  (3863, 'Storskarv', 'Rødlistet (NT) — Norsk Rødliste 2021'),
  (3562, 'Teist', 'Rødlistet (NT) — Norsk Rødliste 2021'),
  (203546, 'Krykkje', 'Rødlistet (EN) — Norsk Rødliste 2021'),
  (3624, 'Gråmåke', 'Rødlistet (VU) — Norsk Rødliste 2021'),
  (3628, 'Fiskemåke', 'Rødlistet (VU) — Norsk Rødliste 2021'),
  (203529, 'Tjeld', 'Rødlistet (NT) — Norsk Rødliste 2021');
