import { test } from 'node:test';
import assert from 'node:assert/strict';

// Storefront ka variant chunne ka logic (frontend/src/utils/variantOptions.js) — pure functions.
import { getOptionGroups, pickVariant, valueOf } from '../../frontend/src/utils/variantOptions.js';

const mk = (id, color, size, stock) => ({ _id: id, stock, options: [{ name: 'Color', value: color }, { name: 'Size', value: size }] });
const variants = [mk('a', 'Red', 'M', 3), mk('b', 'Red', 'XL', 0), mk('c', 'Blue', 'M', 0), mk('d', 'Blue', 'XL', 4)];

test('getOptionGroups: one group per option name, each value once, in the order admin added them', () => {
  assert.deepEqual(getOptionGroups(variants), [
    { name: 'Color', values: ['Red', 'Blue'] },
    { name: 'Size', values: ['M', 'XL'] },
  ]);
  assert.deepEqual(getOptionGroups([]), []);
  // "red" / "RED" ek hi value maani jaati hai
  assert.deepEqual(getOptionGroups([mk('x', 'Red', 'M', 1), mk('y', 'red', 'L', 1)])[0].values, ['Red']);
});

test('pickVariant: keeps the other choices when that exact combination is in stock', () => {
  const current = variants[0]; // Red / M
  assert.equal(pickVariant(variants, current, 'Size', 'M')._id, 'a');
  // Size XL chuna: Red/XL ka stock 0 hai, isliye in-stock Blue/XL milta hai
  assert.equal(pickVariant(variants, current, 'Size', 'XL')._id, 'd');
});

test('pickVariant: asking for a value whose exact combination is out of stock jumps to an in-stock variant with that value', () => {
  const current = variants[0]; // Red / M, customer clicks Blue (Blue/M has no stock)
  const next = pickVariant(variants, current, 'Color', 'Blue');
  assert.equal(next._id, 'd');
  assert.equal(valueOf(next, 'Color'), 'Blue');
});

test('pickVariant: unknown value keeps the current variant; value with nothing in stock still returns a variant to show "out of stock"', () => {
  assert.equal(pickVariant(variants, variants[0], 'Color', 'Green'), variants[0]);
  const onlyOos = [mk('p', 'Red', 'M', 0), mk('q', 'Blue', 'M', 2)];
  assert.equal(pickVariant(onlyOos, onlyOos[1], 'Color', 'Red')._id, 'p');
});
