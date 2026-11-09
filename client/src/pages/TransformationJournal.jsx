import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  Images,
  Loader2,
  Pencil,
  Scale,
  Trash2,
  Upload,
  X,
} from '../icons';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const todayDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function PrivatePhotoImage({ photo, className, alt }) {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setError(false);
    api.get(`/transformation-photos/${photo.id}/image`, { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id]);

  if (error) {
    return <div className={`flex items-center justify-center bg-[#09090D] text-xs text-rose-300 ${className}`}>Photo unavailable</div>;
  }
  if (!imageUrl) {
    return <div className={`flex items-center justify-center bg-[#09090D] text-[#B8B8C2] ${className}`}><Loader2 className="h-5 w-5 animate-spin text-[#E10600]" /></div>;
  }
  return <img src={imageUrl} alt={alt} className={className} />;
}

export default function TransformationJournal() {
  const [photos, setPhotos] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [progressError, setProgressError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadFormRef = useRef(null);
  const [photoDate, setPhotoDate] = useState(todayDate());
  const [photoNotes, setPhotoNotes] = useState('');
  const [selection, setSelection] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setPhotoError('');
    setProgressError('');
    const [photoResult, progressResult] = await Promise.allSettled([
      api.get('/transformation-photos'),
      api.get('/progress'),
    ]);
    if (photoResult.status === 'fulfilled' && photoResult.value.data?.success) {
      setPhotos(photoResult.value.data.photos || []);
    } else {
      setPhotoError(photoResult.status === 'rejected'
        ? photoResult.reason.response?.data?.message || 'Could not load private photos.'
        : 'Could not load private photos.');
    }
    if (progressResult.status === 'fulfilled' && progressResult.value.data?.success) {
      setProgress(progressResult.value.data.progress || []);
    } else {
      setProgressError(progressResult.status === 'rejected'
        ? progressResult.reason.response?.data?.message || 'Could not load progress history.'
        : 'Could not load progress history.');
    }
    if (photoResult.status === 'rejected' && progressResult.status === 'rejected') {
      setLoadError('The journal could not load. Check your connection and try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setPhotoError('');
    if (!photoFile) {
      setPhotoError('Choose a progress photo to upload.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (photoFile.size > 8 * 1024 * 1024) {
      setPhotoError('Photo must be 8 MiB or smaller.');
      return;
    }
    const data = new FormData();
    data.append('photo', photoFile);
    data.append('date', photoDate);
    data.append('notes', photoNotes);
    setUploading(true);
    try {
      const response = await api.post('/transformation-photos', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setPhotos((current) => [response.data.photo, ...current].sort((a, b) => b.date.localeCompare(a.date)));
      setPhotoFile(null);
      setPhotoNotes('');
      uploadFormRef.current?.reset();
    } catch (error) {
      setPhotoError(error.response?.data?.message || 'Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const setSelectedFile = (file) => {
    setPhotoError('');
    setPhotoFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFile(event.dataTransfer.files?.[0] || null);
  };

  const toggleComparison = (id) => {
    setSelection((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : current.length < 2 ? [...current, id] : [current[1], id]);
  };

  const startEditing = (photo) => {
    setEditingId(photo.id);
    setEditDate(photo.date);
    setEditNotes(photo.notes || '');
    setPhotoError('');
  };

  const saveEdit = async (id) => {
    setSavingEdit(true);
    setPhotoError('');
    try {
      const response = await api.patch(`/transformation-photos/${id}`, { date: editDate, notes: editNotes });
      setPhotos((current) => current.map((photo) => photo.id === id ? response.data.photo : photo)
        .sort((a, b) => b.date.localeCompare(a.date)));
      setEditingId('');
    } catch (error) {
      setPhotoError(error.response?.data?.message || 'Could not update photo details.');
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePhoto = async (photo) => {
    if (!window.confirm('Delete this progress photo? This cannot be undone.')) return;
    setPhotoError('');
    try {
      await api.delete(`/transformation-photos/${photo.id}`);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setSelection((current) => current.filter((id) => id !== photo.id));
      if (editingId === photo.id) setEditingId('');
    } catch (error) {
      setPhotoError(error.response?.data?.message || 'Could not delete photo.');
    }
  };

  const selectedPhotos = selection.map((id) => photos.find((photo) => photo.id === id)).filter(Boolean);
  const focusUploadForm = () => uploadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusTimeline = () => document.getElementById('photo-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="vf-theme-page mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="vf-page-banner mb-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#111115] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E10600]/25 bg-[#E10600]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FCA5A5]">
            <Images className="h-4 w-4" /> Private to your account
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Transformation <span className="text-[#FF6B63]">Journal</span></h1>
          <p className="mt-2 max-w-2xl text-sm text-[#B8B8C2]">Save dated progress photos, revisit your milestones, and compare two moments in your journey.</p>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{loadError}</span>
          <button type="button" onClick={loadJournal} className="rounded-lg border border-rose-300/30 px-3 py-1.5 font-semibold">Retry</button>
        </div>
      )}

      <section className="mb-8 rounded-2xl border border-[#E10600]/25 bg-[#101014] p-4 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-6" aria-labelledby="upload-title">
        <h2 id="upload-title" className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Upload className="h-5 w-5 text-[#E10600]" />Add a progress photo</h2>
        {photoError && <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{photoError}</p>}
        <form ref={uploadFormRef} onSubmit={handleUpload} className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(160px,0.6fr)_minmax(0,1fr)_auto] md:items-end">
          <div
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`min-w-0 rounded-xl border border-dashed p-4 transition-all duration-200 ${isDragging ? 'border-[#E10600] bg-[#E10600]/10' : 'border-[#E10600]/30 bg-[#080808]/70 hover:border-[#E10600]/60 hover:bg-[#E10600]/5 hover:shadow-[0_6px_16px_rgba(225,6,0,0.12)]'}`}
          >
            <label htmlFor="journal-photo-upload" className="flex cursor-pointer items-center gap-3 text-xs font-semibold text-[#B8B8C2]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E10600]/25 bg-[#E10600]/10 text-[#E10600]"><Upload className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm text-white">{photoFile ? photoFile.name : 'Choose a photo or drag it here'}</span>
                <span className="mt-1 block text-[11px] font-normal text-gray-500">JPEG, PNG, or WebP · up to 8 MiB</span>
              </span>
              <input id="journal-photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="sr-only" required />
            </label>
          </div>
          <label className="block text-xs font-semibold text-[#B8B8C2]">
            Photo date
            <input type="date" value={photoDate} onChange={(event) => setPhotoDate(event.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-3 text-sm text-white focus:border-[#E10600] focus:outline-none" />
          </label>
          <label className="block text-xs font-semibold text-[#B8B8C2]">
            Notes <span className="font-normal text-gray-500">(optional)</span>
            <input type="text" value={photoNotes} onChange={(event) => setPhotoNotes(event.target.value)} maxLength={1000} placeholder="Add a note about this milestone" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#E10600] focus:outline-none" />
          </label>
          <button type="submit" disabled={uploading || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E10600] px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#650000] hover:shadow-[0_8px_20px_rgba(225,6,0,0.28)] disabled:cursor-not-allowed disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        </form>
      </section>

      <section className="mb-8 rounded-2xl border border-[#E10600]/20 bg-[#101014] p-4 sm:p-6" aria-labelledby="comparison-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="comparison-title" className="text-lg font-bold text-white">Before &amp; after</h2>
            <p className="mt-1 text-xs text-[#B8B8C2]">Select up to two photos in the timeline to compare.</p>
          </div>
          {selection.length > 0 && <button type="button" onClick={() => setSelection([])} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#FCA5A5] hover:bg-white/5"><X className="h-3.5 w-3.5" />Clear selection</button>}
        </div>
        {selectedPhotos.length === 0 ? (
          <EmptyState
            type="progress"
            sentence={photos.length ? 'Select two photos from your timeline to compare them side by side.' : 'Add a progress photo to begin a private visual timeline.'}
            actionLabel={photos.length ? 'Choose photos' : 'Upload first photo'}
            onAction={photos.length ? focusTimeline : focusUploadForm}
          />
        ) : (
          <div className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-2">
            {[0, 1].map((index) => {
              const photo = selectedPhotos[index];
              const label = index === 0 ? 'Before' : 'After';
              return photo ? (
                <figure key={photo.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#E10600]/50 bg-[#080808] shadow-[0_0_24px_rgba(225, 6, 0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(225,6,0,0.2)]">
                  <figcaption className="flex items-center justify-between gap-2 border-b border-[#E10600]/20 bg-[#E10600]/[0.06] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#FCA5A5]">
                    <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#E10600]" />{label}</span>
                    <span className="normal-case tracking-normal">{formatDate(photo.date)}</span>
                  </figcaption>
                  <PrivatePhotoImage photo={photo} alt={`${label} progress photo dated ${photo.date}`} className="h-64 w-full bg-[#080808] object-contain sm:h-80" />
                </figure>
              ) : (
                <div key={label} className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 sm:min-h-[26rem]">
                  <EmptyState
                    type="progress"
                    sentence={`Choose a photo for the ${label.toLowerCase()} view to complete your comparison.`}
                    actionLabel="Choose a photo"
                    onAction={focusTimeline}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section id="photo-timeline" className="mb-10" aria-labelledby="timeline-title">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="timeline-title" className="flex items-center gap-2 text-xl font-bold text-white"><CalendarDays className="h-5 w-5 text-[#E10600]" />Photo timeline</h2>
          <span className="text-xs text-gray-500">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>
        </div>
        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-[#E10600]" />Loading your private journal…</div>
        ) : photoError && photos.length === 0 ? (
          <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 text-center text-sm text-rose-300">{photoError}</div>
        ) : photos.length === 0 ? (
          <EmptyState type="progress" sentence="Your photo timeline is empty. Add a private progress photo to get started." actionLabel="Add a progress photo" onAction={focusUploadForm} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => {
              const selected = selection.includes(photo.id);
              const editing = editingId === photo.id;
              return (
                <article key={photo.id} className={`min-w-0 overflow-hidden rounded-2xl border bg-[#101014] shadow-lg transition-colors ${selected ? 'border-[#E10600] shadow-[#E10600]/10' : 'border-white/10'}`}>
                  <PrivatePhotoImage photo={photo} alt={`Progress photo dated ${photo.date}`} className="h-64 w-full bg-[#080808] object-contain" />
                  <div className="space-y-3 p-4">
                    {editing ? (
                      <>
                        <label className="block text-xs font-semibold text-[#B8B8C2]">Date<input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-sm text-white" /></label>
                        <label className="block text-xs font-semibold text-[#B8B8C2]">Notes<textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-sm text-white" /></label>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingId('')} className="rounded-lg px-3 py-2 text-xs text-gray-300 hover:bg-white/5">Cancel</button>
                          <button type="button" disabled={savingEdit} onClick={() => saveEdit(photo.id)} className="inline-flex items-center gap-1 rounded-lg bg-[#E10600] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-sm font-bold text-[#FCA5A5]"><CalendarDays className="h-4 w-4 text-[#E10600]" />{formatDate(photo.date)}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => startEditing(photo)} aria-label={`Edit photo dated ${photo.date}`} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => deletePhoto(photo)} aria-label={`Delete photo dated ${photo.date}`} className="rounded-lg p-2 text-gray-400 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <p className="min-h-5 break-words text-sm text-gray-300">{photo.notes || <span className="text-gray-600">No note added</span>}</p>
                        <button type="button" aria-pressed={selected} onClick={() => toggleComparison(photo.id)} className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${selected ? 'border-[#E10600] bg-[#E10600]/15 text-[#FCA5A5]' : 'border-white/10 text-gray-300 hover:border-[#E10600]/50 hover:text-white'}`}>
                          {selected ? 'Selected for comparison' : 'Select for comparison'}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="measurements-title">
        <div className="mb-4">
          <h2 id="measurements-title" className="flex items-center gap-2 text-xl font-bold text-white"><Scale className="h-5 w-5 text-[#E10600]" />Weight &amp; measurement history</h2>
          <p className="mt-1 text-xs text-gray-500">Existing dated records from your Progress page.</p>
        </div>
        {progressError ? (
          <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">{progressError}</p>
        ) : progress.length === 0 && !loading ? (
          <EmptyState type="progress" sentence="No check-ins yet. Add your first measurement to see your trend." actionLabel="Add a check-in" to="/progress" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#101014]">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.03] text-gray-400">
                <tr>{['Date', 'Weight', 'Chest', 'Waist', 'Hips', 'Body fat'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {progress.map((record) => (
                  <tr key={record._id} className="text-gray-200">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[#FCA5A5]">{formatDate(record.date)}</td>
                    <td className="px-4 py-3">{record.weight ?? '—'} kg</td>
                    <td className="px-4 py-3">{record.chest || '—'} cm</td>
                    <td className="px-4 py-3">{record.waist || '—'} cm</td>
                    <td className="px-4 py-3">{record.hips || '—'} cm</td>
                    <td className="px-4 py-3">{record.bodyFatPercentage ? `${record.bodyFatPercentage}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}