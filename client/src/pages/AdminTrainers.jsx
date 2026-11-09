import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  UserRoundX,
} from '../icons';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';
import InitialsAvatar from '../components/InitialsAvatar';

const statusLabels = {
  awaiting_email_review: 'Waiting for email approval',
  awaiting_profile: 'Waiting for trainer profile',
  awaiting_admin_review: 'Application submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

const statusStyles = {
  awaiting_email_review: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  awaiting_profile: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  awaiting_admin_review: 'border-red-400/30 bg-red-400/10 text-red-200',
  approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  rejected: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};

export default function AdminTrainers() {
  const location = useLocation();
  const [trainers, setTrainers] = useState([]);
  const activeTab = location.pathname.endsWith('/directory') ? 'directory' : 'applications';
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [actingOn, setActingOn] = useState('');

  const loadTrainers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/admin/trainers');
      if (!data?.success || !Array.isArray(data.trainers)) {
        throw new Error(data?.message || 'Invalid trainers response.');
      }
      setTrainers(data.trainers);
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || 'Could not load trainers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainers();
  }, [loadTrainers]);

  const applications = useMemo(
    () => trainers.filter((trainer) => trainer.trainerApprovalStatus === 'awaiting_admin_review'),
    [trainers],
  );
  const visibleTrainers = activeTab === 'applications' ? applications : trainers;
  const trainerAvatarFallbacks = trainers.reduce((fallbacks, trainer) => {
    if (!trainer.avatarUrl) {
      fallbacks.set(
        trainer.id,
        fallbackTrainerAvatars[fallbacks.size % fallbackTrainerAvatars.length],
      );
    }
    return fallbacks;
  }, new Map());

  const handleDecision = async (trainer, decision) => {
    setActingOn(trainer.id);
    setActionError('');
    setNotice('');
    try {
      const { data } = await api.patch(`/admin/trainers/${trainer.id}/decision`, { decision });
      setNotice(data.message);
      setTrainers((current) => current.map((item) => (
        item.id === trainer.id
          ? { ...item, trainerApprovalStatus: decision === 'approve' ? 'approved' : 'rejected' }
          : item
      )));
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not update this trainer application.');
    } finally {
      setActingOn('');
    }
  };

  return (
    <main className="vf-theme-page mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader as="header" className="vf-page-banner mb-7 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-[#111115] p-5 sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300"><ShieldCheck className="h-4 w-4" />Administrator panel</p>
          <h1 className="mt-2 text-3xl font-black text-white">{activeTab === 'applications' ? 'Trainer applications' : 'All trainers'}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {activeTab === 'applications'
              ? 'Review the trainer profile forms submitted for approval. Approve or reject each application below.'
              : 'View trainer profiles and their current approval status.'}
          </p>
        </div>
        <button type="button" onClick={loadTrainers} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </PageHeader>

      {actionError && <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{actionError}</p>}
      {notice && <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
      {loadError && <p role="alert" className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{loadError}</p>}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-400" />Loading trainers...</div>
      ) : !loadError && visibleTrainers.length === 0 ? (
        <EmptyState
          type="clients"
          sentence={activeTab === 'applications' ? 'There are no trainer applications to review.' : 'Approved trainer profiles will appear here.'}
          actionLabel={activeTab === 'applications' ? 'Refresh applications' : 'Refresh trainers'}
          onAction={loadTrainers}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visibleTrainers.map((trainer) => {
            const isPendingApplication = trainer.trainerApprovalStatus === 'awaiting_admin_review';
            const statusLabel = statusLabels[trainer.trainerApprovalStatus] || 'Status unavailable';
            return (
              <article key={trainer.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111] transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
                <div className="flex items-center gap-4 border-b border-white/10 p-5">
                  <InitialsAvatar
                    name={trainer.name}
                    avatarUrl={trainer.avatarUrl}
                    className="border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold text-white">{trainer.name}</h2>
                    <p className="truncate text-sm text-gray-400">{trainer.email}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isPendingApplication
                        ? `Profile submitted ${new Date(trainer.updatedAt || trainer.createdAt).toLocaleDateString()}`
                        : `Applied ${new Date(trainer.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-center text-[11px] font-bold ${statusStyles[trainer.trainerApprovalStatus] || 'border-white/10 bg-white/5 text-gray-300'}`}>
                    {statusLabel}
                  </span>
                </div>
                <dl className="grid gap-4 p-5 sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</dt><dd className="mt-1 break-words text-sm text-gray-200">{trainer.trainerProfile?.phone || 'Not provided'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Specialization</dt><dd className="mt-1 break-words text-sm text-gray-200">{trainer.trainerProfile?.specialization || 'Not provided'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Experience</dt><dd className="mt-1 text-sm text-gray-200">{trainer.trainerProfile?.phone ? `${trainer.trainerProfile.experienceYears} years` : 'Not provided'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Certifications</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-200">{trainer.trainerProfile?.certifications || 'None listed'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Professional bio</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">{trainer.trainerProfile?.bio || 'Not provided'}</dd></div>
                </dl>
                {activeTab === 'applications' && isPendingApplication && (
                  <div className="flex gap-3 border-t border-white/10 p-5">
                    <button type="button" disabled={actingOn === trainer.id} onClick={() => handleDecision(trainer, 'approve')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600/90 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                      {actingOn === trainer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}Approve trainer
                    </button>
                    <button type="button" disabled={actingOn === trainer.id} onClick={() => handleDecision(trainer, 'reject')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
                      <UserRoundX className="h-4 w-4" />Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
