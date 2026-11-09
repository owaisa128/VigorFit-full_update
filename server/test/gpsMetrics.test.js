const test = require('node:test');
const assert = require('node:assert/strict');
const {
  distanceBetweenPoints,
  isValidCoordinate,
  summarizeRoute,
} = require('../utils/gpsMetrics');

test('Haversine distance is close to the known distance between coordinates', () => {
  const distance = distanceBetweenPoints(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
  );
  assert.ok(Math.abs(distance - 111195) < 10);
});

test('route summary ignores duplicate points and gaps between workout segments', () => {
  const points = [
    { latitude: 0, longitude: 0, recordedAt: '2026-01-01T00:00:00.000Z', segment: 0 },
    { latitude: 0, longitude: 0.001, recordedAt: '2026-01-01T00:01:00.000Z', segment: 0 },
    { latitude: 0, longitude: 0.001, recordedAt: '2026-01-01T00:01:01.000Z', segment: 0 },
    { latitude: 0, longitude: 0.002, recordedAt: '2026-01-01T00:02:00.000Z', segment: 1 },
  ];
  const summary = summarizeRoute(points);
  assert.ok(Math.abs(summary.distanceMeters - 111.2) < 1);
  assert.equal(summary.movingSeconds, 60);
  assert.ok(summary.averageSpeedKmh > 6 && summary.averageSpeedKmh < 7);
});

test('route summary rejects implausible GPS jumps and invalid coordinates are detected', () => {
  const summary = summarizeRoute([
    { latitude: 0, longitude: 0, recordedAt: '2026-01-01T00:00:00.000Z', segment: 0 },
    { latitude: 0, longitude: 1, recordedAt: '2026-01-01T00:00:01.000Z', segment: 0 },
  ]);
  assert.equal(summary.distanceMeters, 0);
  assert.equal(isValidCoordinate({ latitude: 90.1, longitude: 0 }), false);
  assert.equal(isValidCoordinate({ latitude: 34, longitude: 73 }), true);
});
