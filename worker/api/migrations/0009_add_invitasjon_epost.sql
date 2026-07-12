-- Sikkerhetsfiks (/security-review av v0.4.2-v0.8.0, se lib/invitasjoner.js):
-- invitasjoner var tidligere ikke bundet til noen bestemt e-post, slik at
-- hvem som helst med lenken kunne registrere seg med en vilkårlig andres
-- adresse. Nullable her bevisst: eksisterende (evt. ubrukte) invitasjoner
-- fra før denne fiksen mangler en bundet e-post og blir dermed permanent
-- ikke-innløsbare (håndhevet i routes/invitasjoner.js/admin.js sine
-- spørringer med "epost IS NOT NULL") — riktig oppførsel, ikke en feil: de
-- representerer nettopp det sårbare mønsteret og skal ikke kunne brukes.
ALTER TABLE invitasjoner ADD COLUMN epost TEXT;
