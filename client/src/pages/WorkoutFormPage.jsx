import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, Plus, Save, Trash2 } from '../icons';
import { Button, Card, Field } from '../components/ui';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Strength', 'Cardio', 'Flexibility', 'HIIT', 'Endurance', 'Other', 'General'];
const newExercise = () => ({ name: '', sets: 3, reps: 10, weight: 0, notes: '' });
const initialForm = () => ({ title: '', description: '', category: 'Strength', tags: '', videoUrl: '', exercises: [newExercise()] });

export default function WorkoutFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const [form, setForm] = useState(initialForm);
  const [assignedClients, setAssignedClients] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [imageFileId, setImageFileId] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [removeVideo, setRemoveVideo] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (currentImage) URL.revokeObjectURL(currentImage);
  }, [imagePreview, currentImage]);

  useEffect(() => {
    if (!isTrainer || isEditing) return undefined;
    let active = true;
    api.get('/memberships/assigned-clients')
      .then(({ data }) => { if (active && Array.isArray(data.clients)) setAssignedClients(data.clients); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load assigned clients.'); });
    return () => { active = false; };
  }, [isEditing, isTrainer]);

  useEffect(() => {
    if (!isEditing) return undefined;
    let active = true;
    api.get(`/workouts/${id}`)
      .then(({ data }) => {
        if (!data?.success || !data.workout) throw new Error('Workout details were not returned.');
        if (data.workout.isTrainerAssigned) {
          navigate(`/workouts/${id}`, { replace: true });
          return;
        }
        if (active) {
          const workout = data.workout;
          setForm({
            title: workout.title || '',
            description: workout.description || '',
            category: workout.category || 'General',
            tags: workout.tags?.join(', ') || '',
            videoUrl: workout.videoUrl || '',
            exercises: workout.exercises?.length ? workout.exercises : [newExercise()],
          });
          setVideoFileName(workout.videoFileName || '');
          setImageFileId(workout.imageFileId || '');
          setImageFileName(workout.imageFileName || '');
        }
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load this workout for editing.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isEditing, navigate]);

  useEffect(() => {
    setCurrentImage('');
    if (!isEditing || !imageFileId) return undefined;
    let active = true;
    let objectUrl;
    api.get(`/workouts/${id}/image`, { responseType: 'blob' })
      .then(({ data }) => {
        if (active) {
          objectUrl = URL.createObjectURL(data);
          setCurrentImage(objectUrl);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load the current workout image.'); });
    return () => { active = false; };
  }, [id, imageFileId, isEditing]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateExercise = (index, key, value) => setForm((current) => ({
    ...current,
    exercises: current.exercises.map((exercise, position) => position === index ? { ...exercise, [key]: value } : exercise),
  }));
  const selectImage = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      setError('Workout image must be 10 MiB or smaller.');
      event.target.value = '';
      setImageFile(null);
      setImagePreview('');
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
    if (file) setRemoveImage(false);
  };
  const selectVideo = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      setError('Workout video must be 50 MiB or smaller.');
      event.target.value = '';
      setVideoFile(null);
      return;
    }
    setError('');
    setVideoFile(file);
    if (file) setRemoveVideo(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Workout title is required.');
    if (!form.exercises.length) return setError('Add at least one exercise.');
    for (let index = 0; index < form.exercises.length; index += 1) {
      const exercise = form.exercises[index];
      if (!exercise.name.trim()) return setError(`Exercise ${index + 1} needs a name.`);
      if (!Number.isInteger(Number(exercise.sets)) || Number(exercise.sets) < 1
        || !Number.isInteger(Number(exercise.reps)) || Number(exercise.reps) < 1) {
        return setError(`Exercise ${index + 1} needs at least one whole-number set and rep.`);
      }
      if (!Number.isFinite(Number(exercise.weight)) || Number(exercise.weight) < 0) return setError(`Exercise ${index + 1} load cannot be negative.`);
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        videoUrl: form.videoUrl.trim(),
        exercises: form.exercises.map((exercise) => ({
          name: exercise.name.trim(),
          sets: Number(exercise.sets) || 1,
          reps: Number(exercise.reps) || 1,
          weight: Number(exercise.weight) || 0,
          notes: exercise.notes?.trim() || '',
        })),
        ...(isEditing ? { removeVideo, removeImage } : {}),
        ...(!isEditing && isTrainer && assignedTo ? { assignedTo } : {}),
      };
      const useMultipart = Boolean(imageFile || videoFile);
      const body = useMultipart ? new FormData() : payload;
      if (useMultipart) {
        Object.entries(payload).forEach(([key, value]) => body.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value)));
        if (imageFile) body.append('image', imageFile);
        if (videoFile) body.append('video', videoFile);
      }
      const response = isEditing
        ? await api.put(`/workouts/${id}`, body, useMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
        : await api.post('/workouts', body, useMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
      if (!response.data?.success) throw new Error(response.data?.message || 'Workout could not be saved.');
      navigate(isEditing ? `/workouts/${id}` : '/workouts');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save this workout.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="forma-app forma-app-page forma-step6"><div className="forma-app__container"><Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading workout…</Card></div></main>;
  }

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container forma-step6__form-page">
        <Button as={Link} to={isEditing ? `/workouts/${id}` : '/workouts'} variant="ghost"><ArrowLeft aria-hidden="true" />{isEditing ? 'Cancel editing' : 'Training library'}</Button>
        <header className="forma-app__page-heading"><div><h1>{isEditing ? 'Edit workout' : 'Create a workout'}</h1><p>{isEditing ? 'Update your routine details, media, and exercise plan.' : 'Build a reusable training plan with movements, sets, reps, and load.'}</p></div></header>
        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p></Card>}

        <form className="forma-step6__workout-form" onSubmit={submit}>
          <Card className="forma-step6__workout-form-section">
            <h2>Workout details</h2>
            <div className="forma-step6__form-grid">
              <Field className="is-wide" id="workout-title" label="Workout title" value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={120} required placeholder="Upper body strength" />
              {isTrainer && !isEditing && <Field className="is-wide" id="workout-assigned-to" as="select" label="Assign to client (optional)" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}><option value="">Keep in my library</option>{assignedClients.map((client) => <option value={client._id} key={client._id}>{client.name}</option>)}</Field>}
              <Field id="workout-category" as="select" label="Category" value={form.category} onChange={(event) => update('category', event.target.value)}>{CATEGORIES.map((category) => <option value={category} key={category}>{category}</option>)}</Field>
              <Field id="workout-tags" label="Tags" hint="Separate tags with commas." value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="strength, upper body" />
              <Field className="is-wide" as="textarea" id="workout-description" label="Description" value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} maxLength={1000} placeholder="What should this workout focus on?" />
            </div>
          </Card>

          <Card className="forma-step6__workout-form-section">
            <h2>Workout media</h2>
            <div className="forma-step6__form-grid">
              <div className="forma-step6__file-field">
                <label htmlFor="workout-image">Cover image</label>
                <input id="workout-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} />
                <p>{imageFile ? `${imageFile.name} · ${(imageFile.size / 1048576).toFixed(1)} MiB` : imageFileName ? `Current image: ${imageFileName}` : 'JPEG, PNG, or WebP · up to 10 MiB.'}</p>
                {(imagePreview || currentImage) && !removeImage && <img src={imagePreview || currentImage} alt="Workout cover preview" />}
                {isEditing && imageFileId && <label className="forma-step6__check"><input type="checkbox" checked={removeImage} onChange={(event) => setRemoveImage(event.target.checked)} />Remove cover image</label>}
              </div>
              <div className="forma-step6__file-field">
                <label htmlFor="workout-video-url">Training video link</label>
                <Field id="workout-video-url" label="Video URL" type="url" value={form.videoUrl} onChange={(event) => update('videoUrl', event.target.value)} placeholder="YouTube or direct video URL" />
                <p>YouTube and direct MP4, WebM, MOV, or OGG links are supported.</p>
              </div>
              <div className="forma-step6__file-field">
                <label htmlFor="workout-video">Upload a video</label>
                <input id="workout-video" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" onChange={selectVideo} />
                <p>{videoFile ? `${videoFile.name} · ${(videoFile.size / 1048576).toFixed(1)} MiB` : videoFileName ? `Current upload: ${videoFileName}` : 'MP4, WebM, MOV, or OGG · up to 50 MiB.'}</p>
                {isEditing && videoFileName && <label className="forma-step6__check"><input type="checkbox" checked={removeVideo} onChange={(event) => setRemoveVideo(event.target.checked)} />Remove uploaded video</label>}
              </div>
            </div>
          </Card>

          <Card className="forma-step6__workout-form-section">
            <div className="forma-step6__section-heading"><div><h2>Exercise plan</h2><p>{form.exercises.length} movements in this routine.</p></div><Button type="button" variant="secondary" onClick={() => update('exercises', [...form.exercises, newExercise()])}><Plus aria-hidden="true" />Add exercise</Button></div>
            <div className="forma-step6__exercise-editor">
              {form.exercises.map((exercise, index) => (
                <fieldset className="forma-step6__exercise-edit" key={index}>
                  <legend>Exercise {index + 1}</legend>
                  <Button type="button" variant="ghost" aria-label={`Remove exercise ${index + 1}`} disabled={form.exercises.length === 1} onClick={() => update('exercises', form.exercises.filter((_, position) => position !== index))}><Trash2 aria-hidden="true" /></Button>
                  <div className="forma-step6__form-grid">
                    <Field className="is-wide" id={`exercise-${index}-name`} label="Movement" value={exercise.name} onChange={(event) => updateExercise(index, 'name', event.target.value)} required placeholder="Bench press" />
                    <Field id={`exercise-${index}-sets`} label="Sets" type="number" min="1" value={exercise.sets} onChange={(event) => updateExercise(index, 'sets', event.target.value)} required />
                    <Field id={`exercise-${index}-reps`} label="Reps" type="number" min="1" value={exercise.reps} onChange={(event) => updateExercise(index, 'reps', event.target.value)} required />
                    <Field id={`exercise-${index}-weight`} label="Weight (kg)" type="number" min="0" step="0.5" value={exercise.weight} onChange={(event) => updateExercise(index, 'weight', event.target.value)} />
                    <Field className="is-wide" id={`exercise-${index}-notes`} label="Coaching notes" value={exercise.notes || ''} onChange={(event) => updateExercise(index, 'notes', event.target.value)} maxLength={500} placeholder="Optional cues" />
                  </div>
                </fieldset>
              ))}
            </div>
          </Card>

          <div className="forma-step6__form-actions"><Button as={Link} to={isEditing ? `/workouts/${id}` : '/workouts'} variant="secondary">Cancel</Button><Button type="submit" variant="primary" disabled={submitting}>{submitting ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : <Save aria-hidden="true" />}{isEditing ? 'Save changes' : 'Create workout'}</Button></div>
        </form>
      </div>
    </main>
  );
}
