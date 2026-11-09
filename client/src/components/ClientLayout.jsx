import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Droplets,
  Dumbbell,
  Flame,
  LogOut,
  LifeBuoy,
  Lock,
  MapPin,
  Menu,
  Settings,
  Timer,
  User,
  Users,
  Utensils,
  X,
} from '../icons';
import BrandMark from './BrandMark';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasFeature } from '../utils/membershipAccess';
import { MEMBERSHIP_FEATURES } from '../utils/membershipFeatures';
import ThemeToggle from './ThemeToggle';

const CLIENT_LINK_GROUPS = [
  {
    label: 'Training & Nutrition',
    links: [
      { label: 'Workouts', to: '/workouts', icon: Dumbbell },
      { label: 'Live sessions', to: '/classes', icon: CalendarDays, visibleFor: (membership) => hasFeature(membership, 'zoomClasses') },
      { label: 'Nutrition & Meals', to: '/nutrition', icon: Utensils },
    ],
  },
  {
    label: 'Account',
    links: [
      { label: 'Notifications', to: '/notifications', icon: Bell, visibleFor: () => true },
      { label: 'Support', to: '/support', icon: LifeBuoy, visibleFor: () => true },
      { label: 'Membership', to: '/memberships', icon: Crown, visibleFor: () => true },
      { label: 'Settings', to: '/settings', icon: Settings, visibleFor: () => true },
      { label: 'Profile', to: '/profile', icon: User, visibleFor: () => true },
    ],
  },
];

const FEATURE_ICONS = {
  workoutTracker: Timer,
  dailyCalories: Flame,
  waterTracker: Droplets,
  progress: ChevronRight,
  trainer: Users,
  trainerMessages: ChevronRight,
  liveTracking: MapPin,
  aiChat: Bot,
  transformationJournal: BookOpen,
};
const SIDEBAR_FEATURE_KEYS = new Set(Object.keys(FEATURE_ICONS));

export default function ClientLayout({ children }) {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [plansError, setPlansError] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/memberships/plans')
      .then(({ data }) => {
        if (!Array.isArray(data?.plans)) throw new Error('Membership plan features were not returned.');
        if (active) {
          setPlans(data.plans);
          setPlansError('');
        }
      })
      .catch((error) => {
        if (active) setPlansError(error.response?.data?.message || error.message || 'Unable to load plan features.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const currentPlanSlug = user?.membership?.planSlug || 'free';
  const currentPlan = plans.find((plan) => plan.slug === currentPlanSlug);
  const membership = user?.membership;
  const isPaidMembership = Boolean(
    membership?.planSlug
    && membership.planSlug !== 'free'
    && (!membership.endsAt || new Date(membership.endsAt) > new Date()),
  ) && currentPlan?.active === true;
  const activeMembership = useMemo(() => ({
    ...membership,
    featureKeys: isPaidMembership && currentPlan?.active ? currentPlan.featureKeys || [] : [],
  }), [membership, isPaidMembership, currentPlan]);
  const sidebarFeatures = MEMBERSHIP_FEATURES.filter((feature) => (
    SIDEBAR_FEATURE_KEYS.has(feature.key)
    && feature.to
    && hasFeature(activeMembership, feature.key)
  ));

  useEffect(() => {
    if (!membership || !currentPlan) return;
    const active = isPaidMembership;
    const featureKeys = active ? currentPlan.featureKeys || [] : [];
    if (JSON.stringify(membership.featureKeys || []) === JSON.stringify(featureKeys)) return;
    updateUser((current) => current?.membership
      ? { ...current, membership: { ...current.membership, featureKeys } }
      : current);
  }, [membership, currentPlan, isPaidMembership, updateUser]);

  useEffect(() => {
    const endTime = membership?.endsAt ? new Date(membership.endsAt).getTime() : 0;
    if (!endTime || endTime <= Date.now()) return undefined;
    const timer = window.setTimeout(() => {
      updateUser((current) => current?.membership
        ? { ...current, membership: { ...current.membership, featureKeys: [] } }
        : current);
    }, Math.min(endTime - Date.now() + 50, 2147483647));
    return () => window.clearTimeout(timer);
  }, [membership?.endsAt, updateUser]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }) => `vf-sidebar-link${isActive ? ' is-active' : ''}`;
  const visibleClientGroups = CLIENT_LINK_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.visibleFor || link.visibleFor(activeMembership)),
  })).filter((group) => group.links.length > 0);
  const closeSidebar = () => setMobileSidebarOpen(false);
  const planName = currentPlan?.name || user?.membership?.planName || 'Free Starter';
  const membershipStatus = isPaidMembership && currentPlan?.active ? 'Active' : 'Free access';
  return (
    <div className="min-h-screen bg-[#080808] text-white lg:flex">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close client sidebar"
          onClick={closeSidebar}
          className="vf-sidebar-overlay fixed inset-0 z-40 lg:hidden"
        />
      )}

      <aside className={`vf-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh max-w-[calc(100vw-2rem)] flex-col border-r transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="vf-sidebar-brand-row flex h-20 shrink-0 items-center justify-between border-b px-5">
          <Link to="/workouts" onClick={closeSidebar} className="vf-sidebar-brand flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2">
            <span className="vf-sidebar-brand-mark flex h-10 w-10 items-center justify-center"><BrandMark className="h-5 w-5" /></span>
            <span className="font-display font-bold uppercase tracking-[0.06em]">FORMA<span className="vf-sidebar-role">Member panel</span></span>
          </Link>
          <button type="button" onClick={closeSidebar} aria-label="Close client sidebar" className="rounded-lg p-2 lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <div className="vf-sidebar-user shrink-0 border-b px-5 py-4">
          <p className="vf-sidebar-user-name truncate">{user?.name || 'Kinetide member'}</p>
          <p className="vf-sidebar-user-meta mt-1 flex items-center gap-1.5 text-xs"><Crown className="h-3.5 w-3.5" />{planName} · {membershipStatus}</p>
          {isPaidMembership && membership?.endsAt && (
            <p className="vf-sidebar-user-meta mt-1 pl-5 text-[11px]">Expires {new Date(membership.endsAt).toLocaleDateString()}</p>
          )}
        </div>

        <nav aria-label="Client panel navigation" className="vf-sidebar-nav min-h-0 flex-1 space-y-1 overflow-y-auto">
          {visibleClientGroups.map(({ label: groupLabel, links }) => (
            <div key={groupLabel} className="vf-sidebar-group">
              <p className="vf-sidebar-group-label">{groupLabel}</p>
              {links.map(({ label, to, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={closeSidebar} className={navLinkClass}>
                  <Icon className="vf-sidebar-icon" />{label}
                </NavLink>
              ))}
            </div>
          ))}
          {user?.role === 'user' && sidebarFeatures.length > 0 && (
            <div className="vf-sidebar-feature-group">
              <p className="vf-sidebar-group-label">Included features</p>
              {sidebarFeatures.map((feature) => {
                const Icon = FEATURE_ICONS[feature.key] || ChevronRight;
                return (
                  <NavLink key={feature.key} to={feature.to} onClick={closeSidebar} className={navLinkClass}>
                    <Icon className="vf-sidebar-icon" />{feature.label}
                  </NavLink>
                );
              })}
            </div>
          )}
          {!isPaidMembership && (
            <Link to="/memberships" onClick={closeSidebar} className="vf-sidebar-cta">
              Upgrade Membership
            </Link>
          )}
          {plansError && <p role="alert" className="vf-sidebar-error mx-2 mt-4 rounded-xl border p-3 text-xs">{plansError}</p>}
        </nav>

        <div className="vf-sidebar-footer shrink-0 border-t p-3">
          <button type="button" onClick={handleLogout} className="vf-sidebar-logout">
            <LogOut className="vf-sidebar-icon" />Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="vf-workspace-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <button type="button" onClick={() => setMobileSidebarOpen(true)} aria-label="Open client sidebar" aria-expanded={mobileSidebarOpen} className="rounded-xl border border-white/10 p-2 text-gray-300 hover:bg-white/5 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <span className="vf-workspace-label min-w-0 flex-1 truncate">{planName} · {membershipStatus}</span>
          <ThemeToggle compact />
          <Link to="/memberships" className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/10">
            <BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Plans</span>
          </Link>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
