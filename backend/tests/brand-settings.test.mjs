// Round 5 Group 8A: white-label business fields (legal name, GSTIN, tagline, logo, return window,
// invoice prefix, social links): validation, public view, invoice number, invoice PDF, and a guard
// that no other client's name (MyShop) is hardcoded anywhere in backend/src.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateBrandSettings, buildPublicSettings, formatInvoiceNumber, BRAND_SETTINGS_FIELDS } from '../src/utils/brandSettings.js';
import generateInvoicePDF from '../src/utils/pdf.js';

const throwsStatus = (fn, status = 400) => assert.throws(fn, (e) => e.statusCode === status);

test('GSTIN: valid is upper-cased, blank allowed, bad format rejected', () => {
  assert.equal(validateBrandSettings({ gstin: ' 22aaaaa0000a1z5 ' }).gstin, '22AAAAA0000A1Z5');
  assert.equal(validateBrandSettings({ gstin: '' }).gstin, '');
  for (const bad of ['123', '22AAAAA0000A1Z', 'AAAAA0000A1Z522', '22AAAAA0000A1X5']) {
    throwsStatus(() => validateBrandSettings({ gstin: bad }));
  }
});

test('returnWindowDays: whole number 0..365 only (0 is allowed = no returns)', () => {
  assert.equal(validateBrandSettings({ returnWindowDays: '10' }).returnWindowDays, 10);
  assert.equal(validateBrandSettings({ returnWindowDays: 0 }).returnWindowDays, 0);
  for (const bad of ['', '  ', -1, 366, 7.5, 'abc']) {
    throwsStatus(() => validateBrandSettings({ returnWindowDays: bad }));
  }
});

test('links and logo must be https URLs (or empty); javascript:/http:/plain text rejected', () => {
  const ok = validateBrandSettings({ logoUrl: 'https://cdn.example.com/logo.png', instagramUrl: '', youtubeUrl: ' https://youtube.com/@shop ' });
  assert.equal(ok.logoUrl, 'https://cdn.example.com/logo.png');
  assert.equal(ok.instagramUrl, '');
  assert.equal(ok.youtubeUrl, 'https://youtube.com/@shop');
  for (const key of ['logoUrl', 'instagramUrl', 'facebookUrl', 'xUrl', 'youtubeUrl']) {
    for (const bad of ['http://x.com/a', 'javascript:alert(1)', 'instagram.com/shop', '/logo.png']) {
      throwsStatus(() => validateBrandSettings({ [key]: bad }));
    }
  }
});

test('invoice prefix: up to 10 safe characters, may be empty', () => {
  assert.equal(validateBrandSettings({ invoicePrefix: 'LX/26-' }).invoicePrefix, 'LX/26-');
  assert.equal(validateBrandSettings({ invoicePrefix: '' }).invoicePrefix, '');
  for (const bad of ['INV 1', 'WAYTOOLONGPREFIX', '<b>']) throwsStatus(() => validateBrandSettings({ invoicePrefix: bad }));
});

test('text fields are trimmed and length-capped; untouched keys are left alone', () => {
  const r = validateBrandSettings({ tagline: `  ${'x'.repeat(300)}  `, legalName: ' Acme Pvt Ltd ' });
  assert.equal(r.tagline.length, 120);
  assert.equal(r.legalName, 'Acme Pvt Ltd');
  assert.deepEqual(validateBrandSettings({}), {});
  assert.ok(BRAND_SETTINGS_FIELDS.includes('gstin') && BRAND_SETTINGS_FIELDS.includes('xUrl'));
});

test('public settings: new fields exposed, old documents get safe defaults', () => {
  const p = buildPublicSettings({ storeName: 'Luxora', taxRate: 18, deliveryFee: 49, freeDeliveryAbove: 499, currency: 'INR', storeEmail: 'a@b.com', instagramUrl: 'https://instagram.com/x' });
  assert.equal(p.supportEmail, 'a@b.com');
  assert.equal(p.returnWindowDays, 7);
  assert.equal(p.allowGuestCheckout, true);
  assert.equal(p.maintenanceMode, false);
  assert.equal(p.gstin, '');
  assert.deepEqual(p.socialLinks, { instagram: 'https://instagram.com/x', facebook: '', x: '', youtube: '' });
  assert.equal(buildPublicSettings({ returnWindowDays: 0 }).returnWindowDays, 0, '0 days must stay 0, not fall back to 7');
});

test('invoice number: prefix + order number without ORD-, fallback to id, empty prefix allowed', () => {
  assert.equal(formatInvoiceNumber({ orderNumber: 'ORD-63569874-938' }), 'INV-63569874-938');
  assert.equal(formatInvoiceNumber({ orderNumber: 'ORD-63569874-938' }, 'LX/'), 'LX/63569874-938');
  assert.equal(formatInvoiceNumber({ orderNumber: 'ORD-1-2' }, ''), '1-2');
  assert.equal(formatInvoiceNumber({ _id: 'abcdef1234567890abcdef12' }), 'INV-ABCDEF12');
});

const order = (over = {}) => ({
  _id: 'abcdef1234567890abcdef12', orderNumber: 'ORD-63569874-938', createdAt: new Date('2026-11-10'),
  orderStatus: 'delivered', paymentMethod: 'cod', paymentStatus: 'paid',
  shippingAddress: { fullName: 'Asha Rao', addressLine1: '12 MG Road', addressLine2: 'Near park', city: 'Pune', state: 'MH', pincode: '411001' },
  items: [{ name: 'Pen', quantity: 1, price: 1999 }, { name: 'Puzzle', quantity: 1, price: 699, variantLabel: 'Blue / M' }],
  pricing: { subtotal: 2698, couponDiscount: 270, shippingCharge: 0, tax: 437, total: 2865 },
  couponCode: 'G7C', ...over,
});

test('invoice PDF builds for a full brand, a bare brand and a guest buyer (no throw, valid PDF)', async () => {
  const brand = { name: 'Luxora', legalName: 'Luxora Retail Pvt Ltd', gstin: '22AAAAA0000A1Z5', address: '1 Main St, Bhubaneswar', tagline: 'Premium Shopping', supportEmail: 's@x.com', supportPhone: '9999900001', invoicePrefix: 'INV-' };
  for (const [o, u, b] of [[order(), { name: 'Krishna', email: 'k@x.com', phone: '8249623164' }, brand], [order(), { name: 'Guest' }, {}], [order({ pricing: { subtotal: 500, total: 500 } }), {}, { name: 'Shop' }]]) {
    const buf = await generateInvoicePDF(o, u, b);
    assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(buf.length > 1000);
  }
});

test('guard: no other client\'s name (MyShop) is hardcoded anywhere in backend/src', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const hits = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(js|mjs|hbs|json)$/.test(f.name) && /myshop/i.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(root, p));
    }
  };
  walk(root);
  assert.deepEqual(hits, []);
});
