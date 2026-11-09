import PageHeader from '../components/PageHeader';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Loader2,
  Mail,
  MessageCircle,
  ShieldCheck,
  User,
  Users,
} from '../icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const formatDate = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const profile = user?.trainerProfile || {};
  const [clients, setClients] = useState([]);
  const [classes, setClasses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/memberships/assigned-clients'),
      api.get('/trainer-workspace/classes'),
      api.get('/trainer-workspace/messages'),
    ])
      .then(([clientResponse, classResponse, messageResponse]) => {
        if (!Array.isArray(clientResponse.data.clients)
          || !Array.isArray(classResponse.data.classes)
          || !Array.isArray(messageResponse.data.messages)) {
          throw new Error('Trainer dashboard data was incomplete.');
        }
        if (active) {
          setClients(clientResponse.data.clients);
          setClasses(classResponse.data.classes);
          setMessages(messageResponse.data.messages);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load trainer dashboard.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upcomingClasses = classes
    .filter((trainerClass) => new Date(trainerClass.startsAt) > new Date())
    .sort((first, second) => new Date(first.startsAt) - new Date(second.startsAt));

  const stats = [
    { label: 'Active assigned clients', value: clients.length, icon: Users, color: 'text-red-300' },
    { label: 'Upcoming classes', value: upcomingClasses.length, icon: CalendarDays, color: 'text-sky-300' },
    { label: 'Recent messages', value: messages.length, icon: MessageCircle, color: 'text-emerald-300' },
    { label: 'Trainer status', value: 'Approved', icon: CheckCircle2, color: 'text-emerald-300' },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <PageHeader as="section" className={`relative overflow-hidden rounded-3xl border p-6 shadow-2xl sm:p-9 ${isLight ? 'border-rose-200 bg-gradient-to-br from-rose-50 via-rose-100 to-red-100 shadow-rose-900/10' : 'border-red-500/20 bg-gradient-to-br from-[#211010] via-[#111111] to-[#0b0b0b]'}`}>
        <div aria-hidden="true" className={`pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full blur-3xl ${isLight ? 'bg-red-400/15' : 'bg-red-600/10'}`} />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={`${user.name} profile`} className="h-16 w-16 rounded-2xl border border-red-400/40 object-cover sm:h-20 sm:w-20" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-300 sm:h-20 sm:w-20"><Dumbbell className="h-8 w-8" /></div>
            )}
            <div>
              <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}><ShieldCheck className="h-4 w-4" />Approved trainer</p>
              <h1 className={`mt-1 text-2xl font-black sm:text-3xl ${isLight ? 'text-gray-900' : 'text-white'}`}>Welcome back, {user?.name}</h1>
              <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Your coaching overview and assigned client workspace.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/trainer/clients" className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${isLight ? 'border-rose-200 bg-white/70 text-gray-800 hover:bg-white' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}><Users className="h-4 w-4 text-red-500" />View clients</Link>
            <Link to="/trainer/classes" className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${isLight ? 'bg-gradient-to-r from-rose-300 to-red-300 text-red-950 hover:from-rose-400 hover:to-red-400' : 'bg-gradient-to-r from-[#E10600] to-[#650000] text-white hover:opacity-90'}`}><CalendarDays className="h-4 w-4" />Manage classes</Link>
          </div>
        </div>
      </PageHeader>

      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}

      <section aria-label="Trainer statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{label}</p>
              <span className="rounded-xl bg-white/5 p-2"><Icon className={`h-4 w-4 ${color}`} /></span>
            </div>
            <p className="mt-4 text-2xl font-black text-white">{loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-500" /> : value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Assigned clients</h2>
              <p className="mt-1 text-sm text-gray-400">Active Basic, Elite and Premium clients assigned to you.</p>
            </div>
            <Link to="/trainer/clients" className="inline-flex items-center gap-1 text-sm font-semibold text-red-300 hover:text-red-200">All clients <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {loading ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading assigned clients…</p>
          ) : !error && clients.length === 0 ? (
            <EmptyState type="clients" sentence="Your assigned clients will appear here when they choose you as their coach." actionLabel="View clients" to="/trainer/clients" />
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {clients.slice(0, 6).map((client) => (
                <article key={client._id} className="rounded-xl border border-white/10 bg-black/20 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-white">{client.name}</h3>
                      <p className="mt-1 truncate text-xs text-gray-500">{client.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300">Active</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-gray-300">{client.fitnessGoal || 'Fitness goal not provided'}</p>
                  <Link to={`/messages?clientId=${client._id}`} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-red-300 hover:text-red-200"><MessageCircle className="h-3.5 w-3.5" />Message client</Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-bold text-white">Next class</h2><p className="mt-1 text-sm text-gray-400">Your nearest scheduled session.</p></div>
              <CalendarDays className="h-5 w-5 text-sky-300" />
            </div>
            {loading ? <p className="mt-5 text-sm text-gray-500">Loading schedule…</p> : upcomingClasses[0] ? (
              <div className="mt-5 rounded-xl border border-sky-400/15 bg-sky-400/5 p-4">
                <h3 className="font-bold text-white">{upcomingClasses[0].title}</h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-sky-200"><Clock3 className="h-4 w-4" />{formatDate(upcomingClasses[0].startsAt)}</p>
                <Link to="/trainer/classes" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-sky-300">View schedule <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            ) : (
              <EmptyState
                type="workouts"
                sentence="No upcoming classes. Schedule a session to invite your clients."
                actionLabel="Create a class"
                to="/trainer/slots"
              />
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-red-400/10 p-2"><User className="h-4 w-4 text-red-300" /></span><div><h2 className="font-bold text-white">Trainer profile</h2><p className="text-xs text-gray-500">{profile.specialization || 'Specialization not set'}</p></div></div>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs uppercase tracking-wider text-gray-500">Experience</dt><dd className="mt-1 text-gray-200">{profile.experienceYears ?? 0} years</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-gray-500">Certifications</dt><dd className="mt-1 line-clamp-2 whitespace-pre-wrap text-gray-200">{profile.certifications || 'None listed'}</dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/profile" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"><Mail className="h-3.5 w-3.5" />Account profile</Link>
              <Link to="/workouts" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"><Activity className="h-3.5 w-3.5" />Workouts</Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
