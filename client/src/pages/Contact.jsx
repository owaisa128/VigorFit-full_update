import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Mail, MessageSquare, Send, User } from '../icons';
import api from '../api/axios';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

export default function Contact() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
    setNotice('');
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      const { data } = await api.post('/feedback/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      if (!data?.success) throw new Error(data?.message || 'Your message could not be sent.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setNotice(data.message || 'Your message has been sent to the Kinetide team.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to send your message right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = 'w-full rounded-xl border-0 py-3.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#FF084B]/60';
  const inputTone = 'bg-black/40 text-white placeholder-[#B8B8C2]/60 ring-1 ring-white/10';

  return (
    <main className="relative isolate mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
      <div className="relative z-10 mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <PageHeader as="header" className="flex-col items-start">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#E10600]/30 bg-[#171819] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-red-200">
            <MessageSquare className="h-4 w-4 text-[#E10600]" />
            Contact Kinetide
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            We’re here to <span className="text-[var(--primary)]">help.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white sm:text-base">
            Have a question about Kinetide? Send our team a message and we’ll get back to you at the email address you provide.
          </p>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#111111]/80 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">Messages go straight to our team</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Your message will be securely saved and available to the Kinetide team in the admin support inbox.
              </p>
            </div>
          </div>
        </PageHeader>

        <section
          aria-label="Contact form"
          className={`rounded-2xl border p-5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-7 border-white/10 bg-black/45`}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF6B63]">Get in touch</p>
          <h2 className="text-2xl font-bold tracking-tight text-white">Send us a message</h2>
          <p className="mt-1 text-xs text-[#B8B8C2] sm:text-sm">All fields are required.</p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={submitMessage} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium text-white">Name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-[#B8B8C2]" aria-hidden="true" />
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Your full name"
                    minLength={2}
                    maxLength={100}
                    required
                    className={`${inputBase} pl-11 pr-4 ${inputTone}`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium text-white">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-[#B8B8C2]" aria-hidden="true" />
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="you@example.com"
                    maxLength={254}
                    required
                    className={`${inputBase} pl-11 pr-4 ${inputTone}`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-medium text-white">Subject</label>
              <div className="relative">
                <FileText className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-[#B8B8C2]" aria-hidden="true" />
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  value={form.subject}
                  onChange={updateField}
                  placeholder="What is this about?"
                  maxLength={150}
                  required
                  className={`${inputBase} pl-11 pr-4 ${inputTone}`}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="contact-message" className="block text-xs font-medium text-white">Message</label>
                <span className="text-[11px] text-[#B8B8C2]">{form.message.length}/5000</span>
              </div>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={updateField}
                placeholder="Tell us how we can help…"
                maxLength={5000}
                rows={6}
                required
                className={`${inputBase} min-h-[9rem] resize-y px-4 ${inputTone}`}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#A50036] px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-[#E10600]/25 transition-all hover:-translate-y-0.5 hover:shadow-[#E10600]/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <span className="vf-spinner" aria-hidden="true" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}