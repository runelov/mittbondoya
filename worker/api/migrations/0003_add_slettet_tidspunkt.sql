-- Admin-moderasjon: permanent brukersletting scrubber e-post + setter dette
-- feltet i stedet for å slette selve raden (unngår å bryte
-- funn.registrert_av_bruker_id sin fremmednøkkel). Se konsept.md
-- "Admin-moderasjon" og Milestone C-planen for begrunnelsen.
ALTER TABLE brukere ADD COLUMN slettet_tidspunkt TEXT;
