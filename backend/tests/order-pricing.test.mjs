import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateOrderPricing } from '../src/utils/orderPricing.js';
import { calculateOrderPricing as frontendCalc } from '../../frontend/src/utils/orderPricing.js';

// Round 5 Group 7C: GST discount ke BAAD wali amount par lagta hai (pehle poore subtotal par lagta tha,
// to coupon lene wala customer discount wale hisse par bhi tax deta tha).

const S = { taxRate: 18, deliveryFee: 49, freeDeliveryAbove: 499 };

test('no coupon: tax on the whole subtotal (unchanged)', () => {
  const p = calculateOrderPricing({ subtotal: 2698, couponDiscount: 0, settings: S });
  assert.equal(p.tax, 486);
  assert.equal(p.shippingCharge, 0);
  assert.equal(p.total, 3184);
});

test('the live-test order: Rs 2,698 with a Rs 500 coupon -> tax on Rs 2,198, not Rs 2,698', () => {
  const p = calculateOrderPricing({ subtotal: 2698, couponDiscount: 500, settings: S });
  assert.equal(p.taxableAmount, 2198);
  assert.equal(p.tax, 396); // pehle 486 (customer ne Rs 90 zyada tax diya)
  assert.equal(p.total, 2594); // pehle 2684
});

test('free delivery is decided on the pre-discount subtotal', () => {
  const p = calculateOrderPricing({ subtotal: 520, couponDiscount: 100, settings: S });
  assert.equal(p.shippingCharge, 0); // 520 >= 499 even though 420 after the coupon
  const small = calculateOrderPricing({ subtotal: 300, couponDiscount: 50, settings: S });
  assert.equal(small.shippingCharge, 49);
  assert.equal(small.tax, 45); // 18% of 250
  assert.equal(small.total, 344); // 250 + 49 + 45
});

test('a discount can never push the taxable amount or the total below zero', () => {
  const p = calculateOrderPricing({ subtotal: 1000, couponDiscount: 5000, settings: S });
  assert.equal(p.couponDiscount, 1000);
  assert.equal(p.taxableAmount, 0);
  assert.equal(p.tax, 0);
  assert.equal(p.total, 0);
  assert.equal(calculateOrderPricing({ subtotal: 1000, couponDiscount: -50, settings: S }).couponDiscount, 0);
});

test('zero tax rate still works', () => {
  const p = calculateOrderPricing({ subtotal: 1000, couponDiscount: 100, settings: { ...S, taxRate: 0 } });
  assert.equal(p.tax, 0);
  assert.equal(p.total, 900);
});

test('backend and frontend checkout use the exact same maths (parity over a grid)', () => {
  for (const taxRate of [0, 5, 12, 18, 28]) {
    for (const subtotal of [1, 99, 300, 498, 499, 520, 2698, 15999]) {
      for (const couponDiscount of [0, 1, 50, 500, 2000, 99999]) {
        const settings = { taxRate, deliveryFee: 49, freeDeliveryAbove: 499 };
        assert.deepEqual(
          frontendCalc({ subtotal, couponDiscount, settings }),
          calculateOrderPricing({ subtotal, couponDiscount, settings }),
          `mismatch for ${JSON.stringify({ taxRate, subtotal, couponDiscount })}`
        );
      }
    }
  }
});

test('no controller or page computes tax on its own any more', () => {
  const order = fs.readFileSync(new URL('../src/controllers/order.controller.js', import.meta.url), 'utf8');
  const checkout = fs.readFileSync(new URL('../../frontend/src/pages/customer/Checkout.jsx', import.meta.url), 'utf8');
  assert.ok(!/Math\.round\(\s*subtotal\s*\*\s*\(settings\.taxRate/.test(order), 'order.controller computes tax itself');
  assert.ok(!/Math\.round\(\s*totalAmount\s*\*\s*\(settings\.taxRate/.test(checkout), 'Checkout computes tax itself');
  assert.match(order, /calculateOrderPricing\(/);
  assert.match(checkout, /calculateOrderPricing\(/);
});
