import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Round 5 Group 7B (backend): cron jobs must obey ENABLE_CRON_JOBS.
// node-cron v4: cron.schedule() starts the task AT IMPORT (scheduled:false is ignored), so
// the old abandoned-cart/coupon/stock/loyalty jobs ran even with the flag off. createTask()
// only builds the task; startCronJobs() starts it, and only when the flag is "true".
// Also: the abandoned-cart job skips users who unsubscribed.

const url = (p) => new URL(p, import.meta.url).href;

let scheduleCalls = 0;
const tasks = []; // { expr, fn, started, stopped }
mock.module('node-cron', {
  defaultExport: {
    schedule: () => { scheduleCalls++; return { start() {}, stop() {} }; },
    createTask: (expr, fn) => {
      const t = { expr, fn, started: 0, stopped: 0, start() { t.started++; }, stop() { t.stopped++; } };
      tasks.push(t);
      return t;
    },
  },
});

// abandoned-cart job ke liye fakes
let carts = [];
const sent = [];
const reminded = [];
const chain = (v) => { const p = Promise.resolve(v); p.populate = () => p; p.lean = () => p; return p; };
mock.module(url('../src/models/cart.model.js'), {
  defaultExport: {
    find: () => chain(carts),
    updateOne: async (f) => { reminded.push(String(f._id)); },
  },
});
mock.module(url('../src/services/email.service.js'), {
  namedExports: {
    sendAbandonedCartEmail: async (user) => { sent.push(user.email); return { success: true }; },
    sendLowStockAlertEmail: async () => true,
    sendOrderConfirmationEmail: async () => ({ success: true }),
    sendOrderShippedEmail: async () => ({ success: true }),
    sendOrderDeliveredEmail: async () => ({ success: true }),
  },
  defaultExport: async () => ({ success: true }),
});

const jobs = await import('../src/jobs/index.js');
const importTimeTasks = tasks.length;

const cart = (id, user) => ({ _id: id, userId: user, items: [{ quantity: 1, price: 100, product: { isActive: true, name: 'P' } }] });

beforeEach(() => { sent.length = 0; reminded.length = 0; delete process.env.ENABLE_CRON_JOBS; });

test('importing the jobs never starts anything and never uses cron.schedule()', () => {
  assert.equal(scheduleCalls, 0, 'cron.schedule() starts a task at import in node-cron v4');
  assert.equal(importTimeTasks, 5); // abandoned cart, coupons, low stock, loyalty, stale orders
  assert.ok(tasks.every((t) => t.started === 0));
});

test('startCronJobs does nothing unless ENABLE_CRON_JOBS is exactly "true"', () => {
  for (const v of [undefined, '', 'false', '1', 'TRUE']) {
    if (v === undefined) delete process.env.ENABLE_CRON_JOBS; else process.env.ENABLE_CRON_JOBS = v;
    jobs.startCronJobs();
  }
  assert.ok(tasks.every((t) => t.started === 0));
});

test('startCronJobs with the flag on starts all five jobs once; stopCronJobs stops them', () => {
  process.env.ENABLE_CRON_JOBS = 'true';
  jobs.startCronJobs();
  assert.deepEqual(tasks.map((t) => t.started), [1, 1, 1, 1, 1]);
  jobs.stopCronJobs();
  assert.deepEqual(tasks.map((t) => t.stopped), [1, 1, 1, 1, 1]);
});

test('abandoned-cart job skips unsubscribed users but mails opted-in and legacy users', async () => {
  carts = [
    cart('c1', { _id: 'u1', email: 'in@example.com', marketingEmails: true }),
    cart('c2', { _id: 'u2', email: 'out@example.com', marketingEmails: false }),
    cart('c3', { _id: 'u3', email: 'old@example.com' }), // purana user: field hai hi nahi => opted in
  ];
  const task = tasks.find((t) => t.expr === '0 * * * *');
  await task.fn();
  assert.deepEqual(sent.sort(), ['in@example.com', 'old@example.com']);
  assert.deepEqual(reminded.sort(), ['c1', 'c3']);
});
