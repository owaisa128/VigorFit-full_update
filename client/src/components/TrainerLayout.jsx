import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  CalendarDays,
  CalendarPlus,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Menu,
  MapPinned,
  Target,
  Settings,
  User,
  Users,
  Utensils,
  X,
} from '../icons';
import { useAuth } from '../context/AuthContext';
import BrandMark from './BrandMark';
import ThemeToggle from './ThemeToggle';

const NAVIGATION_GROUPS = [
  {
    label: 'Workspace',
    links: [
      { label: 'Dashboard', to: '/trainer/dashboard', icon: LayoutDashboard, end: true },
      { label: 'My clients', to: '/trainer/clients', icon: Users },
    ],
  },
  {
    label: 'Coaching',
    links: [
      { label: 'Live tracking', to: '/trainer/tracking', icon: MapPinned },
      { label: 'Daily goals', to: '/trainer/goals', icon: Target },
      { label: 'Zoom classes', to: '/trainer/classes', icon: CalendarDays },
      { label: 'Create class slot', to: '/trainer/slots', icon: CalendarPlus },
      { label: 'Client meal plans', to: '/trainer/meal-plans', icon: Utensils },
    ],
  },
  {
    label: 'Activity',
    links: [
      { label: 'Messages', to: '/messages', icon: MessageSquare },
      { label: 'Workouts', to: '/workouts', icon: Dumbbell },
      { label: 'Nutrition', to: '/nutrition', icon: Utensils },
      { label: 'Progress', to: '/progress', icon: Activity },
      { label: 'Notifications', to: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'Account',
    links: [
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Profile', to: '/profile', icon: User },
    ],
  },
];

export default function TrainerLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.hash]);

  const closeSidebar = () => setMobileSidebarOpen(false);
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const navLinkClass = (label) => ({ isActive }) => {
    const isDashboard = location.pathname === '/trainer/dashboard';
    const active = label === 'Dashboard'
        ? isDashboard && !location.hash
        : isActive;
    return `vf-sidebar-link${active ? ' is-active' : ''}`;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white lg:flex">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close trainer sidebar"
          onClick={closeSidebar}
          className="vf-sidebar-overlay fixed inset-0 z-40 lg:hidden"
        />
      )}

      <aside className={`vf-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh max-w-[calc(100vw-2rem)] flex-col border-r transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="vf-sidebar-brand-row flex h-20 shrink-0 items-center justify-between border-b px-5">
          <Link to="/trainer/dashboard" onClick={closeSidebar} className="vf-sidebar-brand flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2">
            <span className="vf-sidebar-brand-mark flex h-10 w-10 items-center justify-center"><BrandMark className="h-5 w-5" /></span>
            <span className="font-display font-bold uppercase tracking-[0.06em]">FORMA<span className="vf-sidebar-role">Trainer panel</span></span>
          </Link>
          <button type="button" onClick={closeSidebar} aria-label="Close trainer sidebar" className="rounded-lg p-2 lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <div className="vf-sidebar-user shrink-0 border-b px-5 py-4">
          <p className="vf-sidebar-user-name truncate">{user?.name || 'Kinetide trainer'}</p>
          <p className="vf-sidebar-user-meta mt-1 text-xs">Approved trainer</p>
        </div>

        <nav aria-label="Trainer panel navigation" className="vf-sidebar-nav min-h-0 flex-1 overflow-y-auto">
          {NAVIGATION_GROUPS.map(({ label: groupLabel, links }) => (
            <div key={groupLabel} className="vf-sidebar-group">
              <p className="vf-sidebar-group-label">{groupLabel}</p>
              {links.map(({ label, to, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} onClick={closeSidebar} className={navLinkClass(label)}>
                  <Icon className="vf-sidebar-icon" />{label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="vf-sidebar-footer shrink-0 border-t p-3">
          <button type="button" onClick={handleLogout} className="vf-sidebar-logout">
            <LogOut className="vf-sidebar-icon" />Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="vf-workspace-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <button type="button" onClick={() => setMobileSidebarOpen(true)} aria-label="Open trainer sidebar" aria-expanded={mobileSidebarOpen} className="rounded-lg p-2 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <span className="vf-workspace-label min-w-0 flex-1 truncate">Trainer workspace</span>
          <ThemeToggle compact />
        </header>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
