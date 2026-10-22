import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  allowedNextStatuses, checkTransition, isRefundDue, canFulfil,
} from '../src/utils/orderRules.js';
import { escapeRegex } from '../src/utils/escapeRegex.js';
import { startOfDayInTz, endOfDayInTz, startOfMonthInTz, startOfDaysAgoInTz } from '../src/utils/timezone.js';

const order = (o) => ({ paymentMethod: 'cod', paymentStatus: 'pending', orderStatus: 'placed', ...o });

test('status flow only moves forward; cancel allowed until delivered; return only after delivered', () => {
  assert.deepEqual(allowedNextStatuses(order({ orderStatus: 'placed' })), ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
  assert.deepEqual(allowedNextStatuses(order({ orderStatus: 'processing' })), ['shipped', 'delivered', 'cancelled']);
  assert.deepEqual(allowedNextStatuses(order({ orderStatus: 'shipped' })), ['delivered', 'cancelled']);
  assert.deepEqual(allowedNextStatuses(order({ orderStatus: 'delivered' })), ['returned']);
});

test('cancelled and returned are final', () => {
  assert.deepEqual(allowedNextStatuses(order({ orderStatus: 'cancelled' })), []);
  assert.deepEqual(allowedNextStatuses(order({ orderStatus: 'returned' })), []);
  assert.equal(checkTransition(order({ orderStatus: 'cancelled' }), 'processing').ok, false);
});

test('going backwards is refused with a clear message', () => {
  const r = checkTransition(order({ orderStatus: 'delivered' }), 'processing');
  assert.equal(r.ok, false);
  assert.match(r.message, /from "delivered" to "processing"/);
  assert.equal(checkTransition(order({ orderStatus: 'shipped' }), 'returned').ok, false); // return needs delivery first
  assert.equal(checkTransition(order({ orderStatus: 'placed' }), 'placed').ok, false);
});

test('unpaid ONLINE order can only be cancelled; COD and paid online can proceed', () => {
  const unpaid = order({ paymentMethod: 'razorpay', paymentStatus: 'pending' });
  assert.equal(canFulfil(unpaid), false);
  assert.deepEqual(allowedNextStatuses(unpaid), ['cancelled']);
  const r = checkTransition(unpaid, 'shipped');
  assert.equal(r.ok, false);
  assert.match(r.message, /Payment for this online order is not received/);

  assert.equal(checkTransition(order({ paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'confirmed' }), 'shipped').ok, true);
  assert.equal(checkTransition(order({ paymentMethod: 'cod' }), 'shipped').ok, true);
});

test('refund is due only for cancelled/returned orders that were paid', () => {
  assert.equal(isRefundDue(order({ orderStatus: 'cancelled', paymentStatus: 'paid', paymentMethod: 'razorpay' })), true);
  assert.equal(isRefundDue(order({ orderStatus: 'returned', paymentStatus: 'paid' })), true);
  assert.equal(isRefundDue(order({ orderStatus: 'cancelled', paymentStatus: 'pending' })), false); // never paid (COD/unpaid)
  assert.equal(isRefundDue(order({ orderStatus: 'cancelled', paymentStatus: 'refunded' })), false); // already refunded
  assert.equal(isRefundDue(order({ orderStatus: 'delivered', paymentStatus: 'paid' })), false);
});

test('escapeRegex makes user text safe for $regex', () => {
  assert.doesNotThrow(() => new RegExp(escapeRegex('(')));
  assert.doesNotThrow(() => new RegExp(escapeRegex('[a-')));
  assert.equal(new RegExp(escapeRegex('a.c')).test('abc'), false); // "." is literal now
  assert.equal(new RegExp(escapeRegex('a.c')).test('a.c'), true);
});

test('IST day boundaries: an order at 01:30 IST belongs to that IST day, not the previous UTC day', () => {
  const t = new Date('2026-10-20T20:00:00Z'); // = 21 Oct 01:30 IST
  assert.equal(startOfDayInTz(t, 'Asia/Kolkata').toISOString(), '2026-10-20T18:30:00.000Z');
  assert.equal(endOfDayInTz(t, 'Asia/Kolkata').toISOString(), '2026-10-21T18:29:59.999Z');
  const noon = new Date('2026-10-21T06:30:00Z'); // 12:00 IST
  assert.equal(startOfDayInTz(noon, 'Asia/Kolkata').toISOString(), '2026-10-20T18:30:00.000Z');
});

test('month and N-days-ago starts are computed in the store timezone', () => {
  const t = new Date('2026-10-31T20:00:00Z'); // = 1 Nov 01:30 IST
  assert.equal(startOfMonthInTz(t, 0, 'Asia/Kolkata').toISOString(), '2026-10-31T18:30:00.000Z'); // 1 Nov 00:00 IST
  assert.equal(startOfMonthInTz(t, 5, 'Asia/Kolkata').toISOString(), '2026-05-31T18:30:00.000Z'); // 1 Jun 00:00 IST
  assert.equal(startOfDaysAgoInTz(29, new Date('2026-10-21T06:30:00Z'), 'Asia/Kolkata').toISOString(), '2026-09-21T18:30:00.000Z');
});

test('UTC timezone still works (white-label clients elsewhere)', () => {
  const t = new Date('2026-10-20T20:00:00Z');
  assert.equal(startOfDayInTz(t, 'UTC').toISOString(), '2026-10-20T00:00:00.000Z');
});
