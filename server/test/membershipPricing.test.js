const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateUpgradeCredit, includesTrainer } = require('../controllers/membershipController');

test('Premium plan always requires trainer selection, including legacy plan data', () => {
  assert.equal(includesTrainer({ slug: 'premium', trainerIncluded: false }), true);
  assert.equal(includesTrainer({ slug: 'student-plus', trainerIncluded: false }), false);
  assert.equal(includesTrainer({ slug: 'student-plus', trainerIncluded: true }), true);
});

test('Basic-to-Elite upgrade credits unused Basic subscription value', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const credit = calculateUpgradeCredit({
    planSlug: 'basic',
    billingInterval: 'monthly',
    cyclePrice: 1499,
    endsAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
  }, 'elite', 2999, now);

  assert.equal(credit, 750);
  assert.equal(2999 - credit, 2249);
});

test('Upgrade credit is capped at the new plan price', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const credit = calculateUpgradeCredit({
    planSlug: 'basic',
    billingInterval: 'annual',
    cyclePrice: 100000,
    endsAt: new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000),
  }, 'elite', 25000, now);

  assert.equal(credit, 25000);
});

test('Custom plans receive upgrade credit based on their configured access tier', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const credit = calculateUpgradeCredit({
    planSlug: 'basic',
    accessLevel: 'basic',
    billingInterval: 'monthly',
    cyclePrice: 1200,
    endsAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
  }, 'student-plus', 2500, now, 'premium');

  assert.equal(credit, 600);
});

test('No upgrade credit is given for downgrades or expired memberships', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const activeBasic = {
    planSlug: 'basic',
    billingInterval: 'monthly',
    cyclePrice: 1499,
    endsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
  };

  assert.equal(calculateUpgradeCredit(activeBasic, 'free', 0, now), 0);
  assert.equal(calculateUpgradeCredit({ ...activeBasic, endsAt: now }, 'elite', 2999, now), 0);
});
