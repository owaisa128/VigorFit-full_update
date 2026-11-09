import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Users } from '../icons';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

export default function TrainerClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/memberships/assigned-clients');
      if (!Array.isArray(data?.clients)) throw new Error('Assigned clients were not returned.');
      setClients(data.clients);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load assigned clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, []);

  return (
    <section className="vf-theme-page mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-6 rounded-2xl border border-white/10 bg-[#171819] p-6">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300"><Users className="h-4 w-4" />Trainer workspace</p>
        <h1 className="mt-2 text-3xl font-black text-white">My Clients</h1>
        <p className="mt-1 text-sm text-gray-400">Clients with an active Basic, Elite or Premium membership assigned to you.</p>
      </PageHeader>
      {error && <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="h-4 w-4" />{error}</p>}
      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin" />Loading clients…</div>
      ) : !error && clients.length === 0 ? (
        <EmptyState type="clients" sentence="Your assigned clients will appear here when they choose you as their coach." actionLabel="Refresh clients" onAction={loadClients} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((client) => (
            <article key={client._id} className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
              <h2 className="text-lg font-bold text-white">{client.name}</h2>
              <p className="mt-1 break-all text-sm text-gray-400">{client.email}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs uppercase tracking-wider text-gray-500">Fitness goal</dt><dd className="mt-1 text-gray-200">{client.fitnessGoal || 'Not provided'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-gray-500">Experience</dt><dd className="mt-1 capitalize text-gray-200">{client.trainingExperience || 'beginner'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-gray-500">Membership</dt><dd className="mt-1 text-gray-200">{client.membership?.planName || 'Premium'}</dd></div>
                <div><dt className="text-xs uppercase tracking-wider text-gray-500">Active until</dt><dd className="mt-1 text-gray-200">{client.membership?.endsAt ? new Date(client.membership.endsAt).toLocaleDateString() : '—'}</dd></div>
              </dl>
              {client.fitnessRequirements && <p className="mt-4 whitespace-pre-wrap border-t border-white/10 pt-4 text-sm leading-relaxed text-gray-300">{client.fitnessRequirements}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
