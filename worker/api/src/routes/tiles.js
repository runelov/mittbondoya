import { json } from '../lib/json.js';
import { corsHeaders } from '../lib/cors.js';
import { requireSession } from '../lib/session.js';
import { sjekkOgTellIp } from '../lib/ratelimit.js';

// Kartpanorering genererer langt flere flis-forespørsler per sesjon enn
// f.eks. innloggingsforsøk — se konsept.md "Mapbox-flis-proxy".
const MAKS_FLISER_PER_IP_TIME = 1500;

export async function hentFlis({ request, env, ctx, params }) {
  const cors = corsHeaders(env);
  const bruker = await requireSession(request, env);
  if (!bruker) return json({ error: 'Ikke innlogget.' }, 401, cors);

  const z = parseInt(params.z, 10);
  const x = parseInt(params.x, 10);
  const y = parseInt(params.y, 10);
  if (![z, x, y].every(Number.isInteger)) {
    return json({ error: 'Ugyldig flis-koordinat.' }, 400, cors);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'ukjent';
  const ipOk = await sjekkOgTellIp(ip, 'tiles', MAKS_FLISER_PER_IP_TIME, env);
  if (!ipOk) return json({ error: 'For mange forespørsler. Prøv igjen senere.' }, 429, cors);

  // Fliser er identiske for alle innloggede brukere og ikke sensitive i seg
  // selv (kun kartbilder) — cachen sjekkes ETTER sesjonssjekken over, så en
  // uinnlogget forespørsel treffer aldri cachen heller. Dette er den reelle
  // kostnadsbeskyttelsen mot Mapbox (langt flere flis- enn brukerforespørsler
  // over tid); rate-limiten over er sekundært forsvar mot en enkelt stjålet
  // sesjon.
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/${z}/${x}/${y}?access_token=${env.MAPBOX_SECRET_TOKEN}`;
  const flisRes = await fetch(mapboxUrl);
  if (!flisRes.ok) {
    // Midlertidig diagnostikk for å finne rotårsaken til 502-feil rapportert
    // av produkteier — logger ALDRI mapboxUrl (inneholder MAPBOX_SECRET_TOKEN
    // som spørrestreng), kun status/body fra Mapbox sitt svar.
    console.error('Mapbox-flis feilet', flisRes.status, await flisRes.text());
    return json({ error: 'Kunne ikke hente kartflis.' }, 502, cors);
  }

  const response = new Response(flisRes.body, {
    status: 200,
    headers: {
      'Content-Type': flisRes.headers.get('Content-Type') || 'image/jpeg',
      // Kartfliser for en fast koordinat endrer seg aldri — trygt med svært
      // lang levetid både i CF-cachen og i nettleseren, som reduserer
      // gjentatte kall mot Mapbox (free tier) ved neste besøk/PoP-treff.
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...cors,
    },
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
