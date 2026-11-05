import { hasPlaceholder } from './placeholder.js';
import { products } from './seed-data.js';

describe('hasPlaceholder', () => {
  it.each(['[X]', 'Box of [X]', '[kg — confirm]', 'latex-free [confirm]'])('flags %s', (s) => {
    expect(hasPlaceholder(s)).toBe(true);
  });

  it('searches nested arrays and objects', () => {
    expect(hasPlaceholder({ specs: [{ label: 'Load', value: '[kg]' }] })).toBe(true);
  });

  it('ignores arrays and brackets that are not placeholder text', () => {
    expect(hasPlaceholder({ audience: ['clinic', 'home'], price: 70, note: '[]' })).toBe(false);
  });

  it('publishes only the fully written products from the original catalogue', () => {
    const published = products.filter((p) => !hasPlaceholder(p)).map((p) => p.slug);
    expect(published).toEqual([
      '4-in-1-tens-ems-unit',
      'dual-channel-home-tens',
      'electrode-pads',
      'loop-bands',
      'lead-wires',
    ]);
  });
});
