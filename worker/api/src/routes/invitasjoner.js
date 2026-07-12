import { json } from '../lib/json.js';
import { corsHeaders } from '../lib/cors.js';
import { sha256Hex } from '../lib/crypto.js';
import { opprettSesjon, sesjonCookieHeader } from '../lib/session.js';
import { sjekkOgTellIp } from '../lib/ratelimit.js';
import { validerRegistreringsFelter } from '../lib/invitasjoner.js';

// Ingen Turnstile her — i motsetning til /auth/be-om-lenke (som tar imot
// en vilkårlig oppgitt e-post) krever denne ruten at man allerede har en
// 256-bit engangs-token i hånden, samme tillitsnivå som selve
// magic-link-tokenet. Rate-limit er kun et friksjonslag, ikke hovedforsvaret
// — se lib/ratelimit.js.
export async function sjekkInvitasjon({ request, env, params }) {
  const cors = corsHeaders(env);
  const ip = request.headers.get('CF-Connecting-IP') || 'ukjent';
  const ipOk = await sjekkOgTellIp(ip, 'sjekk-invitasjon', 10, env);
  if (!ipOk) return json({ error: 'For mange forsøk. Prøv igjen senere.' }, 429, cors);

  const hash = await sha256Hex(params.token);
  const rad = await env.DB.prepare(
    'SELECT id FROM invitasjoner WHERE token_hash = ?1 AND brukt = 0 AND utloper > ?2'
  )
    .bind(hash, Date.now())
    .first();

  return json({ gyldig: !!rad }, 200, cors);
}

export async function registrerMedInvitasjon({ request, env, params }) {
  const cors = corsHeaders(env);
  const ip = request.headers.get('CF-Connecting-IP') || 'ukjent';
  const ipOk = await sjekkOgTellIp(ip, 'registrer-invitasjon', 10, env);
  if (!ipOk) return json({ error: 'For mange forsøk. Prøv igjen senere.' }, 429, cors);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Ugyldig forespørsel.' }, 400, cors);
  }

  let felter;
  try {
    felter = validerRegistreringsFelter(body);
  } catch (e) {
    return json({ error: e.message }, 400, cors);
  }

  const hash = await sha256Hex(params.token);
  // Atomisk engangsbruk — identisk mønster som verifiser() i routes/auth.js.
  const invitasjon = await env.DB.prepare(
    `UPDATE invitasjoner SET brukt = 1
     WHERE token_hash = ?1 AND brukt = 0 AND utloper > ?2
     RETURNING id`
  )
    .bind(hash, Date.now())
    .first();

  if (!invitasjon) {
    return json({ error: 'Invitasjonslenken er ugyldig, utløpt, eller allerede brukt.' }, 400, cors);
  }

  // Invitasjonen er nå "brukt" uansett hva som skjer under — et duplikat
  // e-post-forsøk kaster invitasjonen (aksepterer denne edge-casen fremfor
  // ekte multi-statement-transaksjoner, se plan-notatet for begrunnelse).
  // Alltid rolle='bruker' — aldri admin via denne selvbetjente flyten.
  let bruker;
  try {
    bruker = await env.DB.prepare(
      `INSERT INTO brukere (epost, kortnavn, rolle, status) VALUES (?, ?, 'bruker', 'aktiv') RETURNING *`
    )
      .bind(felter.epost, felter.kortnavn)
      .first();
  } catch (e) {
    return json({ error: 'E-postadressen er allerede registrert.' }, 400, cors);
  }

  await env.DB.prepare('UPDATE invitasjoner SET brukt_av_bruker_id = ? WHERE id = ?')
    .bind(bruker.id, invitasjon.id)
    .run();

  const sesjonToken = await opprettSesjon(bruker.id, env);

  return json(
    { epost: bruker.epost, kortnavn: bruker.kortnavn, rolle: bruker.rolle },
    200,
    { ...cors, 'Set-Cookie': sesjonCookieHeader(sesjonToken) }
  );
}
