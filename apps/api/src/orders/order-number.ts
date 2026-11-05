import { randomInt } from 'node:crypto';

/** Crockford base32: no I, L, O or U, so references are easy to read out over the phone. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const dateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Beirut',
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
});

/**
 * A customer-facing order reference such as RS-261105-K3QZ7W: the date in Lebanon
 * plus 6 secure random characters (about a billion per day). The database's
 * unique constraint catches the rare collision, and the caller retries.
 */
export function makeOrderNumber(now = new Date()) {
  const parts = dateParts.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  let random = '';
  for (let i = 0; i < 6; i++) random += ALPHABET[randomInt(ALPHABET.length)];
  return `RS-${part('year')}${part('month')}${part('day')}-${random}`;
}
