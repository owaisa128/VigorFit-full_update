import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Dumbbell, Eye, Layers, Loader2, Pencil, Plus, Search, Tag, Trash2 } from '../icons';
import { Button, Card, Field } from '../components/ui';
import EmptyState from '../components/EmptyState';
import WorkoutImage from '../components/WorkoutImage';
import api from '../api/axios';

const CATEGORIES = ['All', 'Strength', 'Cardio', 'Flexibility', 'HIIT', 'Endurance', 'Other'];

export default function WorkoutLibrary() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadWorkouts = useCallback(async (searchTerm, categoryTerm) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryTerm !== 'All') params.category = categoryTerm;
      const { data } = await api.get('/workouts', { params });
      if (!data?.success || !Array.isArray(data.workouts)) throw new Error('Workout list was not returned.');
      setWorkouts(data.workouts);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load your workouts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkouts('', 'All'); }, [loadWorkouts]);

  const submitSearch = (event) => {
    event.preventDefault();
    loadWorkouts(search, selectedCategory);
  };

  const removeWorkout = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/workouts/${deleteTarget._id}`);
      setWorkouts((current) => current.filter((item) => item._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete this workout.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <header className="forma-app__page-heading">
          <div>
            <h1>Training library</h1>
            <p>Choose a saved plan, review its movements, or build a new routine.</p>
          </div>
          <Button as={Link} to="/workouts/create" variant="primary"><Plus aria-hidden="true" /> Create workout</Button>
        </header>

        <Card className="forma-step6__filters">
          <form onSubmit={submitSearch} className="forma-step6__filter-form">
            <Field id="workout-search" label="Search workouts" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, exercise, or tag" />
            <Field id="workout-category" as="select" label="Category" value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); loadWorkouts(search, event.target.value); }}>
              {CATEGORIES.map((category) => <option value={category} key={category}>{category === 'All' ? 'All categories' : category}</option>)}
            </Field>
            <Button type="submit" variant="secondary"><Search aria-hidden="true" /> Search</Button>
          </form>
        </Card>

        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p><Button type="button" variant="secondary" onClick={() => loadWorkouts(search, selectedCategory)}>Retry</Button></Card>}

        {loading ? (
          <Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading workouts…</Card>
        ) : !workouts.length && !error ? (
          <EmptyState
            type="workouts"
            sentence={search || selectedCategory !== 'All' ? 'No workouts match your search. Reset filters to see your routines.' : 'Your training log is empty — log your first workout to start tracking progress.'}
            actionLabel={search || selectedCategory !== 'All' ? 'Reset filters' : 'Log a workout'}
            to={search || selectedCategory !== 'All' ? undefined : '/workouts/create'}
            onAction={search || selectedCategory !== 'All' ? () => { setSearch(''); setSelectedCategory('All'); loadWorkouts('', 'All'); } : undefined}
          />
        ) : (
          <section className="forma-step6__workout-grid" aria-label="Saved workouts">
            {workouts.map((workout) => (
              <Card className="forma-step6__workout" key={workout._id}>
                {workout.imageFileId && (
                  <div className="forma-step6__workout-image">
                    <WorkoutImage workoutId={workout._id} hasImage alt={`${workout.title} cover`} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="forma-step6__workout-meta">
                  <span className="forma-step6__tag">{workout.category || 'General'}</span>
                  {workout.createdAt && <span><CalendarDays aria-hidden="true" />{new Date(workout.createdAt).toLocaleDateString()}</span>}
                </div>
                <h2>{workout.title}</h2>
                {workout.isTrainerAssigned && <p className="forma-step6__trainer-note">Assigned by {workout.assignedByTrainer || 'your trainer'} · Read only</p>}
                {workout.description && <p className="forma-step6__workout-description">{workout.description}</p>}
                <p className="forma-step6__exercise-count"><Layers aria-hidden="true" />{workout.exercises?.length || 0} exercises</p>
                {workout.tags?.length > 0 && <div className="forma-step6__tags">{workout.tags.map((tag) => <span className="forma-step6__tag is-muted" key={tag}><Tag aria-hidden="true" />{tag}</span>)}</div>}
                <div className="forma-step6__workout-actions">
                  <Button as={Link} to={`/workouts/${workout._id}`} variant="primary"><Eye aria-hidden="true" /> View workout</Button>
                  {!workout.isTrainerAssigned && (
                    <>
                      <Button as={Link} to={`/workouts/${workout._id}/edit`} variant="secondary" aria-label={`Edit ${workout.title}`}><Pencil aria-hidden="true" /></Button>
                      <Button type="button" variant="ghost" aria-label={`Delete ${workout.title}`} onClick={() => setDeleteTarget(workout)}><Trash2 aria-hidden="true" /></Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </section>
        )}

        {deleteTarget && (
          <Card className="forma-step6__confirm" role="group" aria-labelledby="delete-workout-heading">
            <div><h2 id="delete-workout-heading">Delete “{deleteTarget.title}”?</h2><p>This removes the routine from your library. This can’t be undone.</p></div>
            <div><Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Keep workout</Button><Button type="button" variant="primary" disabled={deleting} onClick={removeWorkout}>{deleting && <Loader2 aria-hidden="true" className="forma-step6__spinner" />}Delete workout</Button></div>
          </Card>
        )}
      </div>
    </main>
  );
}
