import PageHeader from '../components/PageHeader';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Dumbbell,
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from '../icons';

const CATEGORIES = ['Strength', 'Cardio', 'Flexibility', 'HIIT', 'Endurance', 'Other'];

export default function CreateWorkout() {
  const navigate = useNavigate();

  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const [assignedClients, setAssignedClients] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Strength');
  const [tagsInput, setTagsInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const [exercises, setExercises] = useState([
    { name: '', sets: 3, reps: 10, weight: 0, notes: '' },
  ]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!isTrainer) return;
    api.get('/memberships/assigned-clients')
      .then(({ data }) => setAssignedClients(Array.isArray(data.clients) ? data.clients : []))
      .catch(() => setAssignedClients([]));
  }, [isTrainer]);

  // Exercise array helpers
  const handleAddExercise = () => {
    setExercises((prev) => [
      ...prev,
      { name: '', sets: 3, reps: 10, weight: 0, notes: '' },
    ]);
  };

  const handleVideoFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
      setError('Workout video must be 50 MiB or smaller.');
      event.target.value = '';
      setVideoFile(null);
      return;
    }
    setError('');
    setVideoFile(selectedFile);
  };

  const handleImageFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setError('Workout image must be 10 MiB or smaller.');
      event.target.value = '';
      setImageFile(null);
      setImagePreviewUrl('');
      return;
    }
    setError('');
    setImageFile(selectedFile);
    setImagePreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : '');
  };

  const handleRemoveExercise = (index) => {
    if (exercises.length === 1) {
      setError('A workout must contain at least one exercise.');
      return;
    }
    setError('');
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index, field, value) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!title.trim()) {
      setError('Workout title is required.');
      return;
    }

    if (exercises.length === 0) {
      setError('Please add at least one exercise.');
      return;
    }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      if (!ex.name.trim()) {
        setError(`Exercise #${i + 1} requires a name.`);
        return;
      }
      if (Number(ex.sets) < 1) {
        setError(`Exercise #${i + 1} sets must be at least 1.`);
        return;
      }
      if (Number(ex.reps) < 1) {
        setError(`Exercise #${i + 1} reps must be at least 1.`);
        return;
      }
      if (Number(ex.weight) < 0) {
        setError(`Exercise #${i + 1} weight cannot be negative.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tagsArray,
        videoUrl: videoUrl.trim(),
        ...(isTrainer && assignedTo ? { assignedTo } : {}),
        exercises: exercises.map((ex) => ({
          name: ex.name.trim(),
          sets: Number(ex.sets) || 1,
          reps: Number(ex.reps) || 1,
          weight: Number(ex.weight) || 0,
          notes: ex.notes ? ex.notes.trim() : '',
        })),
      };

      const requestPayload = videoFile || imageFile ? new FormData() : payload;
      if (requestPayload instanceof FormData) {
        Object.entries(payload).forEach(([key, value]) => {
          requestPayload.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
        });
        if (videoFile) requestPayload.append('video', videoFile);
        if (imageFile) requestPayload.append('image', imageFile);
      }
      const response = await api.post('/workouts', requestPayload, requestPayload instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined);
      if (response.data && response.data.success) {
        navigate('/workouts');
      }
    } catch (err) {
      console.error('Create workout failed:', err);
      setError(err.response?.data?.message || 'Failed to create workout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vf-theme-page max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Link */}
      <Link
        to="/workouts"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8B8C2] hover:text-[#E10600] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Workouts
      </Link>

      {/* Header */}
      <PageHeader as="div" className="vf-page-banner mb-8 rounded-2xl border border-white/10 bg-[#111115] p-5 sm:p-6">
        <h1 className="text-3xl font-black text-white uppercase tracking-tight flex flex-wrap items-center gap-3">
          <div className="p-2 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600]">
            <Plus className="w-6 h-6" />
          </div>
          CREATE NEW <span className="text-[var(--primary)]">WORKOUT</span>
        </h1>
        <p className="text-[#B8B8C2] text-sm mt-1">
          Set up a structured workout routine with exercises, sets, reps, and target weights.
        </p>
      </PageHeader>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Workout Basic Info Card */}
        <div className="bg-[#111111] rounded-2xl p-6 border border-[#E10600]/25 shadow-xl space-y-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_30px_rgba(225,6,0,0.12)]">
          <h3 className="text-base font-bold text-white uppercase tracking-wide border-b border-[#E10600]/20 pb-3 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[#E10600]" />
            General Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">
                Workout Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Upper Body Strength & Power"
                required
                className="w-full px-4 py-3 bg-[#050505] border border-[#E10600]/25 rounded-xl text-white placeholder-[#B8B8C2]/60 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] text-sm transition-all"
              />
            </div>

            {isTrainer && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">Assign to client (optional)</label>
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full px-4 py-3 bg-[#050505] border border-[#E10600]/25 rounded-xl text-white text-sm focus:outline-none focus:border-[#E10600] transition-all">
                  <option value="">Keep as my own workout</option>
                  {assignedClients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-500">The client will find it in Workouts and get a notification.</p>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-[#050505] border border-[#E10600]/25 rounded-xl text-white text-sm focus:outline-none focus:border-[#E10600] transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#050505] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="chest, arms, heavy"
                className="w-full px-4 py-3 bg-[#050505] border border-[#E10600]/25 rounded-xl text-white placeholder-[#B8B8C2]/60 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] text-sm transition-all"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief notes on workout goals or focus areas..."
                className="w-full px-4 py-3 bg-[#050505] border border-[#E10600]/25 rounded-xl text-white placeholder-[#B8B8C2]/60 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] text-sm resize-none transition-all"
              />
            </div>

            <div className="md:col-span-2 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="workout-image-file" className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">Cover Image (Optional)</label>
                <input id="workout-image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileChange} className="block w-full rounded-xl border border-[#E10600]/25 bg-[#050505] px-3 py-2.5 text-sm text-[#B8B8C2] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E10600]/15 file:px-3 file:py-2 file:text-xs file:font-bold file:text-red-200" />
                <p className="mt-1.5 text-xs text-[#B8B8C2]">{imageFile ? `${imageFile.name} · ${(imageFile.size / (1024 * 1024)).toFixed(1)} MiB` : 'JPEG, PNG or WebP · maximum 10 MiB. Shown on the workout card.'}</p>
                {imagePreviewUrl && <img src={imagePreviewUrl} alt="Workout cover preview" className="mt-3 h-32 w-full rounded-xl object-cover" />}
              </div>
              <div>
                <label htmlFor="workout-video-url" className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">Video URL (Optional)</label>
                <input id="workout-video-url" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://example.com/workout-video.mp4" className="w-full rounded-xl border border-[#E10600]/25 bg-[#050505] px-4 py-3 text-sm text-white placeholder-[#B8B8C2]/60 focus:border-[#E10600] focus:outline-none" />
                <p className="mt-1.5 text-xs text-[#B8B8C2]">Add a YouTube link or a direct video link.</p>
              </div>
              <div>
                <label htmlFor="workout-video-file" className="block text-xs font-semibold text-white mb-1.5 uppercase tracking-wider">Upload Video (Optional)</label>
                <input id="workout-video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" onChange={handleVideoFileChange} className="block w-full rounded-xl border border-[#E10600]/25 bg-[#050505] px-3 py-2.5 text-sm text-[#B8B8C2] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E10600]/15 file:px-3 file:py-2 file:text-xs file:font-bold file:text-red-200" />
                <p className="mt-1.5 text-xs text-[#B8B8C2]">{videoFile ? `${videoFile.name} · ${(videoFile.size / (1024 * 1024)).toFixed(1)} MiB` : 'MP4, WebM, MOV or OGG · maximum 50 MiB.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="bg-[#111111] rounded-2xl p-6 border border-[#E10600]/25 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#E10600]/20 pb-3">
            <h3 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#E10600]" />
              Exercises List ({exercises.length})
            </h3>

            <button
              type="button"
              onClick={handleAddExercise}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E10600]/10 hover:bg-[#E10600]/20 border border-[#E10600]/30 text-xs font-bold text-[#E10600] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Exercise
            </button>
          </div>

          <div className="space-y-6">
            {exercises.map((ex, index) => (
              <div
                key={index}
                className="p-5 rounded-xl bg-[#050505] border border-[#E10600]/20 space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-[#E10600]/15 pb-2">
                  <span className="text-xs font-extrabold text-[#FF6B63] uppercase tracking-wider">
                    Exercise #{index + 1}
                  </span>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(index)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#B8B8C2] mb-1">
                      Exercise Name *
                    </label>
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                      placeholder="e.g. Barbell Bench Press"
                      required
                      className="w-full px-3 py-2 bg-[#111111] border border-[#E10600]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#E10600]"
                    />
                  </div>

                  {/* Sets */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#B8B8C2] mb-1">
                      Sets *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={ex.sets}
                      onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#111111] border border-[#E10600]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#E10600]"
                    />
                  </div>

                  {/* Reps */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#B8B8C2] mb-1">
                      Reps *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={ex.reps}
                      onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#111111] border border-[#E10600]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#E10600]"
                    />
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#B8B8C2] mb-1">
                      Weight (kg / lbs)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={ex.weight}
                      onChange={(e) => handleExerciseChange(index, 'weight', e.target.value)}
                      className="w-full px-3 py-2 bg-[#111111] border border-[#E10600]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#E10600]"
                    />
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[11px] font-semibold text-[#B8B8C2] mb-1">
                      Notes / Form Cues (Optional)
                    </label>
                    <input
                      type="text"
                      value={ex.notes}
                      onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                      placeholder="e.g. 2-second pause at bottom"
                      className="w-full px-3 py-2 bg-[#111111] border border-[#E10600]/25 rounded-lg text-white text-sm focus:outline-none focus:border-[#E10600]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddExercise}
            className="w-full py-3 border border-dashed border-[#E10600]/30 hover:border-[#E10600]/60 rounded-xl text-xs font-bold text-[#E10600] hover:bg-[#E10600]/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Another Exercise
          </button>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to="/workouts"
            className="px-5 py-3 rounded-xl bg-[#050505] hover:bg-[#1a1a1a] border border-[#E10600]/20 text-xs font-semibold text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] hover:opacity-90 text-white font-extrabold text-sm tracking-wide uppercase shadow-lg shadow-[#E10600]/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Saving Workout...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save Workout
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
