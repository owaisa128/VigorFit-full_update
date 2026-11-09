const mongoose = require('mongoose');

/**
 * @desc    Health check & safe persistence diagnostics for VigorFit API
 * @route   GET /api/health
 * @access  Public
 */
const getHealthStatus = async (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const dbStatus = isConnected ? 'connected' : 'disconnected';
  const dbName = isConnected ? mongoose.connection.name : 'vfit';

  const collections = {
    users: 0,
    workouts: 0,
    nutritions: 0,
    progresses: 0,
    vigorfit_e: 0,
    notifications: 0,
    settings: 0,
    feedbacks: 0,
    transformationphotos: 0,
  };
  let totalDocuments = 0;

  if (isConnected) {
    try {
      const db = mongoose.connection.db;
      const keys = Object.keys(collections);
      const countResults = await Promise.all(
        keys.map(async (name) => {
          try {
            const count = await db.collection(name).countDocuments();
            return { name, count };
          } catch {
            return { name, count: 0 };
          }
        })
      );

      countResults.forEach(({ name, count }) => {
        collections[name] = count;
        totalDocuments += count;
      });
    } catch (countErr) {
      console.warn('Diagnostics count error:', countErr.message);
    }
  }

  res.status(isConnected ? 200 : 503).json({
    success: isConnected,
    service: 'VigorFit API',
    status: isConnected ? 'operational' : 'degraded',
    database: dbStatus,
    databaseName: dbName,
    primaryCollection: 'vigorfit_e',
    collections,
    totalDocuments,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
};

/**
 * @desc    Dedicated safe database collection diagnostics
 * @route   GET /api/health/diagnostics
 * @access  Public
 */
const getDiagnostics = async (req, res) => {
  return getHealthStatus(req, res);
};

module.exports = {
  getHealthStatus,
  getDiagnostics,
};
