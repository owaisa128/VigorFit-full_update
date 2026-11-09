import PageHeader from '../components/PageHeader';
import React from 'react';
import { Bot, Sparkles } from '../icons';
import ChatBox from '../components/ChatBox';

export default function FitnessChat() {
  return (
    <section className="vf-theme-page mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-6 rounded-2xl border border-white/10 bg-[#111115] p-5 sm:p-7">
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300"><Sparkles className="h-4 w-4" /> Your training companion</p>
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl"><Bot className="h-8 w-8 text-[#E10600]" />AI Fitness Chat</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">Ask for general workout ideas, exercise explanations, and recovery guidance. Chat responses depend on the backend AI service being available.</p>
      </PageHeader>
      <ChatBox embedded />
    </section>
  );
}
