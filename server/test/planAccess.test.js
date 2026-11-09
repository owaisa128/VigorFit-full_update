const test = require('node:test');
const assert = require('node:assert/strict');
const { hasFeature, planIncludesTrainer, rankOf, tierFilter } = require('../utils/planAccess');

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);
const member = (accessLevel, endsAt = future) => ({ accessLevel, planSlug: accessLevel, endsAt });

test('Basic unlocks the trainer, trainer workouts and nutrition only', () => {
  const basic = member('basic');
  ['trainer', 'trainerWorkouts', 'trainerNutrition'].forEach((f) => assert.equal(hasFeature(basic, f), true, f));
  ['trainerMessages', 'zoomClasses', 'liveTracking'].forEach((f) => assert.equal(hasFeature(basic, f), false, f));
});

test('Elite adds trainer messages and Zoom classes but not live tracking', () => {
  const elite = member('elite');
  ['trainer', 'trainerWorkouts', 'trainerNutrition', 'trainerMessages', 'zoomClasses'].forEach((f) => assert.equal(hasFeature(elite, f), true, f));
  assert.equal(hasFeature(elite, 'liveTracking'), false);
});

test('Premium unlocks everything including live tracking', () => {
  const premium = member('premium');
  ['trainer', 'trainerWorkouts', 'trainerNutrition', 'trainerMessages', 'zoomClasses', 'liveTracking'].forEach((f) => assert.equal(hasFeature(premium, f), true, f));
});

test('Free and expired memberships unlock nothing', () => {
  assert.equal(hasFeature({ accessLevel: 'free', planSlug: 'free' }, 'trainer'), false);
  assert.equal(hasFeature(member('premium', past), 'trainer'), false);
  assert.equal(hasFeature(null, 'trainer'), false);
  assert.equal(hasFeature(member('premium'), 'unknownFeature'), false);
});

test('legacy documents without accessLevel fall back to planSlug', () => {
  assert.equal(rankOf({ planSlug: 'premium' }), 3);
  assert.equal(hasFeature({ planSlug: 'elite', endsAt: future }, 'zoomClasses'), true);
});

test('plans include a trainer from Basic upward', () => {
  assert.equal(planIncludesTrainer({ accessLevel: 'free', slug: 'free' }), false);
  ['basic', 'elite', 'premium'].forEach((level) => assert.equal(planIncludesTrainer({ accessLevel: level, slug: level }), true));
});

test('tierFilter lists every tier at or above the minimum', () => {
  const filter = tierFilter('elite');
  assert.deepEqual(filter.$or[0]['membership.accessLevel'].$in, ['elite', 'premium']);
});
