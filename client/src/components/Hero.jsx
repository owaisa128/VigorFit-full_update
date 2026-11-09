import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Dumbbell, Images, Sparkles, TrendingUp, Utensils } from '../icons';
import IconChip from './IconChip';
import {
  WorkoutIllustration,
  NutritionIllustration,
  ProgressIllustration,
  JournalIllustration,
} from './CardIllustrations';

const features = [
  {
    title: 'Workout Tracking',
    subtitle: 'Routines & Volume',
    description: 'Plan workout routines, log custom sets, reps, and weights with automated progressive overload.',
    icon: Dumbbell,
    tone: 'workout',
    to: '/workouts',
    Illustration: WorkoutIllustration,
  },
  {
    title: 'Nutrition Insights',
    subtitle: 'Macros & USDA Data',
    description: 'Track meals with direct USDA calorie lookups, daily macro targets, and compliance splits.',
    icon: Utensils,
    tone: 'nutrition',
    to: '/nutrition',
    Illustration: NutritionIllustration,
  },
  {
    title: 'Progress Analytics',
    subtitle: '1RM & Circumference',
    description: 'Review strength progression curves, 1RM milestones, and body measurements in responsive charts.',
    icon: TrendingUp,
    tone: 'milestone',
    to: '/progress',
    Illustration: ProgressIllustration,
  },
  {
    title: 'Transformation Journal',
    subtitle: 'Milestone Compare',
    description: 'Privately compare milestone physique photographs side-by-side with owner-scoped encryption.',
    icon: Images,
    tone: 'milestone',
    to: '/progress-photos',
    Illustration: JournalIllustration,
  },
];

export default function Hero() {
  const { user } = useAuth();

  return (
    <>
      <section className="relative isolate mx-auto max-w-7xl overflow-x-clip px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--border)]" />

      <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <div className="relative z-10">
          <div className="hero-enter inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--muted)] shadow-[var(--shadow)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
            <span>YOUR TRAINING. YOUR PACE. YOUR PROGRESS.</span>
          </div>

          <p className="hero-enter mt-7 text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)] sm:text-sm" style={{ animationDelay: '100ms' }}>
            TRAINING. NUTRITION. REAL PROGRESS.
          </p>
          <h1 className="hero-enter mt-3 text-4xl font-black uppercase leading-[1.04] tracking-tight text-[var(--text)] sm:text-5xl md:text-6xl lg:text-7xl" style={{ animationDelay: '180ms' }}>
            BUILD YOUR
            <span className="mt-1 block text-[var(--primary)]">
              STRONGER SELF.
            </span>
          </h1>
          <p className="hero-enter mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg lg:mx-0" style={{ animationDelay: '260ms' }}>
            Plan focused workouts, fuel your training with nutrition tracking, and see your fitness progress in one place.
          </p>

          <div className="hero-enter mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start" style={{ animationDelay: '340ms' }}>
            <Link
              to={user ? '/workouts' : '/register'}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] bg-[var(--primary)] px-6 py-3 text-sm font-extrabold text-[var(--on-primary)] shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/workouts"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-bold text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Explore Workouts
            </Link>
          </div>

          <div className="hero-enter mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--muted)] lg:justify-start" style={{ animationDelay: '420ms' }}>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />Personalized routines</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--info)]" />Progress that persists</span>
          </div>
          </div>
        </div>

        <div className="hero-enter order-1 mx-auto w-full max-w-[min(78vw,27rem)] lg:order-2 lg:max-w-[34rem]" style={{ animationDelay: '180ms' }}>
          <div className="hero-float group relative aspect-square">
            <div aria-hidden="true" className="hero-ring absolute inset-0 rounded-full border border-[var(--border)]" />
            <div aria-hidden="true" className="absolute inset-[4%] rounded-full border border-[var(--border)] bg-[var(--surface-2)] transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
            <div className="absolute inset-[9%] overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] transition-transform duration-500 ease-out group-hover:scale-[1.03]">
              <img
                src="/images/gym_hero_banner.png"
                alt="Athlete training in a modern gym"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="hero-float absolute bottom-[10%] left-0 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)] sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Built on consistency</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-extrabold text-[var(--text)]"><TrendingUp className="h-4 w-4 text-[var(--hydration)]" aria-hidden="true" />Every rep counts</p>
            </div>
            <div className="absolute right-0 top-[17%] flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow)] sm:h-14 sm:w-14">
              <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      </section>

      <section aria-label="Core Features" className="relative mx-auto mt-16 w-full max-w-7xl px-4 text-left sm:px-6 lg:mt-24 lg:px-8">
        <div id="features" className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ title, subtitle, description, icon: Icon, tone, to, Illustration }) => {
          return (
            <Link
              key={title}
              to={user ? to : '/login'}
              state={user ? undefined : { from: to }}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {/* Illustration Header with exact 16:9 ratio and centered composition */}
              <div className="-mx-5 -mt-5 mb-4 aspect-[16/9] w-[calc(100%+2.5rem)] overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)] transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                <Illustration className="h-full w-full" />
              </div>

              {/* Aligned Chip and Subtitle Metadata Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <IconChip icon={Icon} tone={tone} size={15} className="!h-7 !w-7 !min-h-0 !min-w-0 rounded-lg shrink-0" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--primary)] truncate">
                    {subtitle}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="mt-3 text-base font-black uppercase tracking-tight text-[var(--text)]">
                {title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                {description}
              </p>

              {/* Bottom action link */}
              <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3.5">
                <span className="text-[11px] font-bold text-[var(--primary)] group-hover:underline">
                  Explore {title}
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--primary)] transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
        </div>
      </section>

    </>
  );
}
