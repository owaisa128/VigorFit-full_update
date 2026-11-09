const test = require('node:test');
const assert = require('node:assert/strict');
const { getWorkoutReadFilter, serializeReadableWorkout } = require('../controllers/workoutController');

test('active trainer-included members can read their assigned trainer workouts', () => {
  const clientId = 'client-id';
  const trainerId = 'trainer-id';
  const filter = getWorkoutReadFilter({
    user: {
      _id: clientId,
      role: 'user',
      membership: {
        trainerIncluded: true,
        assignedTrainer: trainerId,
        endsAt: new Date(Date.now() + 60_000),
      },
    },
  });

  assert.deepEqual(filter.$or, [
    { user: clientId },
    { user: trainerId, assignedTo: clientId },
  ]);
});

test('expired trainer membership only allows reading own workouts', () => {
  const clientId = 'client-id';
  const filter = getWorkoutReadFilter({
    user: {
      _id: clientId,
      role: 'user',
      membership: {
        planSlug: 'premium',
        assignedTrainer: 'trainer-id',
        endsAt: new Date(Date.now() - 60_000),
      },
    },
  });

  assert.deepEqual(filter, { user: clientId });
});

test('trainer accounts do not gain client-assignment read access', () => {
  const trainerId = 'trainer-id';
  const filter = getWorkoutReadFilter({
    user: {
      _id: trainerId,
      role: 'trainer',
      membership: {
        planSlug: 'premium',
        assignedTrainer: 'another-trainer',
        endsAt: new Date(Date.now() + 60_000),
      },
    },
  });

  assert.deepEqual(filter, { user: trainerId });
});

test('assigned trainer workouts are marked read-only and retain the owner ID shape', () => {
  const trainerId = 'trainer-id';
  const workout = {
    user: { _id: trainerId, name: 'Alex Morgan' },
    toObject: () => ({ _id: 'workout-id', user: trainerId, title: 'Coach routine' }),
  };

  assert.deepEqual(serializeReadableWorkout(workout, 'client-id'), {
    _id: 'workout-id',
    user: trainerId,
    title: 'Coach routine',
    isTrainerAssigned: true,
    assignedByTrainer: 'Alex Morgan',
  });
});
