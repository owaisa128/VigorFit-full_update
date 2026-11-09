const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidDate } = require('../controllers/waterIntakeController');

test('water tracker accepts valid calendar dates', () => {
  assert.equal(isValidDate('2026-10-24'), true);
});

test('water tracker rejects malformed and impossible dates', () => {
  assert.equal(isValidDate('2026-2-04'), false);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('not-a-date'), false);
});
