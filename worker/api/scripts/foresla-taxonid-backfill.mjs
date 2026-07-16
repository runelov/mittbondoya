#!/usr/bin/env node
// Foreslår taxonId + artstype for eksisterende funn med art_taxon_id = NULL
// (samtlige 32 funn i produksjon per 2026-07-16, se CHANGELOG 0.9.13 —
// setValgt() droppet taxonId helt siden aller første MVP-commit).
//
// Skriver KUN forslag til stdout — oppdaterer ingenting i D1. Kjør
// UPDATE-setningene manuelt (eller stryk linjer du er uenig i) etter at du
// har sett gjennom forslagene, ett funn av gangen. Grunnen til at dette
// ikke er automatisert: art_norsk er fritekst fra en tidligere, nå fjernet
// registreringsflyt ("Sjøstjerne (art usikker...)", "Grønn engteppetege
// (ukjent art...)" osv.) — et automatisk navnetreff kan gjette feil art for
// disse, og feil taxonId er verre enn NULL (feilkategoriserer funnet varig
// og kan i teorien late som funnet er en kjent, ufarlig art).
//
// Bruk:
//   cd worker/api
//   node scripts/foresla-taxonid-backfill.mjs
//
// Krever at `wrangler` er logget inn (samme tilgang som `npm run
// db:migrate:remote`) — henter radene via `wrangler d1 execute --remote`.

import { execFileSync } from 'node:child_process';
import { utledArtstype } from '../src/lib/taxonomi.js';

const ARTSKART_API = 'https://artskart.artsdatabanken.no/publicapi/api';

function hentFunnUtenTaxonId() {
  const raw = execFileSync('npx', [
    'wrangler', 'd1', 'execute', 'bondoya', '--remote', '--json', '--command',
    "SELECT id, art_norsk, artstype FROM funn WHERE art_taxon_id IS NULL ORDER BY id",
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const start = raw.indexOf('[');
  const data = JSON.parse(raw.slice(start));
  return data[0].results;
}

function normaliser(navn) {
  return navn.toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim(); // fjern "(ukjent art...)"-halen
}

async function foreslaForNavn(artNorsk) {
  const term = normaliser(artNorsk);
  if (term.length < 2) return null;
  const res = await fetch(`${ARTSKART_API}/taxon?term=${encodeURIComponent(term)}&take=10`);
  if (!res.ok) return null;
  const treff = await res.json();
  if (!Array.isArray(treff) || treff.length === 0) return null;

  const eksakt = treff.find(t => (t.PrefferedPopularname || '').toLowerCase() === term);
  const valgt = eksakt || treff[0];
  return {
    taxonId: valgt.TaxonId,
    norsk: valgt.PrefferedPopularname,
    artstype: utledArtstype(valgt),
    sikkerhet: eksakt ? 'eksakt navnetreff' : `nærmeste treff (usikkert — dobbeltsjekk mot "${artNorsk}")`,
  };
}

const funn = hentFunnUtenTaxonId();
console.log(`${funn.length} funn uten taxonId.\n`);

for (const f of funn) {
  const forslag = await foreslaForNavn(f.art_norsk);
  console.log(`--- funn #${f.id}: "${f.art_norsk}" (nåværende artstype: ${f.artstype}) ---`);
  if (!forslag) {
    console.log('  Ingen treff på Artsdatabanken — sannsynligvis genuint usikker/ikke navngitt art. Ingen endring foreslått.\n');
    continue;
  }
  const endrerArtstype = forslag.artstype !== f.artstype ? ` (endres fra "${f.artstype}")` : ' (uendret)';
  console.log(`  Forslag: taxonId ${forslag.taxonId} — "${forslag.norsk}", artstype "${forslag.artstype}"${endrerArtstype}`);
  console.log(`  Sikkerhet: ${forslag.sikkerhet}`);
  console.log(`  Hvis riktig, kjør manuelt:`);
  console.log(`  npx wrangler d1 execute bondoya --remote --command "UPDATE funn SET art_taxon_id = ${forslag.taxonId}, artstype = '${forslag.artstype}' WHERE id = ${f.id};"\n`);
}
