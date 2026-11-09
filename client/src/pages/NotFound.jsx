import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Dumbbell } from '../icons';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-red-300"><Dumbbell className="h-8 w-8" /></div>
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-300">404 · Page not found</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-6xl">This path doesn’t exist.</h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-gray-400">The page may have moved, or the address may be incorrect. Head back and keep your training on track.</p>
      <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-3 text-sm font-bold text-white transition hover:shadow-[0_0_24px_rgba(225,6,0,0.3)]">
        <ArrowLeft className="h-4 w-4" /> Back to Kinetide
      </Link>
    </main>
  );
}
