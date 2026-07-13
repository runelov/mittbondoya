// js/ki-client.js
// Tynn klient for KI-artsgjenkjenning. Snakker med bondoya-api sin
// sesjonsbeskyttede /ki/gjenkjenn-rute (se worker/api/src/routes/ki.js), som
// selv videresender til den faktiske KI-proxyen (worker/ki-proxy/) og legger
// på den delte hemmeligheten server-side — denne filen (og dermed hver
// brukers nettleser) kjenner aldri til noen delt hemmelighet lenger, kun
// admin ved oppsett av selve Workerne. Vet ingenting om hvilken KI-motor som
// brukes bak proxyen, kun kontrakten (bilde inn, strukturerte kandidater ut).
const KONFIDENS_AUTO_TERSKEL = 0.75; // over dette: velg automatisk. Under: vis alternativer.

// speciesHint: liste med { norsk, latinsk, artstype, plausibilitet } — bygget
// av app.js fra species.json + (hvis tilgjengelig) artskart-bondoya.json, se
// buildSpeciesHintList() der. Sendes med som kontekst til KI-motoren slik at
// den vektlegger stedsforankret plausibilitet (se konsept.md).
async function gjenkjenn(imageBlob, speciesHint){
  const data = await window.ApiClient.gjenkjennArt(imageBlob, speciesHint);

  // Forventet svarformat: { kandidater: [ { norsk, latinsk, artstype,
  // konfidens, saertrekk }, ... ] } sortert høyest konfidens først.
  // saertrekk: kort, bildespesifikk begrunnelse for kandidaten (se
  // worker/ki-proxy/src/index.js sin prompt) — vises i candidateCard i
  // app.js når KI er usikker, for å hjelpe brukeren velge riktig.
  const kandidater = data.kandidater || [];
  const beste = kandidater[0] || null;
  const autoVelg = !!beste && beste.konfidens >= KONFIDENS_AUTO_TERSKEL;
  return {
    beste: beste ? { art: { norsk: beste.norsk, latinsk: beste.latinsk }, konfidens: beste.konfidens, artstype: beste.artstype, saertrekk: beste.saertrekk } : null,
    alternativer: kandidater.slice(0, 3),
    autoVelg
  };
}

window.KiClient = { gjenkjenn, KONFIDENS_AUTO_TERSKEL };
