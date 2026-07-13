-- Periodisk sesjonstoken-rotasjon (se lib/session.js): tokenet i cookien
-- skal ikke stå fast i hele 30-dagers levetiden — begrenser hvor lenge et
-- ev. lekket token forblir gyldig. rullert er unix-epoch MILLISEKUNDER
-- (samme resonnement som utloper i 0001, JS Date.now(), ikke SQL datetime()).
-- Default 0 for eksisterende sesjoner: de rulleres bare ved neste bruk,
-- akkurat som en helt fersk sesjon ville blitt hvis grensen var passert —
-- ingen spesialhåndtering nødvendig.
ALTER TABLE sesjoner ADD COLUMN rullert INTEGER NOT NULL DEFAULT 0;
