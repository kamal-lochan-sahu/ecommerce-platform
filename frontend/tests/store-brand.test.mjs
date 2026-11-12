// Round 5 Group 8B: storefront text/claims come from Admin -> Settings, never hardcoded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTrustBadges, formatAmount, deliveryAlwaysFree, settingsLoaded, telHref, filenameFromDisposition } from '../src/utils/storeBrand.js';
import { setBrandTitle, setPageTitle } from '../src/utils/pageTitle.js';

const base = { currency: 'INR', deliveryFee: 49, freeDeliveryAbove: 499, returnWindowDays: 7, supportEmail: '', supportPhone: '', supportHours: '' };
const keys = (s) => getTrustBadges(s).map((b) => b.key);

test('badges: nothing is shown until settings are known (no wrong numbers)', () => {
  assert.deepEqual(getTrustBadges({}), []);
  assert.deepEqual(getTrustBadges(undefined), []);
  assert.equal(settingsLoaded({ deliveryFee: 49 }), false);
});

test('badges: delivery text follows the admin threshold and currency', () => {
  assert.equal(getTrustBadges(base)[0].sub, 'Orders above ₹499');
  assert.equal(getTrustBadges({ ...base, freeDeliveryAbove: 1500 })[0].sub, 'Orders above ₹1,500');
  assert.equal(getTrustBadges({ ...base, currency: 'USD', freeDeliveryAbove: 50 })[0].sub, 'Orders above $50');
  assert.equal(getTrustBadges({ ...base, freeDeliveryAbove: 0 })[0].sub, 'On all orders');
  assert.equal(getTrustBadges({ ...base, deliveryFee: 0 })[0].sub, 'On all orders');
  assert.equal(deliveryAlwaysFree(base), false);
});

test('badges: returns badge uses the admin return window and hides at 0', () => {
  assert.equal(getTrustBadges({ ...base, returnWindowDays: 10 }).find((b) => b.key === 'returns').sub, '10-day return policy');
  assert.ok(!keys({ ...base, returnWindowDays: 0 }).includes('returns'));
});

test('badges: support badge only when the client filled hours/phone/email (no fake 24/7)', () => {
  assert.ok(!keys(base).includes('support'));
  assert.equal(getTrustBadges({ ...base, supportHours: 'Mon-Sat, 10am-7pm' }).find((b) => b.key === 'support').sub, 'Mon-Sat, 10am-7pm');
  assert.equal(getTrustBadges({ ...base, supportPhone: '9999900001' }).find((b) => b.key === 'support').sub, '9999900001');
  assert.deepEqual(keys({ ...base, supportEmail: 'a@b.com' }), ['delivery', 'payment', 'returns', 'support']);
});

test('formatAmount / telHref / invoice file name', () => {
  assert.equal(formatAmount(1234567), '₹12,34,567');
  assert.equal(telHref('+91 99999-00001'), 'tel:+919999900001');
  assert.equal(filenameFromDisposition('attachment; filename="invoice-INV-1-2.pdf"', 'x.pdf'), 'invoice-INV-1-2.pdf');
  assert.equal(filenameFromDisposition(undefined, 'invoice-ORD-1.pdf'), 'invoice-ORD-1.pdf');
  assert.equal(filenameFromDisposition('attachment; filename="../../evil.sh"', 'safe.pdf'), 'safe.pdf');
});

test('page title: "<Page> | <Store>", store default when no page, tagline in default', () => {
  globalThis.document = { title: '' };
  setBrandTitle('Acme', 'Fresh things');
  assert.equal(document.title, 'Acme — Fresh things');
  setPageTitle('Blue Shirt');
  assert.equal(document.title, 'Blue Shirt | Acme');
  setBrandTitle('Acme Store', 'Fresh things'); // settings arrive later: page title must stay
  assert.equal(document.title, 'Blue Shirt | Acme Store');
  setPageTitle(null);
  assert.equal(document.title, 'Acme Store — Fresh things');
  setBrandTitle('Acme Store', '');
  assert.equal(document.title, 'Acme Store');
});
