import React, { lazy, Suspense } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import ClientLayout from './components/ClientLayout';
import TrainerLayout from './components/TrainerLayout';
import Footer from './components/Footer';
const LandingPage = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.LandingPage })));
const Login = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.LoginPage })));
const Register = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.RegisterPage })));
const Profile = lazy(() => import('./pages/Profile'));
const Workouts = lazy(() => import('./pages/WorkoutLibrary'));
const WorkoutForm = lazy(() => import('./pages/WorkoutFormPage'));
const WorkoutDetails = lazy(() => import('./pages/WorkoutDetailPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DailyCalories = lazy(() => import('./pages/DailyCalories'));
const WaterTracker = lazy(() => import('./pages/WaterTracker'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const Progress = lazy(() => import('./pages/Progress'));
const TransformationJournal = lazy(() => import('./pages/TransformationJournal'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminInbox = lazy(() => import('./pages/AdminInbox'));
const Support = lazy(() => import('./pages/Support'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const FitnessChat = lazy(() => import('./pages/FitnessChat'));
const TrainerEmailReview = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.TrainerEmailReviewPage })));
const TrainerProfileCompletion = lazy(() => import('./pages/TrainerProfileCompletion'));
const TrainerDashboard = lazy(() => import('./pages/TrainerDashboard'));
const TrainerClients = lazy(() => import('./pages/TrainerClients'));
const TrainerClasses = lazy(() => import('./pages/TrainerSchedule'));
const TrainerMealPlans = lazy(() => import('./pages/TrainerMealPlans'));
const TrainerSlots = lazy(() => import('./pages/TrainerScheduleEditor'));
const TrainerMessages = lazy(() => import('./pages/CoachMessages'));
const AdminTrainers = lazy(() => import('./pages/AdminTrainers'));
const AdminClients = lazy(() => import('./pages/AdminClients'));
const AdminMemberships = lazy(() => import('./pages/AdminMemberships'));
const About = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.AboutPage })));
const Contact = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.ContactPage })));
const Memberships = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.PricingPage })));
const Checkout = lazy(() => import('./pages/Checkout'));
const Features = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.FeaturesPage })));
const PublicTrainerDirectory = lazy(() => import('./pages/PublicPages').then((module) => ({ default: module.TrainerDirectoryPage })));
const ClientProfileSetup = lazy(() => import('./pages/ClientProfileSetup'));
const TrainerDirectory = lazy(() => import('./pages/TrainerDirectory'));
const TrainerProfile = lazy(() => import('./pages/TrainerProfile'));
const Classes = lazy(() => import('./pages/Classes'));
const GpsRunTracker = lazy(() => import('./pages/GpsRunTracker'));
const WorkoutTracker = lazy(() => import('./pages/SessionPlayer'));
const TrainerTracking = lazy(() => import('./pages/TrainerTracking'));
const TrainerGoals = lazy(() => import('./pages/TrainerGoals'));
import ProtectedRoute from './components/ProtectedRoute';
import MusicPlayer from './components/MusicPlayer';
import { useAuth } from './context/AuthContext';

function HomePage() {
  return (
    <LandingPage />
  );
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdminArea = location.pathname.startsWith('/admin') || user?.role === 'admin';

  const routeContent = (
    <Suspense fallback={<div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-sm text-gray-400"><span className="vf-spinner" aria-hidden="true" />Loading FORMA…</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/client/complete-profile"
          element={(
            <ProtectedRoute requiredRole="user">
              <ClientProfileSetup />
            </ProtectedRoute>
          )}
        />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/memberships" element={<Memberships />} />
        <Route path="/checkout" element={<ProtectedRoute requiredRole="user"><Checkout /></ProtectedRoute>} />
        <Route path="/features" element={<Features />} />
        <Route path="/trainers" element={<PublicTrainerDirectory />} />
        <Route path="/admin" element={<Navigate to="/admin/clients" replace />} />
        <Route path="/trainer/review" element={<TrainerEmailReview />} />
        <Route
          path="/trainer/complete-profile"
          element={(
            <ProtectedRoute requiredRole="trainer" trainerSetupOnly>
              <TrainerProfileCompletion />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/trainer/dashboard"
          element={
            <ProtectedRoute requiredRole="trainer">
              <TrainerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/trainer/clients" element={<ProtectedRoute requiredRole="trainer"><TrainerClients /></ProtectedRoute>} />
        <Route path="/trainer/tracking" element={<ProtectedRoute requiredRole="trainer"><TrainerTracking /></ProtectedRoute>} />
        <Route path="/trainer/goals" element={<ProtectedRoute requiredRole="trainer"><TrainerGoals /></ProtectedRoute>} />
        <Route path="/trainer/classes" element={<ProtectedRoute requiredRole="trainer"><TrainerClasses /></ProtectedRoute>} />
        <Route path="/trainer/meal-plans" element={<ProtectedRoute requiredRole="trainer"><TrainerMealPlans /></ProtectedRoute>} />
        <Route path="/trainer/slots" element={<ProtectedRoute requiredRole="trainer"><TrainerSlots /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute requiredFeature="trainerMessages"><TrainerMessages /></ProtectedRoute>} />
        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminClients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trainers"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTrainers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/trainers/directory"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTrainers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminMemberships />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/inbox" element={<ProtectedRoute requiredRole="admin"><AdminInbox /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/gps-tracker" element={<ProtectedRoute requiredRole="user" requiredFeature="liveTracking"><GpsRunTracker /></ProtectedRoute>} />
        <Route path="/workout-tracker" element={<ProtectedRoute requiredRole="user" requiredFeature="workoutTracker"><WorkoutTracker /></ProtectedRoute>} />
        <Route path="/my-trainer" element={<ProtectedRoute requiredRole="user" requiredFeature="trainer"><TrainerDirectory /></ProtectedRoute>} />
        <Route path="/my-trainer/:trainerId" element={<ProtectedRoute requiredRole="user" requiredFeature="trainer"><TrainerProfile /></ProtectedRoute>} />
        <Route path="/classes" element={<ProtectedRoute requiredRole="user" requiredFeature="zoomClasses"><Classes /></ProtectedRoute>} />
        <Route path="/daily-calories" element={<ProtectedRoute requiredFeature="dailyCalories"><DailyCalories /></ProtectedRoute>} />
        <Route path="/water-tracker" element={<ProtectedRoute requiredRole="user" requiredFeature="waterTracker"><WaterTracker /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
        <Route path="/workouts/create" element={<ProtectedRoute><WorkoutForm /></ProtectedRoute>} />
        <Route path="/workouts/:id" element={<ProtectedRoute><WorkoutDetails /></ProtectedRoute>} />
        <Route path="/workouts/:id/edit" element={<ProtectedRoute><WorkoutForm /></ProtectedRoute>} />
        <Route path="/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute requiredRole={['user', 'admin']} requiredFeature="progress"><Progress /></ProtectedRoute>} />
        <Route path="/progress-photos" element={<ProtectedRoute requiredRole={['user', 'admin']} requiredFeature="transformationJournal"><TransformationJournal /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute requiredRole="user"><Support /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/ai-chat" element={<ProtectedRoute requiredRole={['user', 'admin']} requiredFeature="aiChat"><FitnessChat /></ProtectedRoute>} />
        <Route path="/transformation-journal" element={<Navigate to="/progress-photos" replace />} />
        <Route path="/chat" element={<Navigate to="/ai-chat" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
  const needsClientProfileSetup = user?.role === 'user' && user.profileComplete === false;
  const clientPanelPaths = [
    '/dashboard',
    '/gps-tracker',
    '/workout-tracker',
    '/daily-calories',
    '/water-tracker',
    '/workouts',
    '/nutrition',
    '/progress',
    '/profile',
    '/settings',
    '/support',
    '/notifications',
    '/memberships',
    '/checkout',
    '/messages',
    '/ai-chat',
    '/progress-photos',
    '/my-trainer',
    '/classes',
  ];
  const isClientPanel = user?.role === 'user'
    && !needsClientProfileSetup
    && clientPanelPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const trainerPanelPaths = [
    '/trainer/dashboard',
    '/trainer/clients',
    '/trainer/tracking',
    '/trainer/goals',
    '/trainer/classes',
    '/trainer/meal-plans',
    '/trainer/slots',
    '/messages',
    '/workouts',
    '/nutrition',
    '/progress',
    '/profile',
    '/settings',
    '/notifications',
  ];
  const isTrainerPanel = user?.role === 'trainer'
    && user.trainerApprovalStatus === 'approved'
    && trainerPanelPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] font-sans">
      {!isAdminArea && !isClientPanel && !isTrainerPanel && !needsClientProfileSetup && <Navbar publicMode />}

      <main className="min-w-0 w-full max-w-full flex-1 flex flex-col">
        {isAdminArea
          ? <AdminLayout>{routeContent}</AdminLayout>
          : isClientPanel
            ? <ClientLayout>{routeContent}</ClientLayout>
            : isTrainerPanel
              ? <TrainerLayout>{routeContent}</TrainerLayout>
              : routeContent}
      </main>

      {!isAdminArea && !isClientPanel && !isTrainerPanel && !needsClientProfileSetup && <Footer />}
      {(isClientPanel || isTrainerPanel) && <MusicPlayer />}
    </div>
  );
}