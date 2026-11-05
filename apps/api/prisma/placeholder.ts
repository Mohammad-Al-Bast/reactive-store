/** Matches bracketed placeholder text such as [X], [confirm] or [kg — confirm]. */
const PLACEHOLDER = /\[[^\]]+\]/;

/** True if any string inside the value (searched recursively) holds placeholder text. */
export function hasPlaceholder(value: unknown): boolean {
  if (typeof value === 'string') return PLACEHOLDER.test(value);
  if (Array.isArray(value)) return value.some(hasPlaceholder);
  if (value && typeof value === 'object') return Object.values(value).some(hasPlaceholder);
  return false;
}
