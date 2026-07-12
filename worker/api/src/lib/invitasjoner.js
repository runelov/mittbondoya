const MAKS_KORTNAVN_LENGDE = 100;
const EPOST_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sikkerhetsfiks (funnet i /security-review av v0.4.2-v0.8.0): en
// invitasjonslenke beviser kun at holderen har fått delt en lenke, IKKE at
// de kontrollerer noen bestemt e-postadresse. Å la registreringsskjemaet
// selv oppgi e-post (som tidligere) tillot hvem som helst med lenken å
// registrere seg med en VILKÅRLIG andres e-post — kapre adressen permanent
// (UNIQUE-constraint på brukere.epost) og få en innlogget sesjon knyttet
// til den, uten å ha bevist eierskap i det hele tatt. Løsning: admin binder
// lenken til én bestemt e-post ved generering (samme tillitsnivå som at
// admin allerede vet hvem de inviterer manuelt i dag) — registrering bruker
// ALLTID denne bundne adressen server-side, aldri noe klienten sender inn.
export function validerEpost(epost) {
  const trimmed = (epost || '').trim().toLowerCase();
  if (!trimmed) throw new Error('E-post mangler.');
  if (!EPOST_REGEX.test(trimmed)) throw new Error('Ugyldig e-postadresse.');
  return trimmed;
}

export function validerKortnavn(kortnavn) {
  const trimmed = (kortnavn || '').trim();
  if (!trimmed) throw new Error('Kortnavn mangler.');
  if (trimmed.length > MAKS_KORTNAVN_LENGDE) throw new Error('Kortnavn er for langt.');
  return trimmed;
}
