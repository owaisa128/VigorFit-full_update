import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import WorkoutImage from '../components/WorkoutImage';
import {
  Dumbbell,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Layers,
  Tag,
  Clock,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Flame,
  Activity,
  BarChart3,
  TrendingUp,
  Download,
  ExternalLink,
  Video,
} from '../icons';

const getYouTubeEmbedUrl = (value) => {
  try {
    const url = new URL(value);
    let videoId = '';
    if (url.hostname === 'youtu.be') videoId = url.pathname.slice(1);
    if (url.hostname.endsWith('youtube.com')) {
      videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
    }
    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : '';
  } catch {
    return '';
  }
};

const isDirectVideoUrl = (value) => /\.(mp4|webm|mov|ogg)(?:$|[?#])/i.test(value);

export default function WorkoutDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [videoError, setVideoError] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchWorkout = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/workouts/${id}`);
        if (response.data && response.data.success) {
          setWorkout(response.data.workout);
        }
      } catch (err) {
        console.error('Fetch workout details failed:', err);
        setError(err.response?.data?.message || 'Failed to load workout details.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
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
          setVideoError('');
        }
      })
      .catch((requestError) => {
        if (active) setVideoError(requestError.response?.data?.message || 'Unable to load the uploaded video.');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUploadedVideoUrl('');
    };
  }, [id, workout?.videoFileId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/workouts/${id}`);
      navigate('/workouts');
    } catch (err) {
      console.error('Delete workout failed:', err);
      alert(err.response?.data?.message || 'Failed to delete workout');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center gap-4 text-[#B8B8C2]">
        <div className="p-4 rounded-full bg-[#111111] border border-[#E10600]/30 shadow-xl shadow-[#E10600]/10">
          <Loader2 className="w-8 h-8 animate-spin text-[#E10600]" />
        </div>
        <p className="text-sm font-bold uppercase tracking-wider text-white">Loading Workout Dashboard...</p>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111111] border border-[#E10600]/20 text-xs font-bold text-white hover:border-[#E10600]/50 transition-all mb-6"
        >
          <ArrowLeft className="w-4 h-4 text-[#E10600]" />
          Back to Workouts
        </Link>
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
          <span className="font-medium">{error || 'Workout not found.'}</span>
        </div>
      </div>
    );
  }

  // Calculate volume & summary metrics
  const exercisesList = workout.exercises || [];
  const totalSets = exercisesList.reduce((acc, ex) => acc + (Number(ex.sets) || 0), 0);
  const totalReps = exercisesList.reduce((acc, ex) => acc + ((Number(ex.sets) || 0) * (Number(ex.reps) || 0)), 0);
  const totalVolume = exercisesList.reduce(
    (acc, ex) => acc + ((Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0)),
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-[#E10600]/25 text-xs font-bold text-white hover:border-[#E10600]/60 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-[#E10600]" />
          <span>BACK TO WORKOUTS</span>
        </Link>

        {!workout.isTrainerAssigned && (
          <div className="flex items-center gap-3">
            <Link
              to={`/workouts/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-[#E10600]/30 text-xs font-bold text-white transition-all hover:border-[#E10600]/70 shadow-md"
            >
              <Edit className="w-4 h-4 text-[#E10600]" />
              <span>EDIT WORKOUT</span>
            </Link>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-bold text-rose-400 transition-all cursor-pointer shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>DELETE WORKOUT</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Header Banner Card */}
      {workout.imageFileId && (
        <div className="mb-8 h-56 overflow-hidden rounded-3xl border border-[#E10600]/25 shadow-xl sm:h-80">
          <WorkoutImage
            workoutId={workout._id}
            hasImage
            alt={`${workout.title} workout cover`}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="bg-[#111111] rounded-3xl p-6 sm:p-8 border border-[#E10600]/25 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E10600]/15 blur-[110px] rounded-full pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3.5 py-1 rounded-full bg-[#E10600]/15 border border-[#E10600]/35 text-xs font-extrabold text-[#FF6B63] uppercase tracking-wider shadow-sm">
              {workout.category || 'General'}
            </span>
            {workout.isTrainerAssigned && (
              <span className="px-3.5 py-1 rounded-full bg-[#050505] border border-[#E10600]/25 text-xs font-semibold text-[#B8B8C2]">
                Assigned by {workout.assignedByTrainer || 'your trainer'} - Read only
              </span>
            )}

            {workout.tags &&
              workout.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-[#050505] text-[#FCA5A5] border border-[#E10600]/20 font-mono"
                >
                  <Tag className="w-3 h-3 text-[#E10600]" />
                  {tag}
                </span>
              ))}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight leading-tight">
            {workout.title}
          </h1>

          {workout.description && (
            <p className="text-sm sm:text-base text-[#B8B8C2] mt-3 leading-relaxed max-w-3xl">
              {workout.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t border-[#E10600]/20 text-xs text-[#B8B8C2]">
            <div className="flex items-center gap-2 font-mono">
              <Calendar className="w-4 h-4 text-[#E10600]" />
              <span>Created: {new Date(workout.createdAt).toLocaleDateString()}</span>
            </div>
            {workout.updatedAt && (
              <div className="flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4 text-[#FCA5A5]" />
                <span>Updated: {new Date(workout.updatedAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-[#E10600]" />
              <span>{exercisesList.length} Exercises Recorded</span>
            </div>
          </div>
        </div>
      </div>

      {(workout.videoFileId || workout.videoUrl) && (
        <section className="mb-8 rounded-3xl border border-[#E10600]/25 bg-[#111111] p-5 shadow-xl sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black uppercase text-white"><Video className="h-5 w-5 text-[#E10600]" />Workout video</h2>
            {workout.videoFileId && uploadedVideoUrl && <a href={uploadedVideoUrl} download={workout.videoFileName || 'workout-video'} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"><Download className="h-4 w-4" />Download video</a>}
          </div>
          {videoError && <p role="alert" className="mb-3 text-sm text-rose-300">{videoError}</p>}
          {workout.videoFileId && !uploadedVideoUrl && !videoError && <p className="mb-3 flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading uploaded video…</p>}
          {uploadedVideoUrl && <video src={uploadedVideoUrl} controls preload="metadata" className="mb-4 max-h-[520px] w-full rounded-xl bg-black" aria-label={`Uploaded demonstration for ${workout.title}`} />}
          {workout.videoUrl && getYouTubeEmbedUrl(workout.videoUrl) && (
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe src={getYouTubeEmbedUrl(workout.videoUrl)} title={`${workout.title} demonstration video`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            </div>
          )}
          {workout.videoUrl && !getYouTubeEmbedUrl(workout.videoUrl) && isDirectVideoUrl(workout.videoUrl) && (
            <video src={workout.videoUrl} controls preload="metadata" className="max-h-[520px] w-full rounded-xl bg-black" aria-label={`Video link for ${workout.title}`} />
          )}
          {workout.videoUrl && (
            <a href={workout.videoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-200 hover:text-white"><ExternalLink className="h-4 w-4" />Open video URL</a>
          )}
        </section>
      )}

      {/* Summary Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111111] border border-[#E10600]/25 shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/60 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#B8B8C2] font-extrabold uppercase tracking-wider">Total Volume</span>
            <div className="p-2 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            {totalVolume.toLocaleString()} <span className="text-xs font-bold text-[#FF6B63]">kg</span>
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#111111] border border-[#E10600]/25 shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/60 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#B8B8C2] font-extrabold uppercase tracking-wider">Exercises</span>
            <div className="p-2 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600]">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            {exercisesList.length} <span className="text-xs font-bold text-[#FCA5A5]">movements</span>
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#111111] border border-[#E10600]/25 shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/60 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#B8B8C2] font-extrabold uppercase tracking-wider">Total Sets</span>
            <div className="p-2 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            {totalSets} <span className="text-xs font-bold text-[#FCA5A5]">sets</span>
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#111111] border border-[#E10600]/25 shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/60 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#B8B8C2] font-extrabold uppercase tracking-wider">Total Reps</span>
            <div className="p-2 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            {totalReps} <span className="text-xs font-bold text-[#FF6B63]">reps</span>
          </p>
        </div>
      </div>

      {/* Exercises Section */}
      <div className="bg-[#111111] rounded-3xl p-6 sm:p-8 border border-[#E10600]/25 shadow-2xl space-y-6 transition-shadow duration-300 hover:shadow-[0_16px_36px_rgba(225,6,0,0.14)]">
        <div className="flex items-center justify-between border-b border-[#E10600]/20 pb-4">
          <h3 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#E10600]" />
            EXERCISE BREAKDOWN
          </h3>
          <span className="text-xs font-mono font-bold text-[#FCA5A5] bg-[#050505] px-3 py-1 rounded-full border border-[#E10600]/25">
            {exercisesList.length} EXERCISES
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {exercisesList.length > 0 ? (
            exercisesList.map((ex, idx) => {
              const exVolume = (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);

              return (
                <div
                  key={ex._id || idx}
                  className="p-5 sm:p-6 rounded-2xl bg-[#050505] border border-[#E10600]/20 hover:border-[#E10600]/50 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-lg hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]"
                >
                  {/* Left: Index & Name */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E10600] to-[#650000] p-0.5 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                      <div className="w-full h-full bg-[#050505] rounded-[10px] flex items-center justify-center text-[#E10600] font-black text-sm">
                        #{idx + 1}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">{ex.name}</h4>
                      {ex.notes ? (
                        <p className="text-xs text-[#B8B8C2] mt-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#E10600] shrink-0" />
                          <span>{ex.notes}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#B8B8C2]/50 mt-1 font-mono uppercase">Standard Execution</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    <div className="px-3.5 py-2 rounded-xl bg-[#111111] border border-[#E10600]/20 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E10600]/50 hover:shadow-[0_6px_16px_rgba(225,6,0,0.12)]">
                      <span className="block text-[10px] text-[#B8B8C2] uppercase font-bold tracking-wider">Sets</span>
                      <span className="font-extrabold text-white text-base">{ex.sets}</span>
                    </div>

                    <div className="px-3.5 py-2 rounded-xl bg-[#111111] border border-[#E10600]/20 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E10600]/50 hover:shadow-[0_6px_16px_rgba(225,6,0,0.12)]">
                      <span className="block text-[10px] text-[#B8B8C2] uppercase font-bold tracking-wider">Reps</span>
                      <span className="font-extrabold text-white text-base">{ex.reps}</span>
                    </div>

                    <div className="px-3.5 py-2 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E10600]/60 hover:shadow-[0_6px_16px_rgba(225,6,0,0.12)]">
                      <span className="block text-[10px] text-[#FCA5A5] uppercase font-bold tracking-wider">Weight</span>
                      <span className="font-extrabold text-[#FF6B63] text-base">{ex.weight} kg</span>
                    </div>

                    <div className="px-3.5 py-2 rounded-xl bg-[#111111] border border-[#E10600]/20 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E10600]/50 hover:shadow-[0_6px_16px_rgba(225,6,0,0.12)]">
                      <span className="block text-[10px] text-[#B8B8C2] uppercase font-bold tracking-wider">Volume</span>
                      <span className="font-mono font-bold text-white text-xs mt-1 block">
                        {exVolume.toLocaleString()} kg
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-[#B8B8C2]">
              <p className="text-sm">No exercises recorded for this workout.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111111] max-w-md w-full rounded-3xl p-6 sm:p-8 border border-[#E10600]/35 shadow-2xl relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-5 right-5 text-[#B8B8C2] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-5 shadow-lg">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-wide">Confirm Deletion</h3>
            <p className="text-xs text-[#B8B8C2] mt-2 leading-relaxed">
              Are you sure you want to permanently delete <span className="text-white font-bold">"{workout.title}"</span> from your database? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-[#050505] hover:bg-[#1a1a1a] border border-[#E10600]/25 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-extrabold text-white tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
