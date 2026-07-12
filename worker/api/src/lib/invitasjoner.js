const MAKS_KORTNAVN_LENGDE = 100;
const EPOST_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validerer registreringsfeltene en invitert person fyller ut. Kaster en
// Error med brukervennlig norsk melding ved ugyldig input — samme mønster
// som validerFunnFelter (lib/funn.js) og validerSideFelter (lib/sider.js).
export function validerRegistreringsFelter(felter) {
  const epost = (felter.epost || '').trim().toLowerCase();
  if (!epost) throw new Error('E-post mangler.');
  if (!EPOST_REGEX.test(epost)) throw new Error('Ugyldig e-postadresse.');

  const kortnavn = (felter.kortnavn || '').trim();
  if (!kortnavn) throw new Error('Kortnavn mangler.');
  if (kortnavn.length > MAKS_KORTNAVN_LENGDE) throw new Error('Kortnavn er for langt.');

  return { epost, kortnavn };
}
