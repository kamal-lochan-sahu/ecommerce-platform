import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { upload } from '../src/middleware/upload.middleware.js';
import { parseJsonFields } from '../src/middleware/parseJsonFields.middleware.js';
import { validate } from '../src/middleware/validate.middleware.js';
import { updateProductSchema, createProductSchema } from '../src/validators/product.validator.js';

// Real multer + parseJsonFields + Joi, same order as product.routes.js.
// Admin AddProduct/EditProduct forms multipart FormData bhejte hain, isliye yahi shape test karte hain.
const app = express();
const chain = (schema) => [upload.array('images', 10), parseJsonFields('tags', 'specifications', 'dimensions', 'meta', 'removeImages'), validate(schema)];
app.post('/create', ...chain(createProductSchema), (req, res) => res.json({ body: req.body }));
app.put('/update', ...chain(updateProductSchema), (req, res) => res.json({ body: req.body }));
app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));

let server, base;
before(async () => { await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

const send = async (method, path, fields) => {
  const fd = new FormData();
  for (const [k, v] of fields) fd.append(k, v);
  const res = await fetch(base + path, { method, body: fd });
  return { status: res.status, json: await res.json() };
};

const base_ = [['name', 'Test Kurta'], ['description', 'A long enough description'], ['category', 'cat1'], ['price', '999']];

test('create: tags + specifications sent as JSON strings arrive as real arrays', async () => {
  const r = await send('POST', '/create', [
    ...base_,
    ['tags', JSON.stringify(['silk', 'festive'])],
    ['specifications', JSON.stringify([{ key: 'Material', value: 'Silk' }])],
  ]);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json.body.tags, ['silk', 'festive']);
  assert.deepEqual(r.json.body.specifications, [{ key: 'Material', value: 'Silk' }]);
});

test('create: AddProduct payload (specs as brackets, tags as ONE JSON string) is stored clean', async () => {
  // multer 2.x parses bracket-notation itself; tags must be sent exactly once.
  const r = await send('POST', '/create', [
    ...base_,
    ['specifications[0][key]', 'Material'], ['specifications[0][value]', 'Silk'],
    ['tags', JSON.stringify(['silk', 'festive'])],
  ]);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json.body.specifications, [{ key: 'Material', value: 'Silk' }]);
  assert.deepEqual(r.json.body.tags, ['silk', 'festive']);
});

test('update: empty arrays are accepted (admin clears all tags/specs)', async () => {
  const r = await send('PUT', '/update', [['tags', '[]'], ['specifications', '[]']]);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json.body.tags, []);
  assert.deepEqual(r.json.body.specifications, []);
});

test('update: the full EditProduct payload passes validation', async () => {
  const r = await send('PUT', '/update', [
    ['name', 'Edited'], ['description', 'Edited description text'], ['category', 'cat1'], ['brand', ''],
    ['price', '1200'], ['comparePrice', '0'], ['stock', '5'], ['sku', 'SKU-1'],
    ['tags', '["a"]'], ['specifications', '[{"key":"k","value":"v"}]'],
  ]);
  assert.equal(r.status, 200, JSON.stringify(r.json));
});

test('update: unknown field salePrice is rejected (field does not exist, real one is comparePrice)', async () => {
  const r = await send('PUT', '/update', [['salePrice', '500']]);
  assert.equal(r.status, 400);
  assert.match(r.json.message, /salePrice/);
});

test('update: tags as a plain comma string is rejected (Joi wants an array)', async () => {
  const r = await send('PUT', '/update', [['tags', 'silk,festive']]);
  assert.equal(r.status, 400); // not valid JSON -> clear 400, not a silent save of garbage
});

test('invalid JSON in a JSON field gives a clear 400', async () => {
  const r = await send('PUT', '/update', [['specifications', '{oops']]);
  assert.equal(r.status, 400);
  assert.match(r.json.message, /specifications/);
});

test('empty-string JSON field is treated as not sent', async () => {
  const r = await send('PUT', '/update', [['tags', '']]);
  assert.equal(r.status, 200);
  assert.equal(r.json.body.tags, undefined);
});

test('update: removeImages (JSON array of URLs) arrives as an array and passes validation', async () => {
  const r = await send('PUT', '/update', [
    ['removeImages', JSON.stringify(['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'])],
    ['lowStockThreshold', '4'],
  ]);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json.body.removeImages, ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']);
});

test('create: removeImages is not a create-time field', async () => {
  const r = await send('POST', '/create', [...base_, ['removeImages', '["x"]']]);
  assert.equal(r.status, 400);
});
