import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, User, LogIn, UserPlus, LogOut, Home, Utensils, TrendingUp, LayoutDashboard, Settings as SettingsIcon, HelpCircle, Bell, Menu, X, Images, MessageSquare, ShieldCheck, Crown, Info, Sparkles } from '../icons';
import Notifications from './Notifications';
import ThemeToggle from './ThemeToggle';
import BrandMark from './BrandMark';
import { hasMinimumPlan } from '../utils/membershipAccess';
import { Button, PrimaryNavigation } from './ui';

export default function Navbar({ healthStatus, publicMode = false }) {
  const { user, logout } = useAuth();
  const canAccessEliteFeatures = user?.role !== 'user' || hasMinimumPlan(user.membership, 'elite');
  const isTrainerSetup = user?.role === 'trainer' && user.trainerApprovalStatus !== 'approved';
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationAnchorRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `vf-navbar-link flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#E10600] ${
      isActive
        ? 'bg-[#E10600]/20 text-white border border-[#E10600]/50 shadow-[0_0_14px_rgba(225,6,0,0.35)] font-bold'
        : 'text-[#B8B8C2] hover:text-white hover:bg-[#E10600]/10 hover:border-white/10 border border-transparent'
    }`;

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
  };

  const mobileNavLinkClass = ({ isActive }) => `${navLinkClass({ isActive })} w-full justify-start`;

  if (publicMode) {
    return (
      <header className="forma-site-header">
        <Link to="/" className="forma-site-header__brand flex items-center gap-2.5">
          <BrandMark className="h-6 w-6 text-current" />
          <span>FORMA</span>
        </Link>
        <div className="forma-site-header__nav">
          <PrimaryNavigation publicMode />
        </div>
        <div className="forma-site-header__actions">
          {user ? (
            <Button as={Link} to="/dashboard" variant="primary">Open dashboard</Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">Sign in</Button>
              <Button as={Link} to="/register" variant="primary">Create account</Button>
            </>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="vf-site-navbar sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-[#E10600]/25 shadow-lg shadow-black/50 font-sans">
      <div className="relative max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] sm:h-[84px] xl:h-[88px] flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 group min-w-0 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--forma-brand-ember,#FF6B47)] rounded-xl">
          <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[var(--forma-bg-surface-raised,#1D2124)] text-[var(--forma-text-primary,#F4F5F6)] border border-[var(--forma-border-subtle,#262B30)] transition-transform group-hover:scale-105">
            <BrandMark className="w-5 h-5 sm:w-6 sm:h-6 text-current" />
          </span>
          <span className="vf-navbar-brand font-display text-xl font-bold tracking-[0.06em] text-white sm:text-2xl uppercase">
            FORMA
          </span>
        </Link>

        {/* Navigation Links */}
        <nav
          aria-label="Main navigation"
          className={`${isTrainerSetup ? 'hidden lg:flex' : user ? 'hidden 2xl:flex' : 'hidden xl:flex'} ml-auto min-w-0 items-center gap-1 2xl:gap-1.5 py-2`}
        >
          {isTrainerSetup ? (
            <>
              <NavLink to="/" className={navLinkClass}>
                <Home className="w-4 h-4 text-[#E10600]" />
                <span>Home</span>
              </NavLink>
              <NavLink to="/features" className={navLinkClass}>
                <Sparkles className="w-4 h-4 text-[#E10600]" />
                <span>Features</span>
              </NavLink>
              <NavLink to="/about" className={navLinkClass}>
                <Info className="w-4 h-4 text-[#E10600]" />
                <span>About</span>
              </NavLink>
              <NavLink to="/contact" className={navLinkClass}>
                <MessageSquare className="w-4 h-4 text-[#FCA5A5]" />
                <span>Contact</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0 ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </>
          ) : user ? (
            <>
              <NavLink to="/" className={navLinkClass}>
                <Home className="w-4 h-4 text-[#E10600]" />
                <span>Home</span>
              </NavLink>

              <NavLink to="/features" className={navLinkClass}>
                <Sparkles className="w-4 h-4 text-[#E10600]" />
                <span className="hidden xl:inline">Features</span>
              </NavLink>

              <NavLink to="/about" className={navLinkClass}>
                <Info className="w-4 h-4 text-[#E10600]" />
                <span>About</span>
              </NavLink>

              {user.role === 'admin' && (
                <NavLink to="/admin/trainers" className={navLinkClass}>
                  <ShieldCheck className="w-4 h-4 text-[#E10600]" />
                  <span>Trainers</span>
                </NavLink>
              )}
              {user.role === 'trainer' && (
                <NavLink to="/trainer/dashboard" className={navLinkClass}>
                  <ShieldCheck className="w-4 h-4 text-[#E10600]" />
                  <span>Trainer panel</span>
                </NavLink>
              )}
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4 text-[#E10600]" />
                <span className="hidden md:inline">Dashboard</span>
              </NavLink>

              <NavLink to="/workouts" className={navLinkClass}>
                <Dumbbell className="w-4 h-4 text-[#E10600]" />
                <span className="hidden md:inline">Workouts</span>
              </NavLink>

              <NavLink to="/nutrition" className={navLinkClass}>
                <Utensils className="w-4 h-4 text-[#E10600]" />
                <span className="hidden md:inline">Nutrition</span>
              </NavLink>

              <NavLink to="/progress" className={navLinkClass}>
                <TrendingUp className="w-4 h-4 text-[#E10600]" />
                <span className="hidden md:inline">Progress</span>
              </NavLink>

              {canAccessEliteFeatures && (
                <NavLink to="/progress-photos" className={navLinkClass}>
                  <Images className="w-4 h-4 text-[#FCA5A5]" />
                  <span className="hidden lg:inline">Journal</span>
                </NavLink>
              )}

              <NavLink to="/settings" className={navLinkClass}>
                <SettingsIcon className="w-4 h-4 text-[#FCA5A5]" />
                <span className="hidden lg:inline">Settings</span>
              </NavLink>

              {user.role === 'user' && (
                <NavLink to="/support" className={navLinkClass}>
                  <HelpCircle className="w-4 h-4 text-[#FCA5A5]" />
                  <span className="hidden lg:inline">Support</span>
                </NavLink>
              )}

              <NavLink to="/contact" className={navLinkClass}>
                <MessageSquare className="w-4 h-4 text-[#FCA5A5]" />
                <span className="hidden lg:inline">Contact</span>
              </NavLink>

              <NavLink to="/notifications" className={navLinkClass} aria-label="Notifications page">
                <Bell className="w-4 h-4 text-[#E10600]" />
                <span className="hidden xl:inline">Alerts</span>
              </NavLink>

              {canAccessEliteFeatures && (
                <NavLink to="/ai-chat" className={navLinkClass} aria-label="AI fitness chat">
                  <MessageSquare className="w-4 h-4 text-[#E10600]" />
                  <span className="hidden xl:inline">AI Chat</span>
                </NavLink>
              )}

              <NavLink to="/memberships" className={navLinkClass}>
                <Crown className="w-4 h-4 text-[#E10600]" />
                <span className="hidden 2xl:inline">Plans</span>
              </NavLink>


              <NavLink to="/profile" className={navLinkClass}>
                <User className="w-4 h-4 text-[#FCA5A5]" />
                <span className="hidden sm:inline">Profile</span>
              </NavLink>

              {/* Notifications Bell Drawer Trigger */}
              <div ref={notificationAnchorRef} className="relative shrink-0">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl text-[#B8B8C2] hover:text-white hover:bg-[#E10600]/10 relative transition-colors focus:outline-none focus:ring-2 focus:ring-[#E10600]"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4 text-[#E10600]" />
                  {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E10600] px-1 text-[9px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0 ml-1 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/" className={navLinkClass}>
                <Home className="w-4 h-4 text-[#E10600]" />
                <span>Home</span>
              </NavLink>

              <NavLink to="/features" className={navLinkClass}>
                <Sparkles className="w-4 h-4 text-[#E10600]" />
                <span>Features</span>
              </NavLink>

              <NavLink to="/memberships" className={navLinkClass}>
                <Crown className="w-4 h-4 text-[#E10600]" />
                <span>Plans</span>
              </NavLink>


              <NavLink to="/about" className={navLinkClass}>
                <Info className="w-4 h-4 text-[#E10600]" />
                <span>About</span>
              </NavLink>

              <NavLink to="/contact" className={navLinkClass}>
                <MessageSquare className="w-4 h-4 text-[#FCA5A5]" />
                <span>Contact</span>
              </NavLink>

              <NavLink
                to="/login"
                className="vf-navbar-signin flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-[#111111] hover:bg-[#1a1a1a] border border-[#E10600]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#E10600]"
              >
                <LogIn className="w-4 h-4 text-[#E10600]" />
                <span>Sign In</span>
              </NavLink>

              <NavLink
                to="/register"
                className="vf-navbar-register flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#E10600] to-[#650000] hover:opacity-90 shadow-md shadow-[#E10600]/25 transition-all focus:outline-none focus:ring-2 focus:ring-[#E10600]"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </NavLink>
            </>
          )}

          {/* Health Status pill */}
          {healthStatus && (
            <div className="flex items-center gap-2 pl-3 ml-2 border-l border-[#E10600]/20 text-[11px] text-[#B8B8C2] shrink-0">
              <span className={`w-2 h-2 rounded-full ${
                healthStatus === 'online' ? 'bg-emerald-400 animate-pulse' : healthStatus === 'loading' ? 'bg-amber-400' : 'bg-rose-500'
              }`}></span>
              <span>API:</span>
              <span className={healthStatus === 'online' ? 'text-emerald-400 font-semibold' : 'text-[#B8B8C2]'}>
                {healthStatus === 'online' ? 'Connected' : healthStatus === 'loading' ? 'Checking' : 'Offline'}
              </span>
            </div>
          )}
        </nav>

        <ThemeToggle compact />
        <button
          ref={menuButtonRef}
          type="button"
          className={`vf-navbar-menu inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E10600]/30 bg-[#111111] text-white transition-colors hover:bg-[#E10600]/10 focus:outline-none focus:ring-2 focus:ring-[#E10600] ${isTrainerSetup ? 'lg:hidden' : user ? '2xl:hidden' : 'xl:hidden'}`}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <Notifications
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        anchorRef={notificationAnchorRef}
        onUnreadCount={setUnreadCount}
      />

      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={`vf-mobile-navigation max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[#E10600]/20 border-b border-[#E10600]/25 bg-[#09090D] shadow-xl ${isTrainerSetup ? 'lg:hidden' : user ? '2xl:hidden' : 'xl:hidden'}`}
        >
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {isTrainerSetup ? (
                <>
                  <NavLink to="/" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Home className="h-4 w-4 text-[#E10600]" /> Home
                  </NavLink>
                  <NavLink to="/features" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Sparkles className="h-4 w-4 text-[#E10600]" /> Features
                  </NavLink>
                  <NavLink to="/about" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Info className="h-4 w-4 text-[#E10600]" /> About Kinetide
                  </NavLink>
                  <NavLink to="/contact" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <MessageSquare className="h-4 w-4 text-[#FCA5A5]" /> Contact
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : user ? (
                <>
                  <NavLink to="/" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Home className="h-4 w-4 text-[#E10600]" /> Home
                  </NavLink>
                  <NavLink to="/features" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Sparkles className="h-4 w-4 text-[#E10600]" /> Features
                  </NavLink>
                  {user.role === 'admin' && (
                    <NavLink to="/admin/trainers" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                      <ShieldCheck className="h-4 w-4 text-[#E10600]" /> Trainers
                    </NavLink>
                  )}
                  {user.role === 'trainer' && (
                    <NavLink to="/trainer/dashboard" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                      <ShieldCheck className="h-4 w-4 text-[#E10600]" /> Trainer panel
                    </NavLink>
                  )}
                  <NavLink to="/dashboard" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <LayoutDashboard className="h-4 w-4 text-[#E10600]" /> Dashboard
                  </NavLink>
                  <NavLink to="/workouts" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Dumbbell className="h-4 w-4 text-[#E10600]" /> Workouts
                  </NavLink>
                  <NavLink to="/nutrition" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Utensils className="h-4 w-4 text-[#E10600]" /> Nutrition
                  </NavLink>
                  <NavLink to="/progress" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <TrendingUp className="h-4 w-4 text-[#E10600]" /> Progress
                  </NavLink>
                  {canAccessEliteFeatures && (
                    <NavLink to="/progress-photos" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                      <Images className="h-4 w-4 text-[#FCA5A5]" /> Transformation Journal
                    </NavLink>
                  )}
                  <NavLink to="/settings" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <SettingsIcon className="h-4 w-4 text-[#FCA5A5]" /> Settings
                  </NavLink>
                  {user.role === 'user' && (
                    <NavLink to="/support" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                      <HelpCircle className="h-4 w-4 text-[#FCA5A5]" /> Support
                    </NavLink>
                  )}
                  <NavLink to="/contact" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <MessageSquare className="h-4 w-4 text-[#FCA5A5]" /> Contact
                  </NavLink>
                  <NavLink to="/notifications" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Bell className="h-4 w-4 text-[#E10600]" /> Notifications
                  </NavLink>
                  {canAccessEliteFeatures && (
                    <NavLink to="/ai-chat" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                      <MessageSquare className="h-4 w-4 text-[#E10600]" /> AI Fitness Chat
                    </NavLink>
                  )}
                  <NavLink to="/profile" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <User className="h-4 w-4 text-[#FCA5A5]" /> Profile
                  </NavLink>
                  <NavLink to="/memberships" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Crown className="h-4 w-4 text-[#E10600]" /> Memberships
                  </NavLink>
                  <NavLink to="/about" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Info className="h-4 w-4 text-[#E10600]" /> About Kinetide
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Home className="h-4 w-4 text-[#E10600]" /> Home
                  </NavLink>
                  <NavLink to="/features" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Sparkles className="h-4 w-4 text-[#E10600]" /> Features
                  </NavLink>
                  <NavLink to="/memberships" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Crown className="h-4 w-4 text-[#E10600]" /> Memberships
                  </NavLink>
                  <NavLink to="/about" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <Info className="h-4 w-4 text-[#E10600]" /> About Us
                  </NavLink>
                  <NavLink to="/contact" onClick={closeMobileMenu} className={mobileNavLinkClass}>
                    <MessageSquare className="h-4 w-4 text-[#FCA5A5]" /> Contact
                  </NavLink>
                  <NavLink
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl border border-[#E10600]/30 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E10600]/10 focus:outline-none focus:ring-2 focus:ring-[#E10600]"
                  >
                    <LogIn className="h-4 w-4 text-[#E10600]" /> Sign In
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-3.5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#E10600]/20 focus:outline-none focus:ring-2 focus:ring-[#E10600]"
                  >
                    <UserPlus className="h-4 w-4" /> Register
                  </NavLink>
                </>
              )}
              {healthStatus && (
                <div className="flex items-center gap-2 border-t border-[#E10600]/15 px-2.5 py-3 text-xs text-[#B8B8C2] sm:col-span-2">
                  <span className={`h-2 w-2 rounded-full ${healthStatus === 'online' ? 'bg-emerald-400' : healthStatus === 'loading' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                  API: {healthStatus === 'online' ? 'Connected' : healthStatus === 'loading' ? 'Checking' : 'Offline'}
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}