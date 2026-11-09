const test = require('node:test');
const assert = require('node:assert/strict');
const { isActiveTrainerMembership } = require('../controllers/trainerWorkspaceController');

test('trainer meal plans require an active trainer-included membership and assignment', () => {
  const future = new Date(Date.now() + 60_000);
  assert.equal(isActiveTrainerMembership({
    planSlug: 'premium',
    assignedTrainer: 'trainer-id',
    endsAt: future,
  }), true);
  assert.equal(isActiveTrainerMembership({
    trainerIncluded: true,
    assignedTrainer: 'trainer-id',
    endsAt: future,
  }), true);
});

test('trainer meal plans are unavailable without assignment or after expiry', () => {
  assert.equal(isActiveTrainerMembership({
    planSlug: 'premium',
    endsAt: new Date(Date.now() + 60_000),
  }), false);
  assert.equal(isActiveTrainerMembership({
    planSlug: 'premium',
    assignedTrainer: 'trainer-id',
    endsAt: new Date(Date.now() - 60_000),
  }), false);
  assert.equal(isActiveTrainerMembership({
    planSlug: 'free',
    assignedTrainer: 'trainer-id',
    endsAt: new Date(Date.now() + 60_000),
  }), false);
});

test('Basic members with an assigned trainer get trainer meal plans, but not messages or Zoom classes', () => {
  const basic = { planSlug: 'basic', accessLevel: 'basic', assignedTrainer: 'trainer-id', endsAt: new Date(Date.now() + 60_000) };
  assert.equal(isActiveTrainerMembership(basic), true);
  assert.equal(isActiveTrainerMembership(basic, 'trainerMessages'), false);
  assert.equal(isActiveTrainerMembership(basic, 'zoomClasses'), false);
  assert.equal(isActiveTrainerMembership({ ...basic, accessLevel: 'elite', planSlug: 'elite' }, 'zoomClasses'), true);
});
