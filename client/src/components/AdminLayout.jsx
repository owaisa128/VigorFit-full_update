import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  BadgeDollarSign,
  Dumbbell,
  Inbox,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Utensils,
  X,
} from '../icons';
import BrandMark from './BrandMark';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const adminNavigation = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Workouts', to: '/workouts', icon: Dumbbell },
  { label: 'Nutrition', to: '/nutrition', icon: Utensils },
  { label: 'Progress', to: '/progress', icon: TrendingUp },
  { label: 'Journal', to: '/progress-photos', icon: Images },
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Support inbox', to: '/admin/inbox', icon: Inbox },
  { label: 'Alerts', to: '/notifications', icon: Bell },
  { label: 'AI Chat', to: '/ai-chat', icon: MessageSquare },
  { label: 'Profile', to: '/profile', icon: User },
];

const adminNavClass = ({ isActive }) => `vf-sidebar-link${isActive ? ' is-active' : ''}`;

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const closeSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="min-h-screen bg-[#080808] text-white lg:flex">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="vf-sidebar-overlay fixed inset-0 z-40 lg:hidden"
        />
      )}

      <aside className={`vf-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh max-w-[calc(100vw-2rem)] shrink-0 flex-col border-r transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="vf-sidebar-brand-row flex h-20 shrink-0 items-center justify-between border-b px-5">
          <Link to="/admin/trainers" onClick={closeSidebar} className="vf-sidebar-brand flex items-center gap-3">
            <span className="vf-sidebar-brand-mark flex h-10 w-10 items-center justify-center">
              <BrandMark className="h-5 w-5" />
            </span>
            <span className="font-display font-bold uppercase tracking-[0.06em]">
              FORMA
              <span className="vf-sidebar-role">Admin panel</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close admin sidebar"
            className="rounded-lg p-2 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="vf-sidebar-user shrink-0 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="vf-sidebar-brand-mark flex h-10 w-10 items-center justify-center rounded-full">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="vf-sidebar-user-name truncate">{user?.name || 'Administrator'}</p>
              <p className="vf-sidebar-user-meta truncate text-xs">Administrator</p>
            </div>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="vf-sidebar-nav min-h-0 flex-1 space-y-1 overflow-y-auto">
          <p className="vf-sidebar-group-label">Admin</p>
          {adminNavigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              title={label}
              aria-label={label}
              onClick={closeSidebar}
              className={adminNavClass}
            >
              <Icon className="vf-sidebar-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
          <p className="vf-sidebar-group-label">Management</p>
          <NavLink
            to="/admin/clients"
            end
            title="Registered clients"
            aria-label="Registered clients"
            onClick={closeSidebar}
            className={adminNavClass}
          >
            <Users className="vf-sidebar-icon" />
            <span>Registered clients</span>
          </NavLink>
          <NavLink
            to="/admin/trainers"
            end
            title="Trainer applications"
            aria-label="Trainer applications"
            onClick={closeSidebar}
            className={adminNavClass}
          >
            <ShieldCheck className="vf-sidebar-icon" />
            <span>Trainer applications</span>
          </NavLink>
          <NavLink
            to="/admin/trainers/directory"
            title="All trainers"
            aria-label="All trainers"
            onClick={closeSidebar}
            className={adminNavClass}
          >
            <Dumbbell className="vf-sidebar-icon" />
            <span>All trainers</span>
          </NavLink>
          <NavLink
            to="/admin/plans"
            end
            title="Membership plans"
            aria-label="Membership plans"
            onClick={closeSidebar}
            className={adminNavClass}
          >
            <BadgeDollarSign className="vf-sidebar-icon" />
            <span>Membership plans</span>
          </NavLink>
        </nav>

        <div className="vf-sidebar-footer shrink-0 border-t p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="vf-sidebar-logout"
          >
            <LogOut className="vf-sidebar-icon" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="vf-workspace-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <button type="button" onClick={() => setMobileSidebarOpen(true)} aria-label="Open admin sidebar" aria-expanded={mobileSidebarOpen} className="rounded-lg p-2 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <span className="vf-workspace-label min-w-0 flex-1 truncate">Admin workspace</span>
          <ThemeToggle compact />
        </header>
        {children}
      </div>
    </div>
  );
}
