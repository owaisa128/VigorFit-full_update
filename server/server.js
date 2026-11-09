const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { initLiveSocket } = require('./utils/liveSocket');


// Load this server's environment file regardless of the process working directory.
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Middleware
const {
  securityHeaders,
  apiLimiter,
  authLimiter,
  chatLimiter,
} = require('./middleware/securityMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import Route Handlers
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const chatRoutes = require('./routes/chatRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const waterIntakeRoutes = require('./routes/waterIntakeRoutes');
const progressRoutes = require('./routes/progressRoutes');
const vigorfitERoutes = require('./routes/vigorfitERoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const exportRoutes = require('./routes/exportRoutes');
const transformationPhotoRoutes = require('./routes/transformationPhotoRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const trainerWorkspaceRoutes = require('./routes/trainerWorkspaceRoutes');
const gpsSessionRoutes = require('./routes/gpsSessionRoutes');
const goalRoutes = require('./routes/goalRoutes');
const workoutSessionRoutes = require('./routes/workoutSessionRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers via Helmet
app.use(securityHeaders);

// 2. CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// 3. Body Parsing Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 4. General Rate Limiter for API endpoints
app.use('/api', apiLimiter);

// 5. API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/trainers', authLimiter, trainerRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/water-intake', waterIntakeRoutes);
app.use('/api/progress', progressRoutes);
// Mount both /api/vigorfit-entries and /api/vigorfit for primary vigorfit_e collection
app.use('/api/vigorfit-entries', vigorfitERoutes);
app.use('/api/vigorfit', vigorfitERoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/transformation-photos', transformationPhotoRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/trainer-workspace', trainerWorkspaceRoutes);
app.use('/api/gps-sessions', gpsSessionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/workout-sessions', workoutSessionRoutes);
app.use('/api/admin', adminRoutes);

// Root route API catalog
app.get('/', (req, res) => {
  res.json({
    application: 'VigorFit API Server',
    version: '1.0.0',
    database: {
      name: 'vfit',
      primaryCollection: 'vigorfit_e',
    },
    status: 'Operational',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
      },
      trainers: {
        directory: 'GET /api/trainers/directory',
        register: 'POST /api/trainers/register',
        emailDecision: 'POST /api/trainers/email-decision',
        completeProfile: 'POST /api/trainers/complete-profile',
        trainerDirectoryAndApplications: 'GET /api/admin/trainers',
        panelDecision: 'PATCH /api/admin/trainers/:id/decision',
      },
      memberships: {
        plans: 'GET /api/memberships/plans',
        current: 'GET /api/memberships/current',
        availableTrainers: 'GET /api/memberships/available-trainers',
        simulatedPurchase: 'POST /api/memberships/purchase',
        assignedTrainerClients: 'GET /api/memberships/assigned-clients',
      },
      trainerWorkspace: {
        mealPlans: 'GET /api/trainer-workspace/meal-plans',
        addMealPlan: 'POST /api/trainer-workspace/meal-plans',
        removeMealPlan: 'DELETE /api/trainer-workspace/meal-plans/:id',
      },
      vigorfitPrimary: {
        collection: 'vigorfit_e',
        list: 'GET /api/vigorfit-entries',
        create: 'POST /api/vigorfit-entries',
        getById: 'GET /api/vigorfit-entries/:id',
        update: 'PUT /api/vigorfit-entries/:id',
        delete: 'DELETE /api/vigorfit-entries/:id',
        stats: 'GET /api/vigorfit-entries/stats',
        seed: 'POST /api/vigorfit-entries/seed',
      },
      workouts: {
        list: 'GET /api/workouts',
        create: 'POST /api/workouts',
        getById: 'GET /api/workouts/:id',
        update: 'PUT /api/workouts/:id',
        delete: 'DELETE /api/workouts/:id',
      },
      workoutSessions: {
        start: 'POST /api/workout-sessions',
        current: 'GET /api/workout-sessions/current',
        updateStatus: 'PATCH /api/workout-sessions/:id/status',
        toggleExercise: 'PATCH /api/workout-sessions/:id/exercise',
        trainerLive: 'GET /api/workout-sessions/trainer/live',
        trainerWeeklySummary: 'GET /api/workout-sessions/trainer/summary',
      },
      goals: {
        trainerAssign: 'POST /api/goals',
        trainerList: 'GET /api/goals/trainer',
        trainerRemove: 'DELETE /api/goals/:id',
        clientCurrent: 'GET /api/goals/mine',
      },
      gpsSessions: {
        start: 'POST /api/gps-sessions',
        clientHistory: 'GET /api/gps-sessions/mine',
        addRoutePoints: 'POST /api/gps-sessions/:id/points',
        updateStatus: 'PATCH /api/gps-sessions/:id/status',
        changeSharingConsent: 'PATCH /api/gps-sessions/:id/sharing',
        sessionDetails: 'GET /api/gps-sessions/:id',
        trainerLiveSessions: 'GET /api/gps-sessions/trainer/live',
        trainerSummary: 'GET /api/gps-sessions/trainer/summary',
        trainerHistory: 'GET /api/gps-sessions/trainer',
      },
      nutrition: {
        list: 'GET /api/nutrition',
        create: 'POST /api/nutrition',
        dailySummary: 'GET /api/nutrition/daily-summary?date=YYYY-MM-DD',
        update: 'PUT /api/nutrition/:id',
        delete: 'DELETE /api/nutrition/:id',
      },
      waterIntake: {
        dailySummary: 'GET /api/water-intake?date=YYYY-MM-DD',
        add: 'POST /api/water-intake',
        delete: 'DELETE /api/water-intake/:id',
      },
      progress: {
        list: 'GET /api/progress',
        create: 'POST /api/progress',
        summary: 'GET /api/progress/summary',
        getById: 'GET /api/progress/:id',
        update: 'PUT /api/progress/:id',
        delete: 'DELETE /api/progress/:id',
      },
      dashboard: {
        analytics: 'GET /api/dashboard',
        stats: 'GET /api/dashboard/stats',
      },
      notifications: {
        list: 'GET /api/notifications',
        create: 'POST /api/notifications',
        markAsRead: 'PUT /api/notifications/:id/read',
        markAllAsRead: 'PUT /api/notifications/mark-all-read',
        delete: 'DELETE /api/notifications/:id',
      },
      settings: {
        get: 'GET /api/settings',
        update: 'PUT /api/settings',
      },
      export: {
        csv: 'GET /api/export/csv?type=workouts|nutrition|progress|vigorfit',
        json: 'GET /api/export/json',
      },
      chat: {
        send: 'POST /api/chat',
        status: 'GET /api/chat/status',
      },
      feedback: {
        submit: 'POST /api/feedback',
        myFeedback: 'GET /api/feedback/my-feedback',
      },
      admin: {
        stats: 'GET /api/admin/stats',
        users: 'GET /api/admin/users',
        userById: 'GET /api/admin/users/:id',
        workouts: 'GET /api/admin/workouts',
        nutrition: 'GET /api/admin/nutrition',
        progress: 'GET /api/admin/progress',
        supportTickets: 'GET /api/admin/support',
        updateSupportTicket: 'PUT /api/admin/support/:id',
        notifications: 'GET /api/admin/notifications',
      },
    },
  });
});

// 6. 404 Handler for undefined routes
app.use(notFound);

// 7. Central Error Handling Middleware
app.use(errorHandler);

// Start server if run directly
if (require.main === module) {
  connectDB().then(() => {
    // HTTP server shared by Express and the free Socket.io live-tracking layer.
    const server = http.createServer(app);
    initLiveSocket(server, { corsOrigin: true });
    server.listen(PORT, () => {
      console.log(`🚀 VigorFit server running on port ${PORT}`);
      console.log(`🔗 Health check available at: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  Target MongoDB database: vfit (Primary Collection: vigorfit_e)`);
      console.log(`🔐 Auth routes mounted at: http://localhost:${PORT}/api/auth`);
      console.log(`💪 Workout routes mounted at: http://localhost:${PORT}/api/workouts`);
      console.log(`📡 Live tracking (Socket.io) ready on the same port`);
      console.log(`🤖 AI Chat routes mounted at: http://localhost:${PORT}/api/chat`);
    });
  });
}

module.exports = app;
