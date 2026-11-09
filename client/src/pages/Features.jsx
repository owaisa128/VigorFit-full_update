import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Award,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  Download,
  Dumbbell,
  FileSpreadsheet,
  FileText,
  Flame,
  Images,
  LineChart,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Utensils,
  Video,
  Zap,
} from '../icons';
import IconChip from '../components/IconChip';
import {
  WorkoutIllustration,
  NutritionIllustration,
  ProgressIllustration,
  JournalIllustration,
  AiCoachIllustration,
  TrainerNetworkIllustration,
  ZoomClassesIllustration,
  DataExportIllustration,
} from '../components/CardIllustrations';

const coreFeatures = [
  {
    id: 'workouts',
    title: 'Workout Tracking & Routine Builder',
    tagline: 'Precision Volume & Rep Progression',
    description:
      'Log workouts with custom exercise sets, reps, and weights. Organize routines by muscle group, filter by strength or HIIT categories, and never lose track of progressive overload.',
    icon: Dumbbell,
    tone: 'workout',
    Illustration: WorkoutIllustration,
    link: '/workouts',
    linkText: 'Explore Workouts',
    highlights: ['Multi-exercise sets & reps logging', 'Category & tag filtering', 'Rest timer & workout notes', 'Historical session archives'],
  },
  {
    id: 'nutrition',
    title: 'Nutrition & Daily Macro Management',
    tagline: 'Direct USDA Calorie Integration',
    description:
      'Log meals effortlessly with direct USDA food database lookups. Track your daily protein, carbohydrate, and fat ratios against personalized caloric targets to fuel athletic performance.',
    icon: Utensils,
    tone: 'nutrition',
    Illustration: NutritionIllustration,
    link: '/nutrition',
    linkText: 'Track Nutrition',
    highlights: ['USDA FoodData Central calorie lookup', 'Macro split breakdown (P/C/F)', 'Daily target compliance gauges', 'Meal-by-meal logging timeline'],
  },
  {
    id: 'progress',
    title: 'Body Metrics & 1RM PR Analytics',
    tagline: 'Visual Strength & Measurement Curves',
    description:
      'Track weight changes, body circumference measurements (chest, waist, hips, biceps), and calculate your 1-Rep Max benchmarks for Bench Press, Squats, and Deadlifts with responsive charts.',
    icon: TrendingUp,
    tone: 'milestone',
    Illustration: ProgressIllustration,
    link: '/progress',
    linkText: 'View Analytics',
    highlights: ['Responsive SVG trend line charts', '1RM PR calculator & records', 'Circumference tracking (cm/in)', 'Historical progress checkpoints'],
  },
  {
    id: 'journal',
    title: 'Transformation Photo Journal',
    tagline: 'Encrypted Milestone Comparisons',
    description:
      'Privately upload milestone physique photographs with dates and notes. Compare before-and-after visual checkpoints side by side with owner-scoped encryption and security.',
    icon: Images,
    tone: 'milestone',
    Illustration: JournalIllustration,
    link: '/progress-photos',
    linkText: 'Open Photo Journal',
    highlights: ['Owner-scoped private image storage', 'Milestone dates & progress notes', 'Interactive side-by-side comparison', 'Encrypted file signature verification'],
  },
  {
    id: 'ai-chat',
    title: 'Gemini AI Fitness Coach',
    tagline: '24/7 Intelligent Training Assistant',
    description:
      'Get instant exercise form guidance, muscle recovery tips, and nutritional advice powered by Google Gemini generative AI with automatic fallback and rate-limited reliability.',
    icon: Bot,
    tone: 'workout',
    Illustration: AiCoachIllustration,
    link: '/ai-chat',
    linkText: 'Chat with AI Coach',
    highlights: ['Google Gemini generative AI models', 'Context-aware training advice', 'Instant form & recovery guidance', 'Floating quick-chat access'],
  },
  {
    id: 'zoom',
    title: 'Personal Trainer Network',
    tagline: 'Certified Personal Trainer Mentorship',
    description:
      'Activate 1-on-1 certified trainer assignments for bespoke workout programming and weekly technique reviews.',
    icon: Video,
    tone: 'hydration',
    Illustration: TrainerNetworkIllustration,
    link: '/my-trainer',
    linkText: 'Meet Your Trainer',
    highlights: ['Accredited personal trainer matching', 'Two-stage trainer verification workflow', 'Interactive technique feedback', 'Weekly technique check-ins'],
  },
  {
    id: 'zoom-classes',
    title: 'Zoom Classes & Live Coaching',
    tagline: 'Live Group Sessions & 1:1 Virtual Guidance',
    description:
      'Join structured group classes, live strength sessions, mobility labs, and virtual check-ins with certified coaches from anywhere in the world.',
    icon: Calendar,
    tone: 'cardio',
    Illustration: ZoomClassesIllustration,
    link: '/trainer/classes',
    linkText: 'View Zoom Classes',
    highlights: ['Scheduled live class access', 'Interactive coaching feedback', 'Mobility, strength & conditioning sessions', 'Accountability-driven trainer check-ins'],
  },
  {
    id: 'export',
    title: 'Data Portability & Reports',
    tagline: 'Instant CSV & Printable PDF Reports',
    description:
      'Download complete spreadsheet archives of your workouts, nutrition logs, and progress metrics in CSV format, or generate beautifully formatted PDF fitness summary sheets.',
    icon: FileSpreadsheet,
    tone: 'hydration',
    Illustration: DataExportIllustration,
    link: '/settings',
    linkText: 'Manage Exports',
    highlights: ['Instant CSV table spreadsheet exports', 'Formatted PDF report generation', 'Clean data ownership & portability', 'Custom metric unit preferences (Metric/Imperial)'],
  },
];

export default function Features() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Hero */}
      <section className="relative isolate overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--border)]" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)] shadow-[var(--shadow)]">
            <Zap className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span>Complete Fitness Ecosystem</span>
          </div>

          <h1 className="mt-6 text-4xl font-black uppercase tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl">
            EVERY TOOL YOU NEED <br />
            <span className="text-[var(--primary)]">
              TO REACH YOUR PEAK.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
            From progressive overload tracking to AI-assisted coaching and certified trainer assignments, discover the
            full suite of features built into Kinetide.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--primary)] px-6 py-3 text-sm font-extrabold text-[var(--on-primary)] shadow-[var(--shadow)] transition hover:opacity-90"
            >
              {user ? 'Open Dashboard' : 'Create Free Account'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/memberships"
              className="inline-flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-bold text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              View Membership Tiers
            </Link>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="mx-auto mt-4 max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          {coreFeatures.map(({ id, title, tagline, description, icon: Icon, tone, link, linkText, highlights, Illustration }) => (
            <article
              key={id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-lg"
            >
              {Illustration && (
                <div className="aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)] transition-transform duration-500 ease-out group-hover:scale-[1.01]">
                  <Illustration className="h-full w-full" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                {/* Unified aligned metadata bar: IconChip + Tagline on left, Category chip on right */}
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconChip icon={Icon} tone={tone} size={18} className="!h-8 !w-8 !min-h-0 !min-w-0 rounded-lg shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] truncate">{tagline}</span>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    {tone}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Key Highlights</p>
                  <ul className="grid grid-cols-1 gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                    {highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                        <span className="truncate">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-2">
                  <Link
                    to={user ? link : '/login'}
                    state={user ? undefined : { from: link }}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                  >
                    <span>{linkText}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--primary)] transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Security & Reliability Banner */}
      <section className="features-security-section border-t border-[var(--border)] bg-[var(--surface-2)] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3 text-center">
            <div className="features-security-card rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <ShieldCheck className="mx-auto h-8 w-8 text-[var(--primary)]" />
              <h3 className="mt-3 text-sm font-bold text-[var(--text)]">Real MongoDB Atlas Persistence</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">All user workouts, meals, progress, and settings persist securely in MongoDB Atlas.</p>
            </div>
            <div className="features-security-card rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <Lock className="mx-auto h-8 w-8 text-[var(--primary)]" />
              <h3 className="mt-3 text-sm font-bold text-[var(--text)]">Private Owner-Scoped Records</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">JWT authentication and role-based authorization strictly isolate private records.</p>
            </div>
            <div className="features-security-card rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <Sparkles className="mx-auto h-8 w-8 text-[var(--primary)]" />
              <h3 className="mt-3 text-sm font-bold text-[var(--text)]">AI-Powered Guidance</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">Access instant nutritional and training guidance with integrated Gemini 2.0 AI.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
