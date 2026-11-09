import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, LockKeyhole } from '../icons';
import { hasFeatureAccess, hasMinimumPlan } from '../utils/membershipAccess';

const featureLabel = (feature) => feature
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[-_]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export default function ProtectedRoute({ children, requiredRole, requiredPlan, requiredFeature, trainerSetupOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-medium">Verifying authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (trainerSetupOnly) {
    if (user.role !== 'trainer') return <Navigate to="/login" replace />;
    if (user.trainerApprovalStatus === 'approved') return <Navigate to="/trainer/dashboard" replace />;
    if (['awaiting_profile', 'awaiting_admin_review'].includes(user.trainerApprovalStatus)) return children;
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (requiredRole && !allowedRoles.includes(user.role)) {
    const home = user.role === 'admin'
      ? '/admin/trainers'
      : user.role === 'trainer' ? '/trainer/dashboard' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  if (user.role === 'trainer' && user.trainerApprovalStatus !== 'approved') {
    return user.trainerApprovalStatus === 'awaiting_profile'
      ? <Navigate to="/trainer/complete-profile" replace />
      : <Navigate to="/login" replace />;
  }

  if (user.role === 'user' && user.profileComplete === false
    && location.pathname !== '/client/complete-profile') {
    return <Navigate to="/client/complete-profile" replace state={{ from: location }} />;
  }

  if (requiredPlan && user.role !== 'admin' && user.role !== 'trainer'
    && !hasMinimumPlan(user.membership, requiredPlan)) {
    const planName = requiredPlan[0].toUpperCase() + requiredPlan.slice(1);
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-white">{planName} membership required</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-400">
          Upgrade your membership to unlock this feature. Your existing plan and progress will stay saved.
        </p>
        <Link to="/memberships" className="mt-6 rounded-xl bg-[#E10600] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">
          View membership plans
        </Link>
      </section>
    );
  }

  if (requiredFeature && user.role !== 'admin' && user.role !== 'trainer'
    && !hasFeatureAccess(user.membership, requiredFeature)) {
    const featureName = featureLabel(requiredFeature);
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-white">{featureName} required</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-400">
          Upgrade your membership to unlock {featureName.toLowerCase()} and keep using this feature in your client panel.
        </p>
        <Link to="/memberships" className="mt-6 rounded-xl bg-[#E10600] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">
          View membership plans
        </Link>
      </section>
    );
  }

  return children;
}