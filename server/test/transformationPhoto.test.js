const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const TransformationPhoto = require('../models/TransformationPhoto');
const photoRoutes = require('../routes/transformationPhotoRoutes');

const jwtSecret = 'transformation-journal-test-secret';
const ownerId = '64b000000000000000000001';
const otherUserId = '64b000000000000000000002';
const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const webpBytes = Buffer.from('RIFF0000WEBP', 'ascii');

test('authenticated photo operations are private and owner-scoped', async (t) => {
  process.env.JWT_SECRET = jwtSecret;
  const photos = new Map();
  const originals = {
    findById: User.findById,
    find: TransformationPhoto.find,
    create: TransformationPhoto.create,
    findOne: TransformationPhoto.findOne,
    findOneAndUpdate: TransformationPhoto.findOneAndUpdate,
    findOneAndDelete: TransformationPhoto.findOneAndDelete,
  };

  User.findById = () => ({ select: async () => null });
  TransformationPhoto.create = async (data) => {
    const photo = { ...data, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date(), updatedAt: new Date() };
    photos.set(photo._id, photo);
    return photo;
  };
  TransformationPhoto.find = (query) => ({
    sort: async () => [...photos.values()]
      .filter((photo) => photo.user.toString() === query.user.toString())
      .sort((first, second) => second.date.localeCompare(first.date)),
  });
  TransformationPhoto.findOne = async (query) => {
    const photo = photos.get(query._id);
    return photo && photo.user.toString() === query.user.toString() ? photo : null;
  };
  TransformationPhoto.findOneAndUpdate = async (query, update) => {
    const photo = photos.get(query._id);
    if (!photo || photo.user.toString() !== query.user.toString()) return null;
    Object.assign(photo, update.$set, { updatedAt: new Date() });
    return photo;
  };
  TransformationPhoto.findOneAndDelete = async (query) => {
    const photo = photos.get(query._id);
    if (!photo || photo.user.toString() !== query.user.toString()) return null;
    photos.delete(query._id);
    return photo;
  };

  const app = express();
  app.use(express.json());
  app.use('/api/transformation-photos', photoRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    Object.assign(User, { findById: originals.findById });
    Object.assign(TransformationPhoto, {
      find: originals.find,
      create: originals.create,
      findOne: originals.findOne,
      findOneAndUpdate: originals.findOneAndUpdate,
      findOneAndDelete: originals.findOneAndDelete,
    });
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/transformation-photos`;
  const tokenFor = (id) => jwt.sign({ id, role: 'admin' }, jwtSecret);
  const request = (userId, path = '', options = {}) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {}),
    },
  });

  const unauthorized = await request(null);
  assert.equal(unauthorized.status, 401);

  const form = new FormData();
  form.append('photo', new Blob([pngBytes], { type: 'image/png' }), 'progress.png');
  form.append('date', '2026-10-13');
  form.append('notes', 'Journal test photo');
  form.append('userId', otherUserId);
  const createdResponse = await request(ownerId, '', { method: 'POST', body: form });
  assert.equal(createdResponse.status, 201);
  const createdBody = await createdResponse.json();
  const photoId = createdBody.photo.id;
  assert.equal(createdBody.photo.notes, 'Journal test photo');
  assert.equal(Object.hasOwn(createdBody.photo, 'image'), false);

  const ownerList = await (await request(ownerId)).json();
  const otherUserList = await (await request(otherUserId)).json();
  assert.equal(ownerList.photos.length, 1);
  assert.equal(otherUserList.photos.length, 0);

  const ownerImage = await request(ownerId, `/${photoId}/image`);
  assert.equal(ownerImage.status, 200);
  assert.equal(ownerImage.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await ownerImage.arrayBuffer()), pngBytes);

  assert.equal((await request(otherUserId, `/${photoId}/image`)).status, 404);
  assert.equal((await request(otherUserId, `/${photoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'Unauthorized edit' }),
  })).status, 404);
  assert.equal((await request(otherUserId, `/${photoId}`, { method: 'DELETE' })).status, 404);

  const updated = await request(ownerId, `/${photoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-10-12', notes: 'Updated journal note' }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).photo.notes, 'Updated journal note');
  assert.equal((await request(ownerId, `/${photoId}`, { method: 'DELETE' })).status, 200);
  assert.equal((await request(ownerId, `/${photoId}/image`)).status, 404);
});

test('upload rejects invalid image signatures and dates', async (t) => {
  process.env.JWT_SECRET = jwtSecret;
  const originalFindById = User.findById;
  const originalCreate = TransformationPhoto.create;
  User.findById = () => ({ select: async () => null });
  const stored = [];
  TransformationPhoto.create = async (data) => {
    stored.push(data);
    return { ...data, _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date(), updatedAt: new Date() };
  };

  const app = express();
  app.use(express.json());
  app.use('/api/transformation-photos', photoRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    User.findById = originalFindById;
    TransformationPhoto.create = originalCreate;
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/transformation-photos`;
  const headers = { Authorization: `Bearer ${jwt.sign({ id: ownerId, role: 'admin' }, jwtSecret)}` };
  for (const [contentType, bytes, fileName] of [
    ['image/jpeg', jpegBytes, 'progress.jpg'],
    ['image/png', pngBytes, 'progress.png'],
    ['image/webp', webpBytes, 'progress.webp'],
  ]) {
    const form = new FormData();
    form.append('photo', new Blob([bytes], { type: contentType }), fileName);
    form.append('date', '2026-10-13');
    const response = await fetch(baseUrl, { method: 'POST', headers, body: form });
    assert.equal(response.status, 201, `${contentType} upload should succeed`);
  }
  assert.deepEqual(stored.map((photo) => photo.contentType), ['image/jpeg', 'image/png', 'image/webp']);
  assert.equal(stored.every((photo) => photo.user.toString() === ownerId), true);

  const unsupportedForm = new FormData();
  unsupportedForm.append('photo', new Blob(['plain text'], { type: 'text/plain' }), 'notes.txt');
  unsupportedForm.append('date', '2026-10-13');
  const unsupported = await fetch(baseUrl, { method: 'POST', headers, body: unsupportedForm });
  assert.equal(unsupported.status, 415);

  const oversizedBytes = Buffer.alloc(8 * 1024 * 1024 + 1);
  oversizedBytes.set(pngBytes.subarray(0, 8));
  const oversizedForm = new FormData();
  oversizedForm.append('photo', new Blob([oversizedBytes], { type: 'image/png' }), 'oversized.png');
  oversizedForm.append('date', '2026-10-13');
  const oversized = await fetch(baseUrl, { method: 'POST', headers, body: oversizedForm });
  assert.equal(oversized.status, 413);

  const invalidDateForm = new FormData();
  invalidDateForm.append('photo', new Blob([pngBytes], { type: 'image/png' }), 'progress.png');
  invalidDateForm.append('date', '2026-02-30');
  const invalidDate = await fetch(baseUrl, { method: 'POST', headers, body: invalidDateForm });
  assert.equal(invalidDate.status, 400);
  assert.equal(stored.length, 3);
});
