// Round 5 Group 8C-1: legal pages + FAQs (defaults from settings, admin override), SEO files, validation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorePages, buildDefaultStorePages, buildDefaultPage, PAGE_KEYS } from '../src/utils/storePages.js';
import { buildRobotsTxt, buildSitemapXml, PRIVATE_PATHS, STATIC_PATHS } from '../src/utils/seo.js';
import { validateBrandSettings, BRAND_SETTINGS_FIELDS } from '../src/utils/brandSettings.js';

const settings = {
  storeName: 'Acme Store', legalName: 'Acme Retail Pvt Ltd', storeEmail: 'help@acme.test', storePhone: '9999900001',
  storeAddress: '1 Main Street, Pune', supportHours: 'Mon-Sat, 10am-7pm', returnWindowDays: 10, deliveryFee: 60,
  freeDeliveryAbove: 999, currency: 'INR', allowGuestCheckout: true,
};

test('defaults are built from the store settings (name, legal name, contact, delivery, return days)', () => {
  const r = resolveStorePages(settings);
  assert.deepEqual(Object.keys(r.pages), PAGE_KEYS);
  assert.match(r.pages.terms.content, /Acme Store/);
  assert.match(r.pages.terms.content, /Acme Retail Pvt Ltd, 1 Main Street, Pune/);
  assert.match(r.pages.privacy.content, /help@acme\.test/);
  assert.match(r.pages.shipping.content, /free on orders of ₹999 or more/);
  assert.match(r.pages.shipping.content, /charge of ₹60/);
  assert.match(r.pages.returns.content, /within 10 days of delivery/);
  assert.equal(r.pages.terms.custom, false);
  assert.equal(r.faqsCustom, false);
  assert.ok(r.faqs.length >= 6);
});

test('defaults follow the settings: return window 0, free delivery on all orders, guest checkout off', () => {
  const noReturns = resolveStorePages({ ...settings, returnWindowDays: 0 });
  assert.match(noReturns.pages.returns.content, /do not accept returns for a change of mind/);
  assert.ok(!/within 0 day/.test(noReturns.pages.returns.content));
  assert.match(noReturns.faqs.find((f) => /return/i.test(f.question)).answer, /do not accept returns/);

  const one = resolveStorePages({ ...settings, returnWindowDays: 1 });
  assert.match(one.pages.returns.content, /within 1 day of delivery/);

  assert.match(buildDefaultPage('shipping', { ...settings, freeDeliveryAbove: 0 }), /free on all orders/);
  assert.match(buildDefaultPage('shipping', { ...settings, deliveryFee: 0 }), /free on all orders/);

  const noGuest = resolveStorePages({ ...settings, allowGuestCheckout: false });
  assert.match(noGuest.faqs.find((f) => /account/i.test(f.question)).answer, /^Yes/);
});

test('no contact details set: pages still read fine and never print "undefined"', () => {
  const bare = resolveStorePages({ storeName: 'Shop' });
  for (const k of PAGE_KEYS) {
    assert.ok(!/undefined|null|NaN/.test(bare.pages[k].content), k);
    assert.match(bare.pages[k].content, /Contact page/);
  }
  assert.ok(!/undefined|null|NaN/.test(JSON.stringify(bare.faqs)));
});

test('admin custom text replaces the default; blank means default again; ?defaults ignores custom', () => {
  const custom = { ...settings, policyTerms: '  ## My terms\nCustom text  ', faqs: [{ question: 'Q1?', answer: 'A1' }, { question: '', answer: 'x' }] };
  const r = resolveStorePages(custom);
  assert.equal(r.pages.terms.content, '## My terms\nCustom text');
  assert.equal(r.pages.terms.custom, true);
  assert.equal(r.pages.privacy.custom, false);
  assert.deepEqual(r.faqs, [{ question: 'Q1?', answer: 'A1' }]);
  assert.equal(r.faqsCustom, true);

  const d = buildDefaultStorePages(custom);
  assert.match(d.pages.terms.content, /About these terms/);
  assert.equal(d.faqsCustom, false);
  assert.equal(resolveStorePages({ ...settings, policyTerms: '   ' }).pages.terms.custom, false);
});

test('validation: policy text length, FAQ shape and limits', () => {
  assert.ok(BRAND_SETTINGS_FIELDS.includes('policyTerms') && BRAND_SETTINGS_FIELDS.includes('faqs'));
  assert.equal(validateBrandSettings({ policyReturns: '  a\r\nb  ' }).policyReturns, 'a\nb');
  assert.throws(() => validateBrandSettings({ policyTerms: 'x'.repeat(30001) }), (e) => e.statusCode === 400);

  const ok = validateBrandSettings({ faqs: [{ question: ' Q ', answer: ' A ' }, { question: '', answer: '' }] });
  assert.deepEqual(ok.faqs, [{ question: 'Q', answer: 'A' }]);
  assert.deepEqual(validateBrandSettings({ faqs: [] }).faqs, []);
  for (const bad of [
    'text',
    [{ question: 'only q', answer: '' }],
    [{ question: 'q'.repeat(201), answer: 'a' }],
    [{ question: 'q', answer: 'a'.repeat(2001) }],
    Array.from({ length: 31 }, (_, i) => ({ question: `q${i}`, answer: 'a' })),
  ]) {
    assert.throws(() => validateBrandSettings({ faqs: bad }), (e) => e.statusCode === 400);
  }
});

test('robots.txt hides private pages and points to the sitemap on the storefront domain', () => {
  const txt = buildRobotsTxt('https://shop.example.com');
  assert.match(txt, /^User-agent: \*\nAllow: \//);
  for (const p of ['/admin', '/cart', '/checkout', '/orders', '/profile']) assert.ok(txt.includes(`Disallow: ${p}\n`), p);
  assert.ok(txt.includes('Sitemap: https://shop.example.com/sitemap.xml'));
  assert.ok(!buildRobotsTxt('').includes('Sitemap:'));
  assert.ok(STATIC_PATHS.every((p) => !PRIVATE_PATHS.some((x) => p === x || p.startsWith(`${x}/`))));
});

test('sitemap lists static pages, categories and products; escapes special characters', () => {
  const xml = buildSitemapXml({
    siteUrl: 'https://shop.example.com',
    products: [{ slug: 'blue-shirt', updatedAt: '2026-11-10T10:00:00Z' }, { slug: 'a&b "c"' }, { slug: '' }],
    categories: [{ slug: 'home-living' }],
  });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.ok(xml.includes('<loc>https://shop.example.com/</loc>'));
  assert.ok(xml.includes('<loc>https://shop.example.com/terms</loc>'));
  assert.ok(xml.includes('<loc>https://shop.example.com/products?category=home-living</loc>'));
  assert.ok(xml.includes('<loc>https://shop.example.com/products/blue-shirt</loc><lastmod>2026-11-10</lastmod>'));
  assert.ok(!xml.includes('a&b'), 'raw & must not appear');
  assert.ok(xml.includes('a%26b'), 'slug is URL-encoded');
  assert.equal((xml.match(/<url>/g) || []).length, STATIC_PATHS.length + 1 + 2);
});
