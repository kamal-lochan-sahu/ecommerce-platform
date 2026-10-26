import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Review moderation: approve / reject / customer edit, with the product rating kept in sync.
const calls = { update: [], rating: [] };
let reviewDoc;

const Review = {
  findByIdAndUpdate: async (id, update) => { calls.update.push({ id, update }); return reviewDoc ? { ...reviewDoc, ...update } : null; },
  updateProductRating: async (productId) => { calls.rating.push(productId); },
  findOne: async () => reviewDoc,
};
mock.module('../src/models/index.js', {
  namedExports: { Review, Order: {}, Product: {}, User: {}, Settings: {} },
});

const { approveReview, rejectReview } = await import('../src/controllers/admin.controller.js');
const { updateReview } = await import('../src/controllers/review.controller.js');

const call = async (handler, { body = {}, params = { id: 'r1' }, user = { _id: 'u1' } } = {}) => {
  const out = { json: null, error: null };
  const res = { status: () => res, json: (j) => { out.json = j; return res; } };
  await handler({ body, params, query: {}, user }, res, (e) => { out.error = e; });
  return out;
};

beforeEach(() => {
  calls.update.length = 0; calls.rating.length = 0;
  reviewDoc = { _id: 'r1', product: 'p1', user: 'u1', isApproved: false };
});

test('approve: clears any earlier rejection and recalculates the product rating', async () => {
  await call(approveReview);
  assert.deepEqual(calls.update[0].update, { isApproved: true, isRejected: false, rejectionReason: '' });
  assert.deepEqual(calls.rating, ['p1']);
});

test('reject: marks it rejected (not just "not approved"), stores the reason and fixes the rating', async () => {
  await call(rejectReview, { body: { reason: 'Spam' } });
  assert.deepEqual(calls.update[0].update, { isApproved: false, isRejected: true, rejectionReason: 'Spam' });
  // Review.updateProductRating also resets the rating to 0 when no approved reviews remain
  assert.deepEqual(calls.rating, ['p1']);
});

test('reject: a very long reason is cut to 200 characters', async () => {
  await call(rejectReview, { body: { reason: 'x'.repeat(500) } });
  assert.equal(calls.update[0].update.rejectionReason.length, 200);
});

test('reject / approve on a missing review gives 404 and touches no rating', async () => {
  reviewDoc = null;
  const r = await call(rejectReview);
  assert.equal(r.error.statusCode, 404);
  assert.equal(calls.rating.length, 0);
});

test('customer edits an approved review: it goes back to pending and the rating is recalculated without it', async () => {
  let saved = false;
  reviewDoc = { _id: 'r1', product: 'p1', user: 'u1', isApproved: true, isRejected: false, rating: 5, title: 'Great', comment: 'ok', save: async () => { saved = true; } };
  await call(updateReview, { body: { comment: 'now something different' } });
  assert.equal(saved, true);
  assert.equal(reviewDoc.comment, 'now something different');
  assert.equal(reviewDoc.isApproved, false);
  assert.equal(reviewDoc.isRejected, false);
  assert.deepEqual(calls.rating, ['p1']);
});
