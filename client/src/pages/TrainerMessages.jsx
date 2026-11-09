import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCheck,
  Loader2,
  MessageCircle,
  Search,
  Send,
  UserRound,
} from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';

const formatTime = (value) => new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

const formatDay = (value) => {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'TODAY';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date).toUpperCase();
};

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';

export default function TrainerMessages() {
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [clientId, setClientId] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const { data } = await api.get('/trainer-workspace/messages');
    if (!Array.isArray(data.messages)) throw new Error('Messages were not returned.');
    setMessages(data.messages);
  }, []);

  const requestedClientId = searchParams.get('clientId');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/trainer-workspace/messages'),
      isTrainer ? api.get('/memberships/assigned-clients') : Promise.resolve({ data: { clients: [] } }),
    ])
      .then(([messageResponse, clientResponse]) => {
        if (!Array.isArray(messageResponse.data.messages)) throw new Error('Messages were not returned.');
        const assignedClients = (Array.isArray(clientResponse.data.clients) ? clientResponse.data.clients : [])
          .filter((client) => ['elite', 'premium'].includes(client.membership?.accessLevel) || ['elite', 'premium'].includes(client.membership?.planSlug));
        if (active) {
          setMessages(messageResponse.data.messages);
          setClients(assignedClients);
          if (isTrainer && assignedClients.length) {
            setClientId(assignedClients.some((client) => client._id === requestedClientId)
              ? requestedClientId
              : assignedClients[0]._id);
          }
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load messages.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isTrainer, requestedClientId]);

  const selectedClient = clients.find((client) => client._id === clientId);
  const visibleClients = useMemo(() => clients.filter((client) => (
    `${client.name} ${client.email}`.toLowerCase().includes(search.toLowerCase())
  )), [clients, search]);
  const thread = useMemo(() => messages
    .filter((message) => (isTrainer ? message.client?._id === clientId : true))
    .slice()
    .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)), [isTrainer, messages, clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length]);

  const selectClient = (id) => {
    setClientId(id);
    setSuccess('');
    setError('');
    setMobileChatOpen(true);
    setSearchParams({ clientId: id });
  };

  const send = async (event) => {
    event.preventDefault();
    if (!clientId || !body.trim()) return;
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const { data } = await api.post('/trainer-workspace/messages', { clientId, body });
      setSuccess(data.message || 'Message sent.');
      setBody('');
      await loadMessages();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to send the message.');
    } finally {
      setSending(false);
    }
  };

  const getLatestMessage = (id) => messages.find((message) => message.client?._id === id);

  return (
    <section className="vf-theme-page mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-[#171819] p-5">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><MessageCircle className="h-4 w-4" />Trainer workspace</p>
          <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Messages</h1>
          <p className="mt-1 text-sm text-gray-400">{isTrainer ? 'Private chats with your active assigned clients.' : 'Messages from your assigned trainer.'}</p>
        </div>
      </PageHeader>

      {(error || success) && <p role={error ? 'alert' : 'status'} className={`mb-3 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/20 bg-red-950/30 text-red-200' : 'border-emerald-500/20 bg-emerald-950/30 text-emerald-200'}`}>{error || success}</p>}

      <div className="vf-trainer-messages grid h-[min(74dvh,780px)] min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#101817] shadow-2xl sm:min-h-[520px] md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <aside className={`${mobileChatOpen ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-white/10 bg-[#111918]`}>
          <div className="border-b border-white/10 px-4 py-4">
            <h2 className="font-bold text-white">{isTrainer ? 'Assigned clients' : 'Your trainer'}</h2>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="w-full rounded-lg border border-white/10 bg-[#080e0d] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-emerald-500/50" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="flex items-center gap-2 p-5 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading chats…</p>
            ) : isTrainer && visibleClients.length === 0 ? (
              <p className="p-5 text-sm leading-relaxed text-gray-400">{clients.length ? 'No assigned clients match your search.' : 'No active Elite or Premium clients yet. Messaging is included from the Elite plan.'}</p>
            ) : isTrainer ? visibleClients.map((client) => {
              const latestMessage = getLatestMessage(client._id);
              const selected = client._id === clientId;
              return (
                <button key={client._id} type="button" onClick={() => selectClient(client._id)} className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-l-2 hover:border-l-emerald-400 hover:bg-white/[0.06] hover:shadow-md hover:shadow-emerald-500/10 ${selected ? 'bg-[#1b2b28]' : ''}`}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-900 text-sm font-bold text-white">{initials(client.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-white">{client.name}</span>{latestMessage && <time className="shrink-0 text-[10px] text-gray-500">{formatTime(latestMessage.createdAt)}</time>}</span>
                    <span className="mt-1 block truncate text-xs text-gray-400">{latestMessage?.body || client.fitnessGoal || 'Start a conversation'}</span>
                  </span>
                </button>
              );
            }) : (
              <div className="flex items-center gap-3 px-4 py-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-900 text-white"><UserRound className="h-5 w-5" /></span>
                <span><span className="block text-sm font-semibold text-white">{messages[0]?.trainer?.name || 'Your trainer'}</span><span className="text-xs text-gray-400">Assigned trainer</span></span>
              </div>
            )}
          </div>
        </aside>

        <div className={`${mobileChatOpen ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col`}>
          <header className="flex min-h-[68px] items-center gap-3 border-b border-white/10 bg-[#17201e] px-4 py-3">
            <button type="button" onClick={() => setMobileChatOpen(false)} aria-label="Back to conversations" className="rounded-lg p-2 text-gray-300 hover:bg-white/10 md:hidden"><ArrowLeft className="h-5 w-5" /></button>
            {isTrainer && selectedClient ? (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-900 text-sm font-bold text-white">{initials(selectedClient.name)}</span>
                <div className="min-w-0"><h2 className="truncate text-sm font-bold text-white">{selectedClient.name}</h2><p className="truncate text-xs text-emerald-300">Active assigned client</p></div>
              </>
            ) : !isTrainer && messages.length ? (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-900 text-white"><UserRound className="h-5 w-5" /></span>
                <div><h2 className="text-sm font-bold text-white">{messages[0]?.trainer?.name || 'Your trainer'}</h2><p className="text-xs text-emerald-300">Your assigned trainer</p></div>
              </>
            ) : (
              <div><h2 className="text-sm font-bold text-white">Your conversations</h2><p className="text-xs text-gray-400">Choose an assigned client to chat.</p></div>
            )}
          </header>

          <div className="vf-messages-thread flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#0b1210] px-3 py-4 sm:px-6">
            {loading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin" />Loading messages…</div>
            ) : !selectedClient && isTrainer ? (
              <EmptyState
                type="messages"
                sentence="You don't have any assigned clients to message yet. Review your client roster to get started."
                actionLabel="View clients"
                to="/trainer/clients"
                className="m-auto max-w-sm"
              />
            ) : thread.length === 0 ? (
              <div className="m-auto rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-xs text-gray-300">This conversation is just getting started.</div>
            ) : (
              <div className="mt-auto space-y-3">
                {thread.map((item, index) => {
                  const previous = thread[index - 1];
                  const showDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(item.createdAt).toDateString();
                  const outgoing = isTrainer;
                  return (
                    <React.Fragment key={item._id}>
                      {showDay && <div className="my-4 text-center"><span className="vf-message-day rounded-lg bg-[#1b2825] px-3 py-1.5 text-[10px] font-bold tracking-wide text-gray-300">{formatDay(item.createdAt)}</span></div>}
                      <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                        <article className={`vf-message-bubble max-w-[88%] rounded-xl px-3 py-2 shadow-sm sm:max-w-[75%] ${outgoing ? 'vf-message-bubble-outgoing rounded-tr-sm bg-[#075e4e] text-white' : 'vf-message-bubble-incoming rounded-tl-sm bg-[#202c2a] text-gray-100'}`}>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.body}</p>
                          <div className={`vf-message-meta mt-1 flex items-center justify-end gap-1 text-[10px] ${outgoing ? 'vf-message-meta-outgoing text-emerald-100/70' : 'vf-message-meta-incoming text-gray-400'}`}><time>{formatTime(item.createdAt)}</time>{outgoing && <CheckCheck className="h-3.5 w-3.5 text-sky-200" />}</div>
                        </article>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {isTrainer ? (
            <form onSubmit={send} className="flex items-end gap-2 border-t border-white/10 bg-[#17201e] p-3 sm:p-4">
              <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={1} required disabled={!selectedClient || sending} placeholder={selectedClient ? 'Type a message' : 'Select an assigned client'} aria-label="Message" className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-white/10 bg-[#263330] px-4 py-3 text-sm text-white placeholder:text-gray-400 outline-none focus:border-emerald-500/50 disabled:opacity-50" />
              <button type="submit" disabled={sending || !selectedClient || !body.trim()} aria-label="Send message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#07977a] disabled:cursor-not-allowed disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
            </form>
          ) : (
            <div className="border-t border-white/10 bg-[#17201e] px-4 py-3 text-center text-xs text-gray-400">Contact your trainer to continue the conversation.</div>
          )}
        </div>
      </div>
    </section>
  );
}
