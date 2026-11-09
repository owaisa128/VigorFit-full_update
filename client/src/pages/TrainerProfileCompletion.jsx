import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, ShieldCheck } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

const readImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected image.'));
  reader.readAsDataURL(file);
});

export default function TrainerProfileCompletion() {
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    phone: '',
    specialization: '',
    experienceYears: '',
    certifications: '',
    bio: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP profile image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError('Profile images must be 2 MiB or smaller.');
      event.target.value = '';
      return;
    }
    try {
      setAvatarUrl(await readImage(file));
      setImageName(file.name);
    } catch (readError) {
      setError(readError.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!avatarUrl) {
      setError('Upload a profile photo to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/trainers/complete-profile', {
        ...form,
        avatarUrl,
      });
      updateUser((currentUser) => ({
        ...currentUser,
        trainerApprovalStatus: 'awaiting_admin_review',
      }));
      setSuccess(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit the trainer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-[#E10600]/25 bg-[#111111] p-5 shadow-2xl sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E10600]/10 text-[#E10600]"><ShieldCheck className="h-6 w-6" /></div>
        <h1 className="text-2xl font-black text-white">
          {success ? 'Profile submitted for review' : 'Complete your trainer profile'}
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          {success
            ? 'Your profile is now with the administrator for final approval. You can sign in to your trainer panel after approval.'
            : 'Your first review is approved. Submit these details and the administrator will review your profile in the admin panel.'}
        </p>

        {success ? (
          <div role="status" className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm leading-relaxed text-emerald-200">
            <CheckCircle2 className="mb-2 h-5 w-5" />{success}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="mt-4 rounded-lg border border-emerald-200/30 px-4 py-2 font-bold hover:bg-emerald-200/10"
            >
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-300">Phone number
                <input type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500" />
              </label>
              <label className="text-sm font-medium text-gray-300">Specialization
                <input maxLength={120} placeholder="e.g. Strength and conditioning" value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} required className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500" />
              </label>
              <label className="text-sm font-medium text-gray-300">Years of experience
                <input type="number" min="0" max="80" step="1" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} required className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500" />
              </label>
              <label className="text-sm font-medium text-gray-300">Certifications
                <input maxLength={1000} placeholder="List relevant certifications" value={form.certifications} onChange={(event) => setForm({ ...form, certifications: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500" />
              </label>
              <label className="text-sm font-medium text-gray-300 sm:col-span-2">Professional bio
                <textarea minLength={20} maxLength={1000} rows={5} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} required placeholder="Introduce your coaching approach and experience (20–1000 characters)" className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500" />
              </label>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-300">Profile photo (JPEG, PNG, or WebP; max 2 MiB)</span>
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-white/20 bg-[#080808] p-4 hover:border-red-500/60">
                {avatarUrl ? <img src={avatarUrl} alt="Trainer profile preview" className="h-16 w-16 rounded-full object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5"><ImagePlus className="h-6 w-6 text-gray-400" /></span>}
                <span className="text-sm text-gray-300">{imageName || 'Choose your profile photo'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="sr-only" />
              </label>
            </div>

            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {submitting ? 'Submitting profile...' : 'Submit for final approval'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
