import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Dumbbell,
  Flame,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from '../icons';
import IconChip from '../components/IconChip';

const stats = [
  { label: 'Workouts Logged', value: '25,000+', icon: Dumbbell },
  { label: 'Active Athletes', value: '4,800+', icon: Users },
  { label: 'Goal Success Rate', value: '98.4%', icon: TrendingUp },
  { label: 'Certified Coaches', value: '35+', icon: ShieldCheck },
];

const pillars = [
  {
    title: 'Data-Driven Programming',
    description:
      'We eliminate guesswork from fitness. Every set, rep, weight progression, and macro split is tracked and analyzed to ensure measurable, consistent strength and body composition results.',
    icon: TrendingUp,
    tone: 'workout',
  },
  {
    title: 'Precision Nutrition & Macros',
    description:
      'Integrated with direct nutritional databases, Kinetide provides precise caloric breakdowns and macro distribution tailored specifically to your metabolic rate and body composition goals.',
    icon: Flame,
    tone: 'nutrition',
  },
  {
    title: 'Expert & AI Coaching',
    description:
      'Gain continuous feedback through certified personal trainer reviews, live interactive Zoom workouts, and our intelligent AI coach available 24/7 to answer technique and nutritional questions.',
    icon: Sparkles,
    tone: 'hydration',
  },
  {
    title: 'Visual & Metric Accountability',
    description:
      'Celebrate real milestones with encrypted private progress photo journals, 1RM strength curves, and comprehensive body measurement trackers that verify your hard work.',
    icon: Award,
    tone: 'milestone',
  },
];

const COACH_PHOTOS = ['Marcus%20Vance.webp', 'Elena%20Rostova.png', 'Tariq%20Malik.jpg'];

const coaches = [
  {
    name: 'Marcus Vance',
    role: 'Head of Strength & Conditioning',
    specialty: 'Powerlifting & Hypertrophy',
    bio: 'CSCS certified with 10+ years coaching collegiate athletes and competitive powerlifters.',
  },
  {
    name: 'Elena Rostova',
    role: 'Lead Nutrition Specialist',
    specialty: 'Sports Dietetics & Fat Loss',
    bio: 'Registered sports dietitian dedicated to building sustainable, high-energy nutritional habits.',
  },
  {
    name: 'Tariq Malik',
    role: 'Functional & HIIT Director',
    specialty: 'Athletic Agility & Zoom Classes',
    bio: 'Former track athlete specializing in high-intensity cardiovascular conditioning and injury prevention.',
  },
];

export default function About() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>The Kinetide Philosophy</span>
          </div>

          <h1 className="mt-6 text-4xl font-black uppercase tracking-tight sm:text-5xl md:text-6xl">
            BUILT FOR PURPOSE. <br />
            <span className="text-[var(--primary)]">
              POWERED BY DISCIPLINE.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Kinetide is a comprehensive fitness management platform engineered to connect disciplined workout tracking,
            scientific nutrition principles, and active coach mentorship into one seamless experience.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-md)] bg-[var(--primary)] px-6 py-3 text-sm font-extrabold text-[var(--on-primary)] transition-opacity hover:opacity-90"
            >
              {user ? 'Go to Dashboard' : 'Start Your Journey'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/memberships"
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              Explore Memberships
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section className="about-stats-section mt-4 border-y border-[var(--border)] bg-[var(--surface)] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black text-[var(--text)] sm:text-3xl">{value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Why Kinetide</h2>
          <p className="mt-2 text-3xl font-black uppercase text-[var(--text)] sm:text-4xl">Engineered for Lifelong Performance</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ title, description, icon: Icon, tone }) => (
            <div
              key={title}
              className="relative overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--primary)]"
            >
              <IconChip icon={Icon} tone={tone} size={24} className="mb-4" />
              <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership & Coaches */}
      <section className="about-coaches-section border-t border-[var(--border)] bg-[var(--surface-2)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Coaching Staff</h2>
            <p className="mt-2 text-3xl font-black uppercase text-[var(--text)] sm:text-4xl">Learn from Verified Masters</p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted)]">
              Our network includes certified personal trainers, sports nutritionists, and conditioning coaches dedicated
              to your fitness journey.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map(({ name, role, specialty, bio }, index) => (
              <div key={name} className="relative overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)]">
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={`/images/${COACH_PHOTOS[index % COACH_PHOTOS.length]}`}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/80 to-transparent" />
                  <div className="absolute bottom-4 left-5 flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--primary)] text-sm font-black text-[var(--on-primary)] ring-2 ring-[var(--surface)]">
                    {name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                </div>

                <div className="p-6 pt-4">
                  <h3 className="mt-2 text-lg font-bold text-[var(--text)]">{name}</h3>
                  <p className="text-xs font-semibold text-[var(--primary)]">{role}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
                    <Zap className="h-3 w-3 text-[var(--primary)]" />
                    <span>{specialty}</span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action banner */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="about-cta-card relative overflow-hidden rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center sm:p-12">
          <div className="relative z-10">
            <h2 className="text-2xl font-black uppercase text-[var(--text)] sm:text-3xl md:text-4xl">
              Ready to Transform Your Fitness?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted)]">
              Join thousands of dedicated athletes tracking routines, mastering nutrition, and building their strongest selves.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                to={user ? '/workouts' : '/register'}
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--r-md)] bg-[var(--primary)] px-6 py-3 text-sm font-extrabold text-[var(--on-primary)] transition-opacity hover:opacity-90"
              >
                Get Started Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
