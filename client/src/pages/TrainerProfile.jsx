import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BadgeCheck, CalendarDays, Clock, ExternalLink, Loader2, MapPin, UserRound } from '../icons';
import { Button, Card } from '../components/ui';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasFeature } from '../utils/membershipAccess';

const formatDate = (value) => new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date(value));
const formatTime = (value) => new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value));

export default function TrainerProfile() {
  const { trainerId } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [trainer, setTrainer] = useState(null);
  const [membership, setMembership] = useState(user?.membership || null);
  const [loading, setLoading] = useState(true);
  const [busyClass, setBusyClass] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/memberships/available-trainers'), api.get('/memberships/current')])
      .then(([trainerResponse, membershipResponse]) => {
        const selected = trainerResponse.data?.trainers?.find((item) => String(item.id) === trainerId);
        if (!selected) throw new Error('This trainer profile is no longer available.');
        if (active) {
          setTrainer(selected);
          setMembership(membershipResponse.data?.membership || null);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load this trainer profile.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trainerId]);

  const assignedId = membership?.assignedTrainer?._id || membership?.assignedTrainer?.id || membership?.assignedTrainer || '';
  const isAssigned = String(assignedId) === String(trainerId);
  const hasOtherAssignedTrainer = Boolean(assignedId) && !isAssigned;
  const canBookClasses = hasFeature(membership, 'zoomClasses');

  const bookSession = async (item) => {
    setError('');
    setBusyClass(item._id);
    try {
      if (!isAssigned) {
        const { data } = await api.post('/memberships/select-trainer', { trainerId });
        if (!data?.success || !data.membership) throw new Error(data?.message || 'Unable to choose this trainer.');
        setMembership(data.membership);
        updateUser((current) => ({ ...current, membership: data.membership }));
      }
      navigate(`/classes?classId=${encodeURIComponent(item.id)}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to continue to booking.');
    } finally {
      setBusyClass('');
    }
  };

  if (loading) {
    return <main className="forma-app forma-app-page forma-step6"><div className="forma-app__container"><Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading trainer profile…</Card></div></main>;
  }

  if (!trainer) {
    return (
      <main className="forma-app forma-app-page forma-step6">
        <div className="forma-app__container">
          <Button as={Link} to="/my-trainer" variant="secondary"><ArrowLeft aria-hidden="true" /> Trainer directory</Button>
          <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error || 'This trainer profile could not be found.'}</p></Card>
        </div>
      </main>
    );
  }

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <Button as={Link} to="/my-trainer" variant="ghost"><ArrowLeft aria-hidden="true" /> All trainers</Button>
        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p></Card>}

        <Card className="forma-step6__profile">
          {trainer.avatarUrl
            ? <img className="forma-step6__profile-photo" src={trainer.avatarUrl} alt={`${trainer.name} profile`} />
            : <span className="forma-step6__profile-photo is-placeholder" aria-hidden="true"><UserRound /></span>}
          <div className="forma-step6__profile-content">
            <span className={`forma-step6__availability${trainer.remainingSlots > 0 ? ' is-open' : ' is-full'}`}><i aria-hidden="true" />{trainer.remainingSlots > 0 ? 'Accepting clients' : isAssigned ? 'Your assigned coach' : 'At capacity'}</span>
            <h1>{trainer.name}</h1>
            {trainer.specialization && <div className="forma-step6__tags">{trainer.specialization.split(/[,;|]/).map((tag) => tag.trim()).filter(Boolean).map((tag) => <span className="forma-step6__tag" key={tag}>{tag}</span>)}</div>}
            {trainer.bio && <p className="forma-step6__profile-bio">{trainer.bio}</p>}
            <p className="forma-step6__profile-slots"><MapPin aria-hidden="true" />{trainer.remainingSlots} of {trainer.clientCapacity} coaching places available</p>
          </div>
        </Card>

        <section className="forma-step6__profile-schedule">
          <div className="forma-step6__section-heading">
            <div><h2>Upcoming sessions</h2><p>Live group sessions scheduled by this trainer.</p></div>
            {isAssigned && canBookClasses && <Button as={Link} to="/classes" variant="secondary">Open calendar <CalendarDays aria-hidden="true" /></Button>}
          </div>
          {!trainer.upcomingClasses?.length ? (
            <EmptyState
              type="workouts"
              sentence="This trainer has no upcoming sessions listed yet."
              actionLabel={canBookClasses ? 'Message your trainer' : 'View live-session plans'}
              to={canBookClasses ? '/messages' : '/memberships'}
            />
          ) : trainer.upcomingClasses.map((item) => (
            <Card className="forma-step6__session" key={`${item.title}-${item.startsAt}`}>
              <div className="forma-step6__session-top">
                <div><span className="forma-step6__tag">{item.category || 'General'}</span><h3>{item.title}</h3></div>
                <span className="forma-step6__session-duration"><Clock aria-hidden="true" />{item.durationMinutes} min</span>
              </div>
              <p className="forma-step6__session-meta"><CalendarDays aria-hidden="true" />{formatDate(item.startsAt)} · {formatTime(item.startsAt)}</p>
              {canBookClasses && !hasOtherAssignedTrainer ? (
                <Button type="button" variant="primary" disabled={busyClass === item.id || (trainer.remainingSlots === 0 && !isAssigned)} onClick={() => bookSession(item)}>
                  {busyClass === item.id ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : <ExternalLink aria-hidden="true" />}
                  Book session
                </Button>
              ) : canBookClasses ? (
                <p className="forma-step6__privacy-note">Sessions are bookable only with your currently assigned trainer.</p>
              ) : (
                <Button as={Link} to="/memberships" variant="secondary">View live-session plans</Button>
              )}
            </Card>
          ))}
          {(!canBookClasses || hasOtherAssignedTrainer) && trainer.upcomingClasses?.length > 0 && <p className="forma-step6__privacy-note">{hasOtherAssignedTrainer ? 'To book these sessions, change your assigned trainer through your membership options.' : 'Live-session booking is available on eligible membership plans.'}</p>}
        </section>
      </div>
    </main>
  );
}
