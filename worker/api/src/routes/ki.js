import { json } from '../lib/json.js';
import { corsHeaders } from '../lib/cors.js';
import { requireSession } from '../lib/session.js';
import { sjekkOgTellIp } from '../lib/ratelimit.js';

// Sesjonsbeskyttet proxy foran worker/ki-proxy — legger på X-App-Secret
// server-side i stedet for at hver bruker må ha den delte hemmeligheten
// liggende i sin egen nettleser (localStorage). Kun innloggede (og admin)
// skal kunne bruke KI-gjenkjenning, akkurat som registrering av funn for
// øvrig — samme mønster som Mapbox-flisproxyen i routes/tiles.js.
const KI_PROXY_URL = 'https://ki.bondoya.no';
const MAKS_KI_PER_IP_TIME = 60;

export async function gjenkjennArt({ request, env }) {
  const cors = corsHeaders(env);
  const bruker = await requireSession(request, env);
  if (!bruker) return json({ error: 'Ikke innlogget.' }, 401, cors);

  const ip = request.headers.get('CF-Connecting-IP') || 'ukjent';
  const ipOk = await sjekkOgTellIp(ip, 'ki-gjenkjenn', MAKS_KI_PER_IP_TIME, env);
  if (!ipOk) return json({ error: 'For mange forespørsler. Prøv igjen senere.' }, 429, cors);

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return json({ error: 'Kunne ikke lese bildedata.' }, 400, cors);
  }

  const bildeFil = form.get('bilde');
  if (!bildeFil || typeof bildeFil.arrayBuffer !== 'function') {
    return json({ error: 'Mangler feltet "bilde".' }, 400, cors);
  }
  const kandidater = form.get('kandidater') || '[]';

  const videreForm = new FormData();
  videreForm.append('bilde', bildeFil, 'funn.jpg');
  videreForm.append('kandidater', kandidater);

  let kiRes;
  try {
    kiRes = await fetch(KI_PROXY_URL, {
      method: 'POST',
      headers: { 'X-App-Secret': env.KI_PROXY_SHARED_SECRET || '' },
      body: videreForm,
    });
  } catch (e) {
    console.error('Kunne ikke nå KI-proxyen', e);
    return json({ error: 'Kunne ikke nå KI-tjenesten.' }, 502, cors);
  }

  const data = await kiRes.json().catch(() => ({ error: 'Ugyldig svar fra KI-tjenesten.' }));
  return json(data, kiRes.status, cors);
}
