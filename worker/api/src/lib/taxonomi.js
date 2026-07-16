// Delt mellom arter.js (søk) og funn.js (autoritativ artstype-utledning ved
// registrering/redigering) — tidligere lå ARTSTYPER hardkodet på begge
// steder, noe som lot de to listene gli fra hverandre uoppdaget.
export const ARTSKART_API = 'https://artskart.artsdatabanken.no/publicapi/api';

export const ARTSTYPER = [
  'fugl', 'sjøpattedyr', 'pattedyr', 'plante', 'alge', 'sopp', 'fisk',
  'bløtdyr', 'krepsdyr', 'insekt', 'edderkoppdyr', 'krypdyr', 'amfibium',
  'nesledyr', 'pigghud', 'leddorm', 'annet',
];

// Artsdatabankens TaxonGroup/Kingdom/Class/Family dekker ikke appens
// artstype-skjema 1:1 (spesielt sjøpattedyr vs. pattedyr — Artsdatabanken
// har ingen egen "Sjøpattedyr"-gruppe, steinkobbe havner under samme
// TaxonGroup "Pattedyr" som f.eks. elg). Verifisert live 2026-07-12 mot
// faktiske treff (steinkobbe → TaxonGroup "Pattedyr", Family "Phocidae";
// sukkertare → TaxonGroup "Alger"). Liten hardkodet familie-allowliste for
// de sjøpattedyrfamiliene som realistisk kan dukke opp ved Bondøya.
const SJOPATTEDYR_FAMILIER = new Set([
  'Phocidae', 'Otariidae', 'Odobenidae',
  'Balaenopteridae', 'Delphinidae', 'Monodontidae', 'Physeteridae', 'Ziphiidae',
]);

// Innsekter og edderkoppdyr har INGEN egen samle-TaxonGroup hos
// Artsdatabanken — de er splittet på ordensnivå (Biller, Sommerfugler,
// Veps, Tovinger, Nebbmunner, Nebbfluer m.fl. for insekter alene,
// verifisert live 2026-07-16 mot løpebille/admiral/veps/skorpionflue).
// Samme prinsipp som pattedyr/sjøpattedyr over: Class er det stabile
// nivået å nøkle på, ikke TaxonGroup.
export function utledArtstype(taxon) {
  if (taxon.TaxonGroup === 'Fugler') return 'fugl';
  if (taxon.TaxonGroup === 'Alger') return 'alge';
  if (taxon.Kingdom === 'Plantae') return 'plante';
  // Bekreftet live 2026-07-13 (søk "mult"): Multiclavula-artene har
  // Kingdom "Fungi" — havnet tidligere i "annet" sammen med alt annet
  // ukategoriserbart, noe som gjorde flere sopparter umulige å skille fra
  // hverandre i søkeresultatet.
  if (taxon.Kingdom === 'Fungi') return 'sopp';
  // Bekreftet live 2026-07-13 (torsk/hyse → "Fisker", blåskjell → "Bløtdyr",
  // strandkrabbe → "Krepsdyr") — kystnære funn som tidligere alle havnet i
  // "annet" sammen med alt ukategoriserbart. "Bløtdyr" dekker hele
  // Mollusca (også landsnegl/blekksprut, ikke bare skjell) — omdøpt fra
  // "skjell" til "bløtdyr" 2026-07-16 for å reflektere dette.
  if (taxon.TaxonGroup === 'Fisker') return 'fisk';
  if (taxon.TaxonGroup === 'Bløtdyr') return 'bløtdyr';
  if (taxon.TaxonGroup === 'Krepsdyr') return 'krepsdyr';
  if (taxon.Class === 'Mammalia') {
    return SJOPATTEDYR_FAMILIER.has(taxon.Family) ? 'sjøpattedyr' : 'pattedyr';
  }
  // Verifisert live 2026-07-16 (løpebille/admiral/veps/skorpionflue → Class
  // "Insecta" på tvers av fire ulike TaxonGroup; hjulspinnere/skogflått →
  // Class "Arachnida"; snok/buttsnutefrosk → samme TaxonGroup "Amfibier,
  // reptiler" men ulik Class — splittet her siden de er biologisk distinkte
  // og Norge uansett bare har en håndfull arter i hver).
  if (taxon.Class === 'Insecta') return 'insekt';
  if (taxon.Class === 'Arachnida') return 'edderkoppdyr';
  if (taxon.Class === 'Reptilia') return 'krypdyr';
  if (taxon.Class === 'Amphibia') return 'amfibium';
  // Verifisert live 2026-07-16: Artsdatabanken bunter disse i to bredere
  // TaxonGroup enn appens skjema strengt tatt trenger (nesledyr-gruppen
  // dekker også svamper/kammaneter; pigghud-gruppen dekker også
  // armfotinger/kappedyr) — navngitt her etter den dominerende, mest
  // gjenkjennelige gruppen for en som går tur på stranda.
  if (taxon.TaxonGroup === 'svamper, nesledyr, kammaneter') return 'nesledyr';
  if (taxon.TaxonGroup === 'Armfotinger, pigghuder, kappedyr') return 'pigghud';
  if (taxon.TaxonGroup === 'Leddormer') return 'leddorm';
  return 'annet';
}

// Autoritativt taxonId → artstype-oppslag brukt ved lagring/redigering av
// funn (se validerFunnFelter i lib/funn.js) — klienten sender riktignok
// alltid en artstype selv (fra søket, som allerede har kjørt utledArtstype()
// på treffet), men serveren stoler aldri på den når en taxonId finnes, av
// samme grunn som synlig_for_public aldri stoler på klienten (se
// artsvisibility.js): en fremtidig klientbug skal ikke kunne lagre feil
// artstype for et funn som faktisk har en kjent taxonId. Returnerer null
// (ikke en feil) ved oppslagsfeil — kalleren faller da tilbake til
// klientens artstype, siden en midlertidig Artsdatabanken-feil ikke skal
// blokkere registrering.
export async function hentAutoritativArtstype(taxonId) {
  if (!taxonId) return null;
  try {
    const res = await fetch(`${ARTSKART_API}/taxon/${taxonId}`);
    if (!res.ok) return null;
    const taxon = await res.json();
    if (!taxon || !taxon.TaxonId) return null;
    return utledArtstype(taxon);
  } catch {
    return null;
  }
}
