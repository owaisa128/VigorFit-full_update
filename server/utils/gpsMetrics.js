const EARTH_RADIUS_METERS = 6371000;
const MAX_RUNNING_SPEED_METERS_PER_SECOND = 15;
const MAX_SEGMENT_SECONDS = 120;
const DUPLICATE_POINT_METERS = 2;

const isValidCoordinate = (point) => point
  && Number.isFinite(point.latitude)
  && point.latitude >= -90
  && point.latitude <= 90
  && Number.isFinite(point.longitude)
  && point.longitude >= -180
  && point.longitude <= 180;

const distanceBetweenPoints = (first, second) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const summarizeRoute = (points) => {
  let distanceMeters = 0;
  let movingSeconds = 0;
  let maximumSpeedKmh = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous.segment !== current.segment) continue;

    const elapsedSeconds = (new Date(current.recordedAt) - new Date(previous.recordedAt)) / 1000;
    const segmentDistance = distanceBetweenPoints(previous, current);
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0 || elapsedSeconds > MAX_SEGMENT_SECONDS
      || segmentDistance < DUPLICATE_POINT_METERS
      || segmentDistance / elapsedSeconds > MAX_RUNNING_SPEED_METERS_PER_SECOND) continue;

    distanceMeters += segmentDistance;
    movingSeconds += elapsedSeconds;
    maximumSpeedKmh = Math.max(maximumSpeedKmh, (segmentDistance / elapsedSeconds) * 3.6);
  }

  const distanceKm = distanceMeters / 1000;
  return {
    distanceMeters,
    distanceKm,
    movingSeconds: Math.round(movingSeconds),
    averageSpeedKmh: movingSeconds > 0 ? (distanceKm / (movingSeconds / 3600)) : 0,
    maximumSpeedKmh,
    averagePaceMinutesPerKm: distanceKm > 0 ? (movingSeconds / 60) / distanceKm : 0,
  };
};

module.exports = {
  MAX_RUNNING_SPEED_METERS_PER_SECOND,
  distanceBetweenPoints,
  isValidCoordinate,
  summarizeRoute,
};
