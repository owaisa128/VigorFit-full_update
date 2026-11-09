const test = require('node:test');
const assert = require('node:assert/strict');
const { requirePlan } = require('../middleware/membershipMiddleware');

const runGuard = (plan, user) => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let passed = false;
  requirePlan(plan)({ user }, response, () => { passed = true; });
  return { response, passed };
};

test('membership guard allows plans meeting the minimum tier', () => {
  assert.equal(runGuard('basic', { role: 'user', membership: { planSlug: 'elite' } }).passed, true);
});

test('membership guard uses configured access tier for custom plan slugs', () => {
  assert.equal(runGuard('elite', {
    role: 'user',
    membership: { planSlug: 'student-plus', accessLevel: 'premium' },
  }).passed, true);
});

test('membership guard honors the higher tier when stored membership fields disagree', () => {
  assert.equal(runGuard('premium', {
    role: 'user',
    membership: { planSlug: 'premium', accessLevel: 'free' },
  }).passed, true);
});

test('membership guard rejects clients without the minimum tier', () => {
  const { response, passed } = runGuard('elite', { role: 'user', membership: { planSlug: 'basic' } });
  assert.equal(passed, false);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.requiredPlan, 'elite');
});

test('membership guard treats expired memberships as Free', () => {
  const { response, passed } = runGuard('basic', {
    role: 'user',
    membership: { planSlug: 'premium', endsAt: '2020-01-01T00:00:00.000Z' },
  });
  assert.equal(passed, false);
  assert.equal(response.statusCode, 403);
});

test('membership guard allows administrators and trainers', () => {
  assert.equal(runGuard('premium', { role: 'admin' }).passed, true);
  assert.equal(runGuard('elite', { role: 'trainer' }).passed, true);
});
