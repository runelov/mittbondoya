// D1-tabellen skjulte_arter (migrations/0008) erstatter den tidligere
// hardkodede SKJULT_FOR_PUBLIC_TAXON_IDER-settet — se konsept.md
// "Arter & synlighet". Admin styrer nå listen selv via
// GET/POST/DELETE /admin/skjulte-arter (routes/admin.js), ingen deploy
// nødvendig for å skjule/vise en art.

// Fail-closed, IKKE fail-open (sikkerhetsreview-funn, Milestone D): et
// manglende taxonId betyr at vi IKKE kan bekrefte at arten er trygg å vise
// offentlig, så det skal skjules — ikke vises. Dette treffer i praksis alle
// KI-auto-gjenkjente funn (ki-client.js sitt svar inneholder aldri
// taxonId) og fritekst-registrerte funn, som dermed forblir usynlige i det
// offentlige laget helt til artsnavnet kan slås opp server-side (venter på
// "Ordentlig artssøk"-milestonen, se konsept.md) — akseptabelt
// under-eksponering er langt å foretrekke fremfor å lekke et rødlistet
// funns posisjon ved en tilfeldighet. Kun eksplisitt kjente,
// taxonId-bekreftede arter som ikke står i skjulte_arter vises.
export async function erSynligForPublic(taxonId, env) {
  if (!taxonId) return false;
  const rad = await env.DB.prepare('SELECT 1 FROM skjulte_arter WHERE taxon_id = ?').bind(taxonId).first();
  return !rad;
}
