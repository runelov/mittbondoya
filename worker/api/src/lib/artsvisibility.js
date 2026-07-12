// Bevisst duplisering av synligForPublic-feltet i data/species.json (som
// kun frontend leser) — Workeren kan ikke stole på et frontend-oppgitt
// synlighetsflagg, og å importere en fil utenfor worker/api/ er en
// bygge-sti-avhengighet vi heller unngår. Denne listen erstattes av en
// D1-tabell den dagen admin-panelet "Arter & synlighet" (utsatt, se
// konsept.md) lar produkteier overstyre enkeltarter selv — hold den i sync
// med data/species.json manuelt frem til da.
const SKJULT_FOR_PUBLIC_TAXON_IDER = new Set([
  3491,   // Ærfugl (VU)
  3863,   // Storskarv (NT)
  3562,   // Teist (NT)
  203546, // Krykkje (EN)
  3624,   // Gråmåke (VU)
  3628,   // Fiskemåke (VU)
  203529, // Tjeld (NT)
]);

// Fail-closed, IKKE fail-open (sikkerhetsreview-funn, Milestone D): et
// manglende taxonId betyr at vi IKKE kan bekrefte at arten er trygg å vise
// offentlig, så det skal skjules — ikke vises. Dette treffer i praksis alle
// KI-auto-gjenkjente funn (ki-client.js sitt svar inneholder aldri
// taxonId) og fritekst-registrerte funn, som dermed forblir usynlige i det
// offentlige laget helt til artsnavnet kan slås opp server-side (venter på
// "Ordentlig artssøk"-milestonen, se konsept.md) — akseptabelt
// under-eksponering er langt å foretrekke fremfor å lekke et rødlistet
// funns posisjon ved en tilfeldighet. Kun eksplisitt kjente,
// taxonId-bekreftede arter som ikke står i blokkeringslisten vises.
export function erSynligForPublic(taxonId) {
  if (!taxonId) return false;
  return !SKJULT_FOR_PUBLIC_TAXON_IDER.has(taxonId);
}
