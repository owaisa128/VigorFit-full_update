const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Set test environment variables before importing app
process.env.JWT_SECRET = 'vigorfit-test-secret-token-key-2026';
process.env.NODE_ENV = 'test';

const app = require('../server');
const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');
const VigorfitE = require('../models/VigorfitE');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');

const mockUserId = new mongoose.Types.ObjectId().toString();
const mockToken = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET, { expiresIn: '1h' });
const mockAdminToken = jwt.sign({ id: mockUserId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('1. Root endpoint GET / returns VigorFit API catalog and vigorfit_e metadata', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.equal(res.body.application, 'VigorFit API Server');
  assert.equal(res.body.database.primaryCollection, 'vigorfit_e');
  assert.equal(res.body.database.name, 'vfit');
  assert.ok(res.body.endpoints);
  assert.ok(res.body.endpoints.vigorfitPrimary);
});

test('2. Health check endpoint GET /api/health responds with operational status', async () => {
  const res = await request(app).get('/api/health');
  assert.ok([200, 503].includes(res.status));
  assert.equal(res.body.service, 'VigorFit API');
  assert.equal(res.body.primaryCollection, 'vigorfit_e');
  assert.ok(res.body.timestamp);
});

test('3. Security headers: Helmet headers are present on responses', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});

test('Public contact endpoint rejects invalid sender details without authentication', async () => {
  const response = await request(app)
    .post('/api/feedback/contact')
    .send({ name: 'A', email: 'invalid', subject: '', message: '' });
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test('Announcement broadcast is restricted to administrators', async () => {
  const response = await request(app)
    .post('/api/notifications/announcements')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ title: 'Update', message: 'Service update' });
  assert.equal(response.status, 403);
});

test('4. Validation: Registration fails when required fields are missing', async () => {
  const res = await request(app).post('/api/auth/register').send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.ok(res.body.message);
});

test('5. Validation: Registration fails with invalid email format', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Alex Fitness', email: 'invalid-email-address', password: 'password123' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /valid email/i);
});

test('6. Validation: Registration fails when password is under 6 characters', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Alex Fitness', email: 'alex@example.com', password: '123' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /6 characters/i);
});

test('Registration accepts longer top-level domains without pathological email matching', async () => {
  const user = new User({
    name: 'Email Validation',
    email: 'persistence_verification_1234567890@vigorfit.test',
    password: 'password123',
  });

  await assert.doesNotReject(user.validate());
});

test('Registration validates longer top-level domains before checking database state', async () => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Email Validation',
    email: 'persistence_verification_1234567890@vigorfit.test',
    password: 'password123',
  });

  assert.equal(res.status, 503);
  assert.match(res.body.message, /database connection unavailable/i);
});

test('Trainer registration requires normal account fields and waits for database availability', async () => {
  const invalid = await request(app).post('/api/trainers/register').send({});
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.message, /name/i);

  const valid = await request(app).post('/api/trainers/register').send({
    name: 'Trainer Applicant',
    email: 'trainer.applicant@example.com',
    password: 'password123',
    role: 'admin',
  });
  assert.equal(valid.status, 503);
  assert.match(valid.body.message, /database connection unavailable/i);
});

test('Trainer review rejects malformed tokens and profile completion requires a setup session', async () => {
  const decision = await request(app)
    .post('/api/trainers/email-decision')
    .send({ token: 'not-a-token', action: 'approve' });
  assert.equal(decision.status, 400);

  const profile = await request(app)
    .post('/api/trainers/complete-profile')
    .send({});
  assert.equal(profile.status, 401);
});

test('Trainer setup tokens cannot access regular protected endpoints', async () => {
  const setupToken = jwt.sign({
    id: mockUserId,
    role: 'trainer',
    trainerSetup: true,
  }, process.env.JWT_SECRET, { expiresIn: '30m' });

  const response = await request(app)
    .get('/api/workouts')
    .set('Authorization', `Bearer ${setupToken}`);
  assert.equal(response.status, 403);
  assert.match(response.body.message, /complete your trainer profile/i);
});

test('Trainer approval panel is restricted to administrators', async () => {
  const response = await request(app).get('/api/admin/trainers');
  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('Trainer role and approval status are represented in the account model', async () => {
  const trainer = new User({
    name: 'Trainer Applicant',
    email: 'trainer.model@example.test',
    password: 'password123',
    role: 'trainer',
    trainerApprovalStatus: 'awaiting_profile',
  });
  await assert.doesNotReject(trainer.validate());
  assert.equal(trainer.trainerProfile.clientCapacity, 10);

  trainer.role = 'superadmin';
  await assert.rejects(trainer.validate());
});

test('Membership plans are public but unavailable while the database is disconnected', async () => {
  const response = await request(app).get('/api/memberships/plans');
  assert.equal(response.status, 503);
  assert.match(response.body.message, /database connection unavailable/i);
});

test('Membership checkout requires authentication and validates plan input before database access', async () => {
  const unauthenticated = await request(app).post('/api/memberships/purchase').send({
    planSlug: 'elite',
    billingInterval: 'monthly',
    paymentMethod: 'card',
  });
  assert.equal(unauthenticated.status, 401);

  const invalidPlan = await request(app)
    .post('/api/memberships/purchase')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ planSlug: 'not a slug', billingInterval: 'monthly', paymentMethod: 'card' });
  assert.equal(invalidPlan.status, 400);

  const disconnected = await request(app)
    .post('/api/memberships/purchase')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({
      planSlug: 'elite',
      billingInterval: 'monthly',
      paymentMethod: 'card',
      paymentDetails: { holderName: 'Test Client', last4: '4242', brand: 'visa' },
    });
  assert.equal(disconnected.status, 503);

  const missingCardDetails = await request(app)
    .post('/api/memberships/purchase')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ planSlug: 'elite', billingInterval: 'monthly', paymentMethod: 'card' });
  assert.equal(missingCardDetails.status, 400);

  const badMobile = await request(app)
    .post('/api/memberships/purchase')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ planSlug: 'basic', billingInterval: 'monthly', paymentMethod: 'jazzcash', paymentDetails: { accountName: 'Test', mobile: '12345' } });
  assert.equal(badMobile.status, 400);
});

test('Quote and trainer selection endpoints require authentication', async () => {
  const quote = await request(app).get('/api/memberships/quote?planSlug=basic&billingInterval=monthly');
  assert.equal(quote.status, 401);
  const select = await request(app).post('/api/memberships/select-trainer').send({ trainerId: 'x' });
  assert.equal(select.status, 401);
  const badQuote = await request(app)
    .get('/api/memberships/quote?planSlug=not%20a%20slug&billingInterval=monthly')
    .set('Authorization', `Bearer ${mockToken}`);
  assert.equal(badQuote.status, 400);
});

test('Trainer availability is authenticated and rejects malformed trainer selections', async () => {
  const unauthenticated = await request(app).get('/api/memberships/available-trainers');
  assert.equal(unauthenticated.status, 401);

  const unavailableDatabase = await request(app)
    .get('/api/memberships/available-trainers')
    .set('Authorization', `Bearer ${mockToken}`);
  assert.equal(unavailableDatabase.status, 503);

  const invalidTrainer = await request(app)
    .post('/api/memberships/purchase')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ planSlug: 'premium', billingInterval: 'monthly', paymentMethod: 'card', trainerId: 'not-an-id' });
  assert.equal(invalidTrainer.status, 400);
});

test('Membership administration is restricted to administrators', async () => {
  const plans = await request(app).get('/api/admin/membership-plans');
  const purchases = await request(app).get('/api/admin/membership-purchases');
  const update = await request(app).put('/api/admin/membership-plans/basic').send({});
  assert.equal(plans.status, 401);
  assert.equal(purchases.status, 401);
  assert.equal(update.status, 401);
});

test('7. Validation: Login fails when email or password is missing', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'alex@example.com' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /password/i);
});

test('8. Authentication: Protected routes reject requests without a token', async () => {
  const endpoints = [
    '/api/auth/profile',
    '/api/workouts',
    '/api/nutrition',
    '/api/progress',
    '/api/vigorfit-entries',
    '/api/notifications',
    '/api/dashboard',
    '/api/settings',
    '/api/export/csv',
    '/api/export/json',
  ];

  for (const endpoint of endpoints) {
    const res = await request(app).get(endpoint);
    assert.equal(res.status, 401, `Expected 401 for ${endpoint}`);
    assert.equal(res.body.success, false);
  }
});

test('9. Authentication: Protected routes reject invalid JWT tokens', async () => {
  const res = await request(app)
    .get('/api/auth/profile')
    .set('Authorization', 'Bearer invalid.token.payload');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('10. Workouts: Validation rejects empty exercise arrays', async () => {
  const res = await request(app)
    .post('/api/workouts')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ title: 'Morning Routine', exercises: [] });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /at least one exercise/i);
});

test('11. Nutrition: Validation rejects invalid meal types', async () => {
  const res = await request(app)
    .post('/api/nutrition')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ mealType: 'midnight_feast', foodName: 'Pizza', calories: 600 });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /breakfast, lunch, dinner, or snack/i);
});

test('12. Progress: Validation rejects non-numeric weight', async () => {
  const res = await request(app)
    .post('/api/progress')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ weight: 'not-a-number' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('13. VigorfitE: Validation rejects missing title for primary collection records', async () => {
  const res = await request(app)
    .post('/api/vigorfit-entries')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ category: 'Workout', metricValue: 10 });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /title is required/i);
});

test('14. VigorfitE: Dual route mounting - /api/vigorfit works identically to /api/vigorfit-entries', async () => {
  const res1 = await request(app)
    .post('/api/vigorfit')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({});
  const res2 = await request(app)
    .post('/api/vigorfit-entries')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({});
  assert.equal(res1.status, 400);
  assert.equal(res2.status, 400);
  assert.equal(res1.body.message, res2.body.message);
});

test('15. Notifications: Validation rejects notification without title and message', async () => {
  const res = await request(app)
    .post('/api/notifications')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('16. AI Chat: Status endpoint GET /api/chat/status returns configuration info', async () => {
  const res = await request(app).get('/api/chat/status');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.hasOwnProperty('configured'));
  assert.ok(res.body.model);
});

test('17. AI Chat: Validation rejects empty chat message', async () => {
  const res = await request(app)
    .post('/api/chat')
    .set('Authorization', `Bearer ${mockAdminToken}`)
    .send({ message: '   ' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /valid message/i);
});

test('18. Error Handling: 404 handler returns structured JSON on non-existent endpoints', async () => {
  const res = await request(app).get('/api/non-existent-route-999');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /not found/i);
});

test('19. Dashboard: Authenticated GET /api/dashboard handles database gracefully', async () => {
  const res = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${mockToken}`);
  // Either 200 (if DB connected) or 503 (if DB offline in test)
  assert.ok([200, 503].includes(res.status));
});

test('20. Settings: Authenticated GET /api/settings handles database gracefully', async () => {
  const res = await request(app)
    .get('/api/settings')
    .set('Authorization', `Bearer ${mockToken}`);
  assert.ok([200, 503].includes(res.status));
});

test('21. Export CSV: Validation rejects unsupported export type', async () => {
  const res = await request(app)
    .get('/api/export/csv?type=unsupported_type')
    .set('Authorization', `Bearer ${mockAdminToken}`);
  // Either 400 (validation) or 503 (db check first)
  assert.ok([400, 503].includes(res.status));
});

test('22. Export JSON: Authenticated GET /api/export/json handles database gracefully', async () => {
  const res = await request(app)
    .get('/api/export/json')
    .set('Authorization', `Bearer ${mockAdminToken}`);
  assert.ok([200, 503].includes(res.status));
});

test('23. VigorfitE: Authenticated GET /api/vigorfit-entries/stats handles database gracefully', async () => {
  const res = await request(app)
    .get('/api/vigorfit-entries/stats')
    .set('Authorization', `Bearer ${mockToken}`);
  assert.ok([200, 503].includes(res.status));
});

test('24. Profile Update: Validation rejects out-of-range target calories', async () => {
  const res = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ targetCalories: 999999 });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /target calories/i);
});

test('Profile Update: Validation rejects invalid client fitness requirements and experience level', async () => {
  const oversizedRequirements = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ fitnessRequirements: 'x'.repeat(1001) });
  assert.equal(oversizedRequirements.status, 400);
  assert.match(oversizedRequirements.body.message, /1,000 characters/i);

  const invalidExperience = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${mockToken}`)
    .send({ trainingExperience: 'expert' });
  assert.equal(invalidExperience.status, 400);
  assert.match(invalidExperience.body.message, /experience level/i);
});

test('25. Auth Logout: POST /api/auth/logout responds with success message', async () => {
  const res = await request(app).post('/api/auth/logout');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /logged out/i);
});

test('26. Nutrition: GET /api/nutrition/:id is protected and rejects unauthorized requests', async () => {
  const unauthRes = await request(app).get('/api/nutrition/507f1f77bcf86cd799439011');
  assert.equal(unauthRes.status, 401);

  const authRes = await request(app)
    .get('/api/nutrition/507f1f77bcf86cd799439011')
    .set('Authorization', `Bearer ${mockToken}`);
  assert.ok([404, 503].includes(authRes.status));
});

test('27. Admin RBAC: GET /api/admin/users rejects unauthenticated requests with 401', async () => {
  const res = await request(app).get('/api/admin/users');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('28. Admin RBAC: GET /api/admin/users rejects regular user tokens with 403', async () => {
  const res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${mockToken}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /administrator/i);
});

test('29. Admin Clients: Authenticated admin GET /api/admin/users handles request cleanly', async () => {
  const mockAdminId = new mongoose.Types.ObjectId().toString();
  const adminToken = jwt.sign({ id: mockAdminId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.ok([200, 503].includes(res.status));
});

test('30. Admin Clients: Validation rejects invalid ObjectId on GET /api/admin/users/:id', async () => {
  const mockAdminId = new mongoose.Types.ObjectId().toString();
  const adminToken = jwt.sign({ id: mockAdminId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const res = await request(app)
    .get('/api/admin/users/not-a-valid-id')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /invalid user id/i);
});

test('31. Admin Clients: Validation rejects invalid role on PATCH /api/admin/users/:id/role', async () => {
  const mockAdminId = new mongoose.Types.ObjectId().toString();
  const adminToken = jwt.sign({ id: mockAdminId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const res = await request(app)
    .patch(`/api/admin/users/${mockUserId}/role`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: 'super-god-mode' });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /role must be one of/i);
});
