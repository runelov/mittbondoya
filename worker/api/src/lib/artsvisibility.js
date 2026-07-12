import artskatalog from '../../../../data/species.json' with { type: 'json' };

// D1-tabellen skjulte_arter (migrations/0008) erstatter den tidligere
// hardkodede SKJULT_FOR_PUBLIC_TAXON_IDER-settet — se konsept.md
// "Arter & synlighet". Admin styrer nå listen selv via
// GET/POST/DELETE /admin/skjulte-arter (routes/admin.js), ingen deploy
// nødvendig for å skjule/vise en art.

const taxonKatalog = new Map(artskatalog.map((a) => [a.taxonId, a]));

function normaliserNavn(navn) {
  return (navn || '').trim().toLowerCase();
}

// Sikkerhetsreview-funn (full v1-review): erSynligForPublic stolte tidligere
// blindt på et klientoppgitt taxonId uten å sjekke at det faktisk hørte til
// det innsendte artsnavnet. En bruker kunne dermed sende et ekte, rødlistet
// artsnavn sammen med et vilkårlig taxonId som IKKE sto i skjulte_arter, og
// dermed lekke et rødlistet funns posisjon til det offentlige laget. Denne
// funksjonen er den eneste kilden et taxonId får lov til å "telle" som
// bekreftet: det må finnes i den kuraterte artskatalogen OG det innsendte
// norske navnet må samsvare med katalogens navn for den taxonId-en. Alt
// annet behandles som om taxonId mangler (fail-closed, se erSynligForPublic).
export function betruaTaxonId(taxonId, artNorsk) {
  if (!taxonId) return null;
  const kjentArt = taxonKatalog.get(taxonId);
  if (!kjentArt) return null;
  if (normaliserNavn(kjentArt.norsk) !== normaliserNavn(artNorsk)) return null;
  return taxonId;
}

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
