import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertCircle, ArrowLeft, CalendarDays, Clock, Download, Edit, ExternalLink, Flame, Layers, Loader2, Tag, Trash2, TrendingUp, Video } from '../icons';
import { Button, Card } from '../components/ui';
import WorkoutImage from '../components/WorkoutImage';
import WorkoutVideoPlayer from '../components/ui/WorkoutVideoPlayer';
import api from '../api/axios';

const getYouTubeEmbedUrl = (value) => {
  try {
    const url = new URL(value);
    let videoId = '';
    if (url.hostname === 'youtu.be') videoId = url.pathname.slice(1);
    if (url.hostname.endsWith('youtube.com')) videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : '';
  } catch {
    return '';
  }
};

const isDirectVideoUrl = (value) => /\.(mp4|webm|mov|ogg)(?:$|[?#])/i.test(value);

function SummaryMetric({ icon: Icon, label, value, unit }) {
  return (
    <Card className="forma-step6__detail-metric">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}<small>{unit}</small></strong>
    </Card>
  );
}

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/workouts/${id}`)
      .then(({ data }) => {
        if (!data?.success || !data.workout) throw new Error('Workout details were not returned.');
        if (active) setWorkout(data.workout);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load this workout.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!workout?.videoFileId) return undefined;
    let active = true;
    let objectUrl;
    api.get(`/workouts/${id}/video`, { responseType: 'blob' })
      .then(({ data }) => {
        if (active) {
          objectUrl = URL.createObjectURL(data);
          setUploadedVideoUrl(objectUrl);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load the uploaded workout video.');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUploadedVideoUrl('');
    };
  }, [id, workout?.videoFileId]);

  const exercises = workout?.exercises || [];
  const summary = useMemo(() => exercises.reduce((result, exercise) => {
    const sets = Number(exercise.sets) || 0;
    const reps = Number(exercise.reps) || 0;
    const weight = Number(exercise.weight) || 0;
    return {
      sets: result.sets + sets,
      reps: result.reps + sets * reps,
      volume: result.volume + sets * reps * weight,
    };
  }, { sets: 0, reps: 0, volume: 0 }), [exercises]);

  const removeWorkout = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/workouts/${id}`);
      navigate('/workouts');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete this workout.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <main className="forma-app forma-app-page forma-step6"><div className="forma-app__container"><Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading workout…</Card></div></main>;
  }

  if (!workout) {
    return (
      <main className="forma-app forma-app-page forma-step6">
        <div className="forma-app__container">
          <Button as={Link} to="/workouts" variant="secondary"><ArrowLeft aria-hidden="true" /> Training library</Button>
          <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error || 'Workout not found.'}</p></Card>
        </div>
      </main>
    );
  }

  const youtubeUrl = workout.videoUrl && getYouTubeEmbedUrl(workout.videoUrl);
  const directUrl = workout.videoUrl && isDirectVideoUrl(workout.videoUrl);
  const hasVideo = Boolean(workout.videoFileId || youtubeUrl || directUrl);

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <header className="forma-step6__detail-actions">
          <Button as={Link} to="/workouts" variant="secondary"><ArrowLeft aria-hidden="true" /> Training library</Button>
          {!workout.isTrainerAssigned && (
            <div>
              <Button as={Link} to={`/workouts/${id}/edit`} variant="secondary"><Edit aria-hidden="true" /> Edit</Button>
              <Button type="button" variant="ghost" onClick={removeWorkout} disabled={deleting}>{deleting ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : <Trash2 aria-hidden="true" />} Delete</Button>
            </div>
          )}
        </header>

        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p></Card>}

        <Card className="forma-step6__workout-hero">
          {workout.imageFileId && <div className="forma-step6__workout-cover"><WorkoutImage workoutId={workout._id} hasImage alt={`${workout.title} cover`} className="h-full w-full object-cover" /></div>}
          <div className="forma-step6__workout-hero-copy">
            <div className="forma-step6__tags">
              <span className="forma-step6__tag">{workout.category || 'General'}</span>
              {workout.isTrainerAssigned && <span className="forma-step6__tag is-muted">Assigned by {workout.assignedByTrainer || 'your trainer'} · Read only</span>}
              {workout.tags?.map((tag) => <span className="forma-step6__tag is-muted" key={tag}><Tag aria-hidden="true" />{tag}</span>)}
            </div>
            <h1>{workout.title}</h1>
            {workout.description && <p>{workout.description}</p>}
            <div className="forma-step6__workout-meta">
              {workout.createdAt && <span><CalendarDays aria-hidden="true" />Created {new Date(workout.createdAt).toLocaleDateString()}</span>}
              {workout.updatedAt && <span><Clock aria-hidden="true" />Updated {new Date(workout.updatedAt).toLocaleDateString()}</span>}
              <span><Layers aria-hidden="true" />{exercises.length} exercises</span>
            </div>
          </div>
        </Card>

        {hasVideo && (
          <section className="forma-step6__video-section" aria-labelledby="workout-video-heading">
            <div className="forma-step6__section-heading"><div><h2 id="workout-video-heading">Workout video</h2><p>Watch the trainer’s demonstration before you begin.</p></div><Video aria-hidden="true" /></div>
            {uploadedVideoUrl && <WorkoutVideoPlayer src={uploadedVideoUrl} title={`Uploaded demonstration for ${workout.title}`} downloadName={workout.videoFileName || 'workout-video'} />}
            {workout.videoFileId && !uploadedVideoUrl && !error && <Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading video…</Card>}
            {youtubeUrl && <div className="forma-step6__embed"><iframe src={youtubeUrl} title={`${workout.title} demonstration video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}
            {directUrl && !youtubeUrl && <WorkoutVideoPlayer src={workout.videoUrl} title={`Video for ${workout.title}`} />}
            {workout.videoUrl && <Button as="a" variant="ghost" href={workout.videoUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Open video separately</Button>}
          </section>
        )}

        <section className="forma-step6__detail-metrics" aria-label="Workout summary">
          <SummaryMetric icon={TrendingUp} label="Total volume" value={summary.volume.toLocaleString()} unit="kg" />
          <SummaryMetric icon={Dumbbell} label="Movements" value={exercises.length} unit="" />
          <SummaryMetric icon={Layers} label="Working sets" value={summary.sets} unit="" />
          <SummaryMetric icon={Flame} label="Total reps" value={summary.reps} unit="" />
        </section>

        <section className="forma-step6__exercise-section" aria-labelledby="exercise-heading">
          <div className="forma-step6__section-heading"><div><h2 id="exercise-heading">Exercise plan</h2><p>{exercises.length ? `${exercises.length} movements in this routine.` : 'No movements have been added to this routine yet.'}</p></div><Activity aria-hidden="true" /></div>
          {!exercises.length ? (
            <Card className="forma-step6__day-empty"><p>This workout has no exercise details yet.</p></Card>
          ) : exercises.map((exercise, index) => {
            const volume = (Number(exercise.sets) || 0) * (Number(exercise.reps) || 0) * (Number(exercise.weight) || 0);
            return (
              <Card className="forma-step6__exercise" key={exercise._id || `${exercise.name}-${index}`}>
                <span className="forma-step6__exercise-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="forma-step6__exercise-copy"><h3>{exercise.name}</h3>{exercise.notes && <p>{exercise.notes}</p>}</div>
                <div className="forma-step6__exercise-data"><span><small>Sets</small>{exercise.sets || '—'}</span><span><small>Reps</small>{exercise.reps || '—'}</span><span><small>Load</small>{exercise.weight ? `${exercise.weight} kg` : '—'}</span><span><small>Volume</small>{volume ? `${volume.toLocaleString()} kg` : '—'}</span></div>
              </Card>
            );
          })}
        </section>

        <Card className="forma-step6__detail-cta">
          <div><h2>Ready to train?</h2><p>Open the session tracker to record your next workout.</p></div>
          <Button as={Link} to="/workout-tracker" variant="primary">Start a session <ArrowLeft aria-hidden="true" /></Button>
        </Card>
      </div>
    </main>
  );
}
