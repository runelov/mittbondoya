-- Kort overlappende gyldighet for FORRIGE sesjonstoken rett etter rotasjon
-- (se lib/session.js sin rullerSesjonHvisNodvendig). Uten dette kan en
-- klient som ikke rekker å motta/lagre den nye Set-Cookie-en (f.eks. iOS
-- som legger PWA-en i bakgrunnen midt i en forespørsel rett når rotasjon
-- skjer) bli stående med et token serveren allerede har forkastet — synlig
-- for brukeren som at man "mister innloggingen" ved gjenåpning.
--
-- forrige_hash: hash-en tokenet HADDE før siste rotasjon, eller NULL før
-- første rotasjon. forrige_utloper: når denne korte gyldigheten selv løper
-- ut (unix-epoch millisekunder, samme mønster som utloper/rullert) — 0 for
-- eksisterende sesjoner (ingen aktiv overgangsperiode ennå).
ALTER TABLE sesjoner ADD COLUMN forrige_hash TEXT;
ALTER TABLE sesjoner ADD COLUMN forrige_utloper INTEGER NOT NULL DEFAULT 0;
