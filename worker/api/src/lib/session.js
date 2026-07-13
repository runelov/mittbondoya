import { randomToken, sha256Hex } from './crypto.js';

const COOKIE_NAVN = 'bondoya_sesjon';
const LEVETID_MS = 30 * 24 * 60 * 60 * 1000; // 30 dager

// Sesjonstokenet i cookien rulleres periodisk (se rullerSesjonHvisNodvendig)
// i stedet for å stå fast i hele 30-dagers levetiden — begrenser hvor lenge
// et ev. lekket token forblir gyldig. Bevisst periodisk, ikke på hvert
// eneste kall: appen sender ofte flere parallelle forespørsler (f.eks. alle
// funn-thumbnails i listen samtidig), og å rullere på hvert kall ville gitt
// et race der to samtidige kall med samme (gamle) cookie kunne oppheve
// hverandre — én av dem ville sett sesjonen som "logget ut" fordi den andre
// rakk å bytte hash-en først. Med et 24-timers vindu er den praktiske
// sjansen for at to kall treffer akkurat rulleringsøyeblikket samtidig
// neglisjerbar, og selv om det skjer er verste konsekvens én mislykket
// enkeltforespørsel (f.eks. ett thumbnail som ikke laster), ikke utlogging.
// Ren rotasjon — IKKE en sesjonsforlengelse: utloper endres aldri her, kun
// selve tokenverdien. Se konsept.md.
const ROTASJON_INTERVALL_MS = 24 * 60 * 60 * 1000; // 24 timer

export async function opprettSesjon(brukerId, env) {
  const token = randomToken();
  const hash = await sha256Hex(token);
  const na = Date.now();
  const utloper = na + LEVETID_MS;
  await env.DB.prepare('INSERT INTO sesjoner (hash, bruker_id, utloper, rullert) VALUES (?, ?, ?, ?)')
    .bind(hash, brukerId, utloper, na)
    .run();
  return token;
}

// maxAgeSekunder: valgfri override — brukes ved rotasjon (rullerSesjonHvisNodvendig)
// for å sette cookiens levetid til TIDEN SOM ER IGJEN av den opprinnelige
// 30-dagers sesjonen, ikke en ny full 30-dagers periode (det ville vært en
// stille sesjonsforlengelse, ikke bare rotasjon av tokenverdien).
// Ingen Domain-attributt (host-only på api.bondoya.no) — SameSite stopper
// kun cross-*site*, ikke cross-*origin*-innenfor-samme-site, så cookien
// sendes fint fra bondoya.no sine fetch()-kall uten å måtte deles unødig
// bredt med f.eks. GitHub Pages-siden. Se konsept.md "Eget domene".
export function sesjonCookieHeader(token, maxAgeSekunder) {
  const maxAge = maxAgeSekunder != null ? Math.max(0, Math.floor(maxAgeSekunder)) : LEVETID_MS / 1000;
  return `${COOKIE_NAVN}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function slettSesjonCookieHeader() {
  return `${COOKIE_NAVN}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// Den delte autorisasjonsfunksjonen konsept.md krever — alle beskyttede
// ruter kaller DENNE, aldri en egen kopiert sjekk. Umiddelbar
// tilbaketrekking ved deaktivering: status sjekkes på hver forespørsel,
// ikke bare ved innlogging (derfor sesjonsbasert i D1, ikke JWT).
export async function requireSession(request, env) {
  const token = parseCookie(request.headers.get('Cookie') || '', COOKIE_NAVN);
  if (!token) return null;

  const hash = await sha256Hex(token);
  const rad = await env.DB.prepare(
    `SELECT brukere.id, brukere.epost, brukere.kortnavn, brukere.rolle, brukere.status
     FROM sesjoner
     JOIN brukere ON brukere.id = sesjoner.bruker_id
     WHERE sesjoner.hash = ?1 AND sesjoner.utloper > ?2`
  )
    .bind(hash, Date.now())
    .first();

  if (!rad || rad.status !== 'aktiv') return null;
  return rad;
}

// Bygger på requireSession() — samme "én delt funksjon"-prinsipp, alle
// admin-ruter kaller DENNE, aldri en egen kopiert rolle-sjekk.
export async function requireAdmin(request, env) {
  const bruker = await requireSession(request, env);
  if (!bruker || bruker.rolle !== 'admin') return null;
  return bruker;
}

// Kalles sentralt fra worker/api/src/index.js sin fetch()-handler, ETTER at
// router.handle() allerede er ferdig — denne inneværende forespørselen
// autentiseres fortsatt med det GAMLE tokenet (uendret av dette), rullering
// gjelder først NESTE forespørsel. Returnerer null hvis ikke innlogget eller
// sesjonen ikke er moden for rullering ennå (rullert < 24t siden); ellers
// { token, utloper } — index.js bygger en ny Set-Cookie av dette.
export async function rullerSesjonHvisNodvendig(request, env) {
  const gammelToken = parseCookie(request.headers.get('Cookie') || '', COOKIE_NAVN);
  if (!gammelToken) return null;

  const gammelHash = await sha256Hex(gammelToken);
  const nyttToken = randomToken();
  const nyHash = await sha256Hex(nyttToken);
  const na = Date.now();

  // Atomisk: matcher kun en sesjon som fortsatt er gyldig OG moden for
  // rullering i samme UPDATE (samme "WHERE i selve skrivingen"-mønster som
  // innloggingstokens sin engangsbruk i auth.js) — unngår en separat
  // les-så-skriv-race mot en samtidig forespørsel som rullerer først.
  const rad = await env.DB.prepare(
    `UPDATE sesjoner SET hash = ?1, rullert = ?2
     WHERE hash = ?3 AND utloper > ?2 AND rullert <= ?4
     RETURNING utloper`
  )
    .bind(nyHash, na, gammelHash, na - ROTASJON_INTERVALL_MS)
    .first();

  if (!rad) return null;
  return { token: nyttToken, utloper: rad.utloper };
}

export async function slettSesjon(request, env) {
  const token = parseCookie(request.headers.get('Cookie') || '', COOKIE_NAVN);
  if (!token) return;
  const hash = await sha256Hex(token);
  await env.DB.prepare('DELETE FROM sesjoner WHERE hash = ?').bind(hash).run();
}

function parseCookie(header, navn) {
  for (const del of header.split(';')) {
    const i = del.indexOf('=');
    if (i === -1) continue;
    if (del.slice(0, i).trim() === navn) return decodeURIComponent(del.slice(i + 1).trim());
  }
  return null;
}
