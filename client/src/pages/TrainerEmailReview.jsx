import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, XCircle } from '../icons';
import api from '../api/axios';

export default function TrainerEmailReview() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const requestedAction = searchParams.get('action');
  const [decision, setDecision] = useState(['approve', 'reject'].includes(requestedAction) ? requestedAction : '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token || !decision) {
      setError('This review link is missing a valid token or decision.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/trainers/email-decision', { token, action: decision });
      setResult(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to process this trainer review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-[#E10600]/25 bg-[#111111] p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E10600]/10 text-[#E10600]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-white">Trainer application review</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Confirm your decision below. Opening this email link alone does not approve or reject the application.
          After first-stage approval, the applicant can sign in and complete their profile. The administrator will review that profile separately.
        </p>

        {result ? (
          <div role="status" className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mb-2 h-5 w-5" />{result}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['approve', 'Approve first stage'],
                ['reject', 'Reject application'],
              ].map(([value, label]) => (
                <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${decision === value ? 'border-[#E10600]/60 bg-[#E10600]/10 text-white' : 'border-white/10 text-gray-300'}`}>
                  <input type="radio" name="trainer-decision" value={value} checked={decision === value} onChange={() => setDecision(value)} />
                  {value === 'approve' ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-rose-300" />}
                  {label}
                </label>
              ))}
            </div>
            {error && <p role="alert" className="flex items-start gap-2 text-sm text-rose-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
            <button type="submit" disabled={submitting || !token || !decision} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {submitting ? 'Saving decision...' : 'Confirm decision'}
            </button>
          </form>
        )}

        {!token && <p role="alert" className="mt-4 text-sm text-rose-300">This review link is invalid because its token is missing.</p>}
        {result && error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-red-300 hover:text-white">Return to Kinetide</Link>
      </section>
    </main>
  );
}
