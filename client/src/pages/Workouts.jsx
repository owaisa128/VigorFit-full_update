import PageHeader from '../components/PageHeader';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import WorkoutImage from '../components/WorkoutImage';
import PlanFeaturesPanel from '../components/PlanFeaturesPanel';
import {
  Dumbbell,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Layers,
  Tag,
  AlertCircle,
  Loader2,
  X,
} from '../icons';
import EmptyState from '../components/EmptyState';

const CATEGORIES = ['All', 'Strength', 'Cardio', 'Flexibility', 'HIIT', 'Endurance', 'Other'];
export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal for delete confirmation
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWorkouts = async (searchTerm = search, categoryTerm = selectedCategory) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryTerm && categoryTerm !== 'All') params.category = categoryTerm;

      const response = await api.get('/workouts', { params });
      if (response.data && response.data.success) {
        setWorkouts(response.data.workouts || []);
      }
    } catch (err) {
      console.error('Fetch workouts failed:', err);
      setError(err.response?.data?.message || 'Failed to load workouts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts(search, selectedCategory);
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchWorkouts(search, selectedCategory);
  };

  const handleDelete = async () => {
    if (!workoutToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/workouts/${workoutToDelete._id}`);
      setWorkouts((prev) => prev.filter((w) => w._id !== workoutToDelete._id));
      setWorkoutToDelete(null);
    } catch (err) {
      console.error('Delete workout failed:', err);
      alert(err.response?.data?.message || 'Failed to delete workout');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="vf-theme-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Banner */}
      <PageHeader as="div" className="vf-page-banner flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 rounded-2xl border border-white/10 bg-[#171819] p-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600]">
              <Dumbbell className="w-6 h-6" />
            </div>
            MY <span className="text-[var(--primary)]">WORKOUTS</span>
          </h1>
          <p className="text-[#B8B8C2] text-sm mt-1">
            Track, manage, and inspect your custom workout routines.
          </p>
        </div>

        <Link
          to="/workouts/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] hover:opacity-90 text-white font-extrabold text-sm tracking-wider uppercase shadow-lg shadow-[#E10600]/25 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          CREATE YOUR OWN WORKOUT
        </Link>
      </PageHeader>

      <PlanFeaturesPanel category="workouts" />

      {/* Filter and Search Bar */}
      <div className="bg-[#111111] rounded-2xl p-4 border border-[#E10600]/25 mb-8 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#B8B8C2]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description, tags, or exercise name..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#050505] border border-[#E10600]/25 rounded-xl text-white placeholder-[#B8B8C2]/60 text-sm focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-[#E10600] shrink-0 hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-44 px-3 py-2.5 bg-[#050505] border border-[#E10600]/25 rounded-xl text-white text-sm focus:outline-none focus:border-[#E10600] transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-[#050505] text-white">
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#050505] hover:bg-[#1a1a1a] text-white text-sm font-semibold border border-[#E10600]/30 hover:border-[#E10600]/60 transition-colors cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Grid / Loading / Empty State */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-[#B8B8C2]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E10600]" />
          <p className="text-sm font-semibold">Loading your workouts...</p>
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          type="workouts"
          sentence={search || selectedCategory !== 'All' ? 'No workouts match your search. Reset filters to see your routines.' : 'Your training log is empty — log your first workout to start tracking progress.'}
          actionLabel={search || selectedCategory !== 'All' ? 'Reset filters' : 'Log a workout'}
          to={search || selectedCategory !== 'All' ? undefined : '/workout-tracker'}
          onAction={search || selectedCategory !== 'All' ? () => {
            setSearch('');
            setSelectedCategory('All');
            fetchWorkouts('', 'All');
          } : undefined}
          className="max-w-lg mx-auto my-12"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workouts.map((workout) => {
            const hasCardImage = Boolean(workout.imageFileId);
            return (
            <div
              key={workout._id}
              className="bg-[#111111] rounded-2xl p-5 border border-[#E10600]/25 flex flex-col justify-between"
            >
              <div className="vf-workout-card-image relative -mx-6 -mt-6 mb-4 flex h-64 items-center justify-center overflow-hidden rounded-t-2xl bg-[var(--surface-2)]">
                  <WorkoutImage
                    workoutId={workout._id}
                    hasImage={hasCardImage}
                    alt={`${workout.title} workout cover`}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                  {hasCardImage && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />}
                  {hasCardImage && <div className="absolute inset-x-4 bottom-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-[#FCA5A5]/40 bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#FCA5A5]">
                        {workout.category || 'General'}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-white drop-shadow">
                        <Calendar className="h-3 w-3 text-[#FCA5A5]" />
                        {new Date(workout.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-lg font-bold uppercase text-white drop-shadow">
                      {workout.title}
                    </h3>
                  </div>}
              </div>
              <div>
                {!hasCardImage && (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-[#E10600]/30 bg-[#E10600]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#FF6B63]">
                        {workout.category || 'General'}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-[#B8B8C2]">
                        <Calendar className="h-3 w-3 text-[#E10600]" />
                        {new Date(workout.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="line-clamp-1 text-lg font-bold uppercase text-white">{workout.title}</h3>
                  </>
                )}
                {workout.isTrainerAssigned && (
                  <p className="text-xs font-semibold text-[#FF6B63] mt-1">
                    Assigned by {workout.assignedByTrainer || 'your trainer'} - Read only
                  </p>
                )}

                {/* Description Snippet */}
                {workout.description && (
                  <p className="text-xs text-[#B8B8C2] mt-1.5 line-clamp-2">{workout.description}</p>
                )}

                {/* Exercises Count Badge */}
                <div className="mt-4 pt-3 border-t border-[#E10600]/20 flex items-center justify-between text-xs text-[#B8B8C2]">
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    <Layers className="w-3.5 h-3.5 text-[#FCA5A5]" />
                    {workout.exercises ? workout.exercises.length : 0} Exercises
                  </span>
                </div>

                {/* Tags */}
                {workout.tags && workout.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {workout.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#050505] text-[#FCA5A5] border border-[#E10600]/20 font-mono"
                      >
                        <Tag className="w-2.5 h-2.5 text-[#E10600]" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#E10600]/20">
                <Link
                  to={`/workouts/${workout._id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#050505] hover:bg-[#1a1a1a] border border-[#E10600]/30 text-xs font-semibold text-white transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-[#E10600]" />
                  View
                </Link>

                {!workout.isTrainerAssigned && (
                  <>
                    <Link
                      to={`/workouts/${workout._id}/edit`}
                      className="p-2 rounded-xl bg-[#050505] hover:bg-[#1a1a1a] border border-[#E10600]/30 text-[#FCA5A5] transition-colors"
                      title="Edit Workout"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#FCA5A5]" />
                    </Link>

                    <button
                      onClick={() => setWorkoutToDelete(workout)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                      title="Delete Workout"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workoutToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] max-w-md w-full rounded-2xl p-6 border border-[#E10600]/30 shadow-2xl relative">
            <button
              onClick={() => setWorkoutToDelete(null)}
              className="absolute top-4 right-4 text-[#B8B8C2] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white uppercase">Delete Workout?</h3>
            <p className="text-xs text-[#B8B8C2] mt-2">
              Are you sure you want to delete <span className="text-white font-bold">"{workoutToDelete.title}"</span>? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setWorkoutToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-[#050505] hover:bg-[#1a1a1a] border border-[#E10600]/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
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
