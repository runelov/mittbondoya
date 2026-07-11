# Endringslogg

## 0.1.0 — Første MVP-versjon
Grunnleggende funksjonalitet på plass, basert på konsept.md sin fase 1:

- **App-skall + PWA**: statisk SPA, `manifest.json` + `sw.js` for
  "legg til på hjemskjerm".
- **GitHub som backend** (`js/github-store.js`, portert fra FungiFinder):
  privat data-repo (`mittbondoya-db`), delt fine-grained token som både
  tilgangskontroll og skrivemekanisme, `saveWithRetry` for
  samtidighetshåndtering.
- **Kart** (`js/map.js`): Leaflet, begrenset til Bondøya/Liss-Bondøya/Risøya
  (koordinater geokodet via Nominatim), Mapbox Satellite + Kartverket
  topografisk som lagvalg, startvisning fokusert på Bondøya alene.
- **Registreringsflyt**: kamera (live GPS) eller kamerarull
  (etterregistrering), KI-gjenkjenning via egen Cloudflare Worker-proxy
  (`worker/ki-proxy/`) sikret med delt hemmelighet (`X-App-Secret`),
  manuelt artsvalg med fritekst-fallback for uventede funn, manuell
  posisjonsvelger i kart, offline-kø (IndexedDB) for funn registrert uten
  nett.
- **EXIF-lesing** (`exifr`): posisjon og dato fra kamerarull-bilder,
  alltid brukerjusterbar.
- **Stedsforankret artskunnskap**: `data/species.json` (kuratert
  artsreferanse) + `mittbondoya-db/scripts/fetch_artskart.py` (ekte
  Artskart-observasjoner nær Bondøya) brukes til å vekte KI-forslag og
  sortere manuelt artsvalg mot lokal plausibilitet.
- **Funnliste + kartvisning**: filtrering på artstype, artsdetaljer med
  lenke til Artsdatabanken.

### Kjente feil rettet underveis i 0.1.0
- exifr sitt array-form for å plukke enkelttags kastet en intern feil i
  "lite"-bygget — byttet til full `parse()`.
- Artsvalg ble nullstilt når posisjon ble valgt i kart (lokal
  closure-variabel i stedet for delt tilstand).
- Skriftstørrelse i artssøk-trefflisten var for liten (arvet nettleserens
  standard knapp-skrift).
- KI-proxyen manglet feilhåndtering rundt enkelte steg (bilde-lesing,
  tolkning av Anthropic-respons) som kunne gi en uinformativ 500-feil i
  stedet for en diagnostiserbar en.
- Bilde ble ikke vist i artsdetalj-panelet ved klikk på et tidligere funn.
