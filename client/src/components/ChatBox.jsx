import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare, X, Send, Sparkles, AlertCircle, Dumbbell, Activity, HeartPulse, RefreshCw } from '../icons';
import { sendChatMessage, fetchChatStatus } from '../api/chatApi';

const QUICK_PROMPTS = [
  { text: "Create a workout plan", icon: Dumbbell },
  { text: "Suggest exercises for beginners", icon: Sparkles },
  { text: "Explain sets and reps", icon: Activity },
  { text: "Give me recovery tips", icon: HeartPulse },
  { text: "Help me track my fitness progress", icon: Bot },
];

export default function ChatBox({ embedded = false }) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hi! I'm your Kinetide AI coach. What would you like help with today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ configured: false, checking: true, message: '' });
  const [errorBanner, setErrorBanner] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
      checkBackendStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const checkBackendStatus = async () => {
    setStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetchChatStatus();
      if (!res?.success) throw new Error(res?.message || 'The AI service returned an unsuccessful status.');
      setStatus({
        configured: res.configured,
        checking: false,
        message: res.message || '',
      });
    } catch (error) {
      setStatus({
        configured: false,
        checking: false,
        message: error.response?.data?.message || error.message || 'Unable to reach the AI service status endpoint.',
      });
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setErrorBanner(null);
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    // Prepare history payload (excluding initial welcome banner if system message)
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome-1')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await sendChatMessage(text, historyPayload);
      const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (res?.success && res.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: res.reply,
            timestamp: assistantTime,
          },
        ]);
        return;
      }

      let errText = res?.message || 'The AI service returned an unsuccessful response.';
      if (res?.errorType === 'NOT_CONFIGURED') {
        errText = 'The Kinetide AI coach is not configured. Check the AI service configuration with your administrator.';
        setStatus({ configured: false, checking: false });
      }
      setErrorBanner(errText);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          isError: true,
          content: errText,
          timestamp: assistantTime,
        },
      ]);
    } catch (error) {
      const errText = error.response?.data?.message
        || (error.code === 'ECONNABORTED' ? 'The AI request timed out. Please try again.' : 'Could not connect to the Kinetide AI service. Please retry.');
      setErrorBanner(errText);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        isError: true,
        content: errText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={embedded ? 'w-full font-sans' : 'fixed bottom-3 right-3 z-50 font-sans sm:bottom-6 sm:right-6'}>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Kinetide AI coach"
          className="group relative flex items-center justify-center p-3 sm:p-4 bg-[#E10600] hover:bg-[#650000] text-white rounded-full shadow-[0_0_25px_rgba(225, 6, 0,0.6)] hover:shadow-[0_0_35px_rgba(225, 6, 0,0.8)] transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-transform group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
          </span>
          <span className="sr-only">Open Chat</span>
        </button>
      )}

      {/* Floating Chat Window Panel */}
      {isOpen && (
        <div className={`flex flex-col ${embedded ? 'w-full h-[min(72vh,760px)] min-h-[420px]' : 'w-[360px] sm:w-[420px] max-w-[calc(100vw-1.5rem)] h-[580px] max-h-[calc(100dvh-5rem)]'} bg-[#0B0B0F] border border-[#E10600]/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5`}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-[#12121A] border-b border-[#E10600]/20">
            <div className="flex items-center gap-3">
              <div className="relative p-2 bg-[#E10600]/15 border border-[#E10600]/40 rounded-xl text-[#E10600]">
                <Bot className="w-5 h-5" />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#12121A] ${
                    status.configured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  title={status.configured ? 'AI Connected' : 'AI Unconfigured'}
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                  Kinetide AI <Sparkles className="w-3.5 h-3.5 text-[#E10600]" />
                </h3>
                <p className="text-[11px] text-gray-400">
                  {status.checking ? 'Checking AI service…' : status.configured ? 'Gemini AI fitness guide' : 'AI service unavailable'}
                </p>
              </div>
            </div>

            {!embedded && <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>}
          </div>

          {/* Service status banner */}
          {!status.configured && !status.checking && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">AI service unavailable</p>
                <p className="text-[11px] text-amber-200/80">
                  {status.message || 'The backend reports that the Gemini AI service is not configured.'}
                </p>
                <button type="button" onClick={checkBackendStatus} className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-100 underline"><RefreshCw className="h-3 w-3" />Check again</button>
              </div>
            </div>
          )}

          {/* Messages Display Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-gray-800">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#E10600] text-white rounded-br-none shadow-[0_2px_10px_rgba(225, 6, 0,0.3)]'
                      : msg.isError
                      ? 'bg-red-500/10 border border-red-500/30 text-red-200 rounded-bl-none'
                      : 'bg-[#181822] text-gray-100 border border-white/5 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex flex-col items-start">
                <div className="bg-[#181822] border border-[#E10600]/30 text-gray-300 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                  <span className="text-xs text-[#FF6B63] font-medium">Kinetide AI is typing</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-[#0F0F16] border-t border-white/5">
            <p className="text-[10px] font-semibold text-gray-400 mb-1.5 tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#E10600]" /> Suggested Prompts
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_PROMPTS.map((prompt, idx) => {
                const IconComponent = prompt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt.text)}
                    disabled={loading}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A26] hover:bg-[#E10600]/20 border border-white/10 hover:border-[#E10600]/50 rounded-full text-[11px] text-gray-300 hover:text-white transition-all disabled:opacity-50"
                  >
                    <IconComponent className="w-3 h-3 text-[#E10600]" />
                    <span>{prompt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Box & Send Button */}
          <div className="p-3 bg-[#12121A] border-t border-[#E10600]/20">
            <div className="flex items-center gap-2 bg-[#0B0B0F] border border-white/10 focus-within:border-[#E10600] rounded-xl px-3 py-2 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI fitness coach..."
                maxLength={1000}
                disabled={loading}
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                aria-label="Send message"
                className="p-2 bg-[#E10600] hover:bg-[#650000] disabled:bg-gray-800 text-white disabled:text-gray-500 rounded-lg transition-all flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
