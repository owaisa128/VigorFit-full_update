import React, { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, Volume2, VolumeX, X } from '../icons';
import { useTheme } from '../context/ThemeContext';

const musicSource = `${import.meta.env.BASE_URL}music%20fitgor.mp3`;

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const { theme } = useTheme();
  const isLightTheme = theme === 'light';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.volume = volume;
    audio.play().then(() => {
      setAutoplayBlocked(false);
    }).catch(() => {
      setAutoplayBlocked(true);
    });

    return () => audio.pause();
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || loadError) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    if (audioRef.current) audioRef.current.muted = nextMuted;
    setMuted(nextMuted);
  };

  const changeVolume = (event) => {
    const nextVolume = Number(event.target.value);
    if (audioRef.current) audioRef.current.volume = nextVolume;
    setVolume(nextVolume);
  };

  const panelClass = isLightTheme
    ? 'border-slate-200 bg-white/95 text-slate-900 shadow-slate-900/15'
    : 'border-white/15 bg-[#111111]/95 text-white shadow-black/40';
  const controlClass = isLightTheme
    ? 'text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-500'
    : 'text-white/90 hover:bg-white/10 focus-visible:ring-white';

  return (
    <>
      <audio
        ref={audioRef}
        src={musicSource}
        loop
        preload="auto"
        className="sr-only"
        aria-hidden="true"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setLoadError(true)}
      />
      {controlsOpen && (
        <section
          id="background-music-controls"
          aria-label="Background music controls"
          className={`fixed bottom-20 right-3 z-[60] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border p-3 shadow-xl backdrop-blur-md sm:right-6 ${panelClass}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Music2 className="h-4 w-4 shrink-0 text-[#E10600]" aria-hidden="true" />
              <span className="truncate text-sm font-semibold">Background music</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={loadError}
                title={autoplayBlocked && !playing ? 'Play Music' : playing ? 'Pause music' : 'Play music'}
                aria-label={autoplayBlocked && !playing ? 'Play Music' : playing ? 'Pause music' : 'Play music'}
                aria-pressed={playing}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E10600] px-3 text-sm font-semibold text-white transition hover:bg-[#b80500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isLightTheme ? 'focus-visible:ring-offset-white' : 'focus-visible:ring-offset-[#111111]'}`}
              >
                {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                <span>{autoplayBlocked && !playing ? 'Play Music' : playing ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={toggleMute}
                title={muted ? 'Unmute music' : 'Mute music'}
                aria-label={muted ? 'Unmute music' : 'Mute music'}
                aria-pressed={muted}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 ${controlClass}`}
              >
                {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                title="Close music controls"
                aria-label="Close music controls"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 ${controlClass}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label htmlFor="background-music-volume" className="shrink-0 text-xs font-medium">
              Volume
            </label>
            <input
              id="background-music-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={changeVolume}
              aria-label="Music volume"
              className="h-2 min-w-0 flex-1 accent-[#E10600]"
            />
            <span className="w-9 text-right text-xs tabular-nums" aria-hidden="true">
              {Math.round(volume * 100)}%
            </span>
          </div>
          {loadError && (
            <p role="status" className="mt-2 text-xs text-[#E10600]">
              Background music could not be loaded.
            </p>
          )}
        </section>
      )}
      <button
        type="button"
        onClick={() => setControlsOpen((open) => !open)}
        title={controlsOpen ? 'Close music controls' : 'Open music controls'}
        aria-label={controlsOpen ? 'Close music controls' : 'Open music controls'}
        aria-expanded={controlsOpen}
        aria-controls="background-music-controls"
        className={`fixed bottom-4 right-3 z-[60] flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 sm:right-6 ${isLightTheme ? 'border-slate-200 bg-white text-[#E10600] shadow-slate-900/20 focus-visible:ring-slate-500' : 'border-white/15 bg-[#111111] text-white shadow-black/40 focus-visible:ring-white'}`}
      >
        {playing ? <Music2 className="h-5 w-5 text-[#E10600]" aria-hidden="true" /> : <Music2 className="h-5 w-5" aria-hidden="true" />}
        {autoplayBlocked && !playing && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#E10600]" aria-hidden="true" />}
      </button>
    </>
  );
}
