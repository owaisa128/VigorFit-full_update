import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BadgeCheck, CalendarDays, Loader2, UserRound } from '../icons';
import { Button, Card } from '../components/ui';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function TrainerPortrait({ trainer, large = false }) {
  const className = `forma-step6__portrait${large ? ' is-large' : ''}`;
  return trainer.avatarUrl
    ? <img className={className} src={trainer.avatarUrl} alt={`${trainer.name} profile`} />
    : <span className={`${className} is-placeholder`} aria-hidden="true"><UserRound /></span>;
}

export default function TrainerDirectory() {
  const { user } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [assignedTrainer, setAssignedTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([api.get('/memberships/available-trainers'), api.get('/memberships/current')])
      .then(([trainerResponse, membershipResponse]) => {
        if (!Array.isArray(trainerResponse.data?.trainers)) {
          throw new Error('Trainer profiles could not be loaded.');
        }
        if (active) {
          setTrainers(trainerResponse.data.trainers);
          setAssignedTrainer(membershipResponse.data?.membership?.assignedTrainer || user?.membership?.assignedTrainer || null);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load trainer profiles.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const assignedId = assignedTrainer?._id || assignedTrainer?.id || '';

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <header className="forma-app__page-heading">
          <div>
            <h1>Find your coach</h1>
            <p>Browse approved trainers, see their upcoming sessions, and choose a coach who fits your goals.</p>
          </div>
          <Button as={Link} to="/messages" variant="secondary">Coach messages <ArrowRight aria-hidden="true" /></Button>
        </header>

        {assignedTrainer && (
          <Card className="forma-step6__assigned">
            <TrainerPortrait trainer={assignedTrainer} />
            <div>
              <span className="forma-step6__availability is-assigned"><BadgeCheck aria-hidden="true" />Your assigned coach</span>
              <h2>{assignedTrainer.name}</h2>
              <p>{assignedTrainer.trainerProfile?.specialization || assignedTrainer.specialization || 'Your FORMA trainer'}</p>
            </div>
            <Button as={Link} to={`/my-trainer/${assignedId}`} variant="secondary">View profile</Button>
          </Card>
        )}
        {!assignedTrainer && (
          <EmptyState
            type="clients"
            sentence="You haven’t booked a coach yet. Find a trainer who matches your goals."
            actionLabel="Browse trainers"
            onAction={() => document.getElementById('approved-trainers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        )}

        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p></Card>}
        {loading ? (
          <Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading approved trainers…</Card>
        ) : !trainers.length && !error ? (
          <EmptyState type="clients" sentence="No approved trainer profiles are available right now." actionLabel="Refresh trainer directory" onAction={() => setRefreshKey((value) => value + 1)} />
        ) : (
          <section id="approved-trainers" aria-label="Approved trainers" className="forma-step6__trainer-grid">
            {trainers.map((trainer) => {
              const isAssigned = String(assignedId) === String(trainer.id);
              const hasAvailability = trainer.remainingSlots > 0;
              return (
                <Card className="forma-step6__trainer-card" key={trainer.id}>
                  <div className="forma-step6__trainer-head">
                    <TrainerPortrait trainer={trainer} />
                    <span className={`forma-step6__availability${hasAvailability ? ' is-open' : ' is-full'}`}>
                      <i aria-hidden="true" />{hasAvailability ? 'Available' : 'At capacity'}
                    </span>
                  </div>
                  <div className="forma-step6__trainer-copy">
                    <h2>{trainer.name}</h2>
                    <div className="forma-step6__tags">
                      {trainer.specialization
                        ? trainer.specialization.split(/[,;|]/).map((tag) => tag.trim()).filter(Boolean).map((tag) => <span className="forma-step6__tag" key={tag}>{tag}</span>)
                        : <span className="forma-step6__tag">Personal training</span>}
                    </div>
                    {trainer.bio && <p>{trainer.bio}</p>}
                    {trainer.upcomingClasses?.length > 0 && (
                      <p className="forma-step6__next-session"><CalendarDays aria-hidden="true" />Next session {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(trainer.upcomingClasses[0].startsAt))}</p>
                    )}
                  </div>
                  <Button as={Link} to={`/my-trainer/${trainer.id}`} variant="primary" disabled={!hasAvailability && !isAssigned}>
                    {isAssigned ? 'Book session' : 'Book session'}
                  </Button>
                </Card>
              );
            })}
          </section>
        )}
        {user?.fitnessGoal && <p className="forma-step6__privacy-note">Your current focus: {user.fitnessGoal}</p>}
      </div>
    </main>
  );
}
