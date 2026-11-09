import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCheck, Loader2, MessageCircle, Search, Send, UserRound } from '../icons';
import { Button, Card, Field, MessageBubble } from '../components/ui';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';

const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';

export default function CoachMessages() {
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
  const requestedClientId = searchParams.get('clientId');

  const loadMessages = useCallback(async () => {
    const { data } = await api.get('/trainer-workspace/messages');
    if (!Array.isArray(data.messages)) throw new Error('Messages were not returned.');
    setMessages(data.messages);
  }, []);

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
            setClientId(assignedClients.some((client) => client._id === requestedClientId) ? requestedClientId : assignedClients[0]._id);
          }
          setError('');
        }
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load messages.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isTrainer, requestedClientId]);

  const selectedClient = clients.find((client) => client._id === clientId);
  const visibleClients = useMemo(() => clients.filter((client) => `${client.name} ${client.email}`.toLowerCase().includes(search.toLowerCase())), [clients, search]);
  const thread = useMemo(() => messages
    .filter((message) => (isTrainer ? message.client?._id === clientId : true))
    .slice()
    .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt)), [isTrainer, messages, clientId]);
  const assignedTrainer = user?.membership?.assignedTrainer;
  const trainer = messages[0]?.trainer
    || (assignedTrainer && typeof assignedTrainer === 'object' ? assignedTrainer : null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread.length]);

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
      const { data } = await api.post('/trainer-workspace/messages', {
        ...(isTrainer ? { clientId } : {}),
        body,
      });
      setSuccess(data.message || 'Message sent.');
      setBody('');
      await loadMessages();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to send the message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <header className="forma-app__page-heading">
          <div><h1>Coach messages</h1><p>{isTrainer ? 'Private conversations with your assigned clients.' : 'Keep in touch with your assigned trainer.'}</p></div>
          <MessageCircle aria-hidden="true" />
        </header>

        {(error || success) && <Card className={`forma-step6__notice${error ? ' is-error' : ' is-success'}`} role={error ? 'alert' : 'status'}>{error ? <AlertCircle aria-hidden="true" /> : <CheckCheck aria-hidden="true" />}<p>{error || success}</p></Card>}

        <Card className="forma-step6__messages">
          <aside className={`forma-step6__conversation-list${mobileChatOpen ? ' is-hidden-mobile' : ''}`}>
            <header><h2>{isTrainer ? 'Clients' : 'Your coach'}</h2>
              {isTrainer && <Field id="message-search" label="Find a conversation" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" icon={Search} />}
            </header>
            <div className="forma-step6__conversation-items">
              {loading ? <p className="forma-step6__muted">Loading conversations…</p>
                : isTrainer ? visibleClients.length ? visibleClients.map((client) => {
                  const latest = messages.find((message) => message.client?._id === client._id);
                  return (
                    <button type="button" className={`forma-step6__conversation${client._id === clientId ? ' is-active' : ''}`} key={client._id} onClick={() => selectClient(client._id)}>
                      <span className="forma-step6__avatar">{initials(client.name)}</span><span><strong>{client.name}</strong><small>{latest?.body || client.fitnessGoal || 'Start a conversation'}</small></span>{latest && <time>{formatTime(latest.createdAt)}</time>}
                    </button>
                  );
                }) : <p className="forma-step6__muted">{clients.length ? 'No conversations match your search.' : 'No active eligible clients to message yet.'}</p>
                  : trainer || assignedTrainer || thread.length ? (
                    <button type="button" className={`forma-step6__conversation${mobileChatOpen ? ' is-active' : ''}`} onClick={() => setMobileChatOpen(true)}>
                      <span className="forma-step6__avatar">{initials(trainer?.name || 'Coach')}</span><span><strong>{trainer?.name || 'Your trainer'}</strong><small>Assigned coach</small></span>
                    </button>
                  ) : isTrainer
                    ? <EmptyState type="clients" sentence="Your active clients will appear here when they choose you as their coach." actionLabel="Review clients" to="/trainer/clients" className="max-w-xs" />
                    : <EmptyState type="clients" sentence="You haven't booked a coach yet. Find a trainer who matches your goals." actionLabel="Browse trainers" to="/my-trainer" className="max-w-xs" />}
            </div>
          </aside>

          <section className={`forma-step6__thread${mobileChatOpen ? ' is-visible-mobile' : ''}`} aria-label="Message thread">
            <header className="forma-step6__thread-header">
              <Button type="button" variant="ghost" className="forma-step6__mobile-back" aria-label="Back to conversations" onClick={() => setMobileChatOpen(false)}><ArrowLeft aria-hidden="true" /></Button>
              <span className="forma-step6__avatar">{initials(isTrainer ? selectedClient?.name || 'Client' : trainer?.name || 'Coach')}</span>
              <div><h2>{isTrainer ? selectedClient?.name || 'Choose a client' : trainer?.name || 'Your coach'}</h2><p>{isTrainer ? 'Assigned client' : 'Trainer conversation'}</p></div>
            </header>
            <div className="forma-step6__thread-body" aria-live="polite">
              {loading ? <p className="forma-step6__muted">Loading messages…</p>
                : isTrainer && !selectedClient ? <p className="forma-step6__muted">Choose an assigned client to open a conversation.</p>
                    : !thread.length ? <EmptyState
                      type="messages"
                      sentence={isTrainer ? 'This conversation is just getting started. Send your client a message.' : 'Nothing here yet. Message your coach to get started.'}
                      actionLabel={isTrainer ? 'Write a message' : 'Start a conversation'}
                      onAction={() => document.getElementById('coach-message')?.focus()}
                      className="m-auto"
                    />
                    : thread.map((item) => {
                        const sent = isTrainer ? item.senderRole !== 'client' : item.senderRole === 'client';
                        return <MessageBubble key={item._id} variant={sent ? 'sent' : 'received'} sender={sent ? undefined : trainer?.name} timestamp={item.createdAt} timestampLabel={formatTime(item.createdAt)}>{item.body}</MessageBubble>;
                      })}
              <div ref={bottomRef} />
            </div>
            <form className="forma-step6__composer" onSubmit={send}>
              <Field
                as="textarea"
                id="coach-message"
                label="Message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                rows={1}
                placeholder={isTrainer ? (selectedClient ? 'Write a message…' : 'Select an assigned client') : 'Write a message…'}
                disabled={sending || (isTrainer && !selectedClient)}
              />
              <Button type="submit" variant="primary" aria-label="Send message" disabled={sending || (isTrainer && !selectedClient) || !body.trim()}>{sending ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : <Send aria-hidden="true" />}Send</Button>
            </form>
          </section>
        </Card>
      </div>
    </main>
  );
}
