import React, { useEffect, useRef, useState } from 'react';
import { Download, Maximize, MoreHorizontal, Pause, Play, Volume2 } from '../../icons';
import { Button, Field } from './index';

const formatTime = (seconds) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export default function WorkoutVideoPlayer({ src, title, downloadName }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState('1');
  const [error, setError] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const updatePlayState = () => setPlaying(!video.paused);
    const fail = () => setError('This video could not be played. Try opening the file directly.');
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    video.addEventListener('error', fail);
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('play', updatePlayState);
      video.removeEventListener('pause', updatePlayState);
      video.removeEventListener('error', fail);
    };
  }, [src]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setError('');
      } catch {
        setError('Playback was blocked. Press play again to start the video.');
      }
    } else {
      video.pause();
    }
  };

  const seek = (value) => {
    const next = Number(value);
    if (!videoRef.current || !Number.isFinite(next)) return;
    videoRef.current.currentTime = next;
    setCurrentTime(next);
  };

  const changeVolume = (value) => {
    const next = Number(value);
    setVolume(next);
    if (videoRef.current) videoRef.current.volume = next;
  };

  const changeRate = (value) => {
    setRate(value);
    if (videoRef.current) videoRef.current.playbackRate = Number(value);
  };

  const toggleFullscreen = async () => {
    const player = videoRef.current?.parentElement;
    if (!player) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await player.requestFullscreen();
    } catch {
      setError('Fullscreen is unavailable in this browser.');
    }
  };

  return (
    <div className="forma-step6__video-player">
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        aria-label={title}
        onClick={togglePlay}
      />
      {!playing && (
        <button type="button" className="forma-step6__video-play" onClick={togglePlay} aria-label={`Play ${title}`}>
          <Play aria-hidden="true" />
        </button>
      )}
      <div className="forma-step6__video-controls">
        <button type="button" className="forma-step6__video-toggle" onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'}>
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
        <span className="forma-step6__video-time">{formatTime(currentTime)}</span>
        <label className="forma-step6__scrubber">
          <span className="forma-app__visually-hidden">Video position</span>
          <input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(event.target.value)} aria-label="Video position" />
        </label>
        <span className="forma-step6__video-time">{formatTime(duration)}</span>
        <details className="forma-step6__video-menu">
          <summary aria-label="More video controls"><MoreHorizontal aria-hidden="true" /></summary>
          <div className="forma-step6__video-menu-content">
            <Field id="video-volume" label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => changeVolume(event.target.value)} icon={Volume2} />
            <Field id="video-speed" as="select" label="Playback speed" value={rate} onChange={(event) => changeRate(event.target.value)}>
              {['0.75', '1', '1.25', '1.5', '2'].map((value) => <option value={value} key={value}>{value}×</option>)}
            </Field>
            <Button type="button" variant="ghost" onClick={toggleFullscreen}><Maximize aria-hidden="true" /> Full screen</Button>
            {downloadName && <Button as="a" variant="ghost" href={src} download={downloadName}><Download aria-hidden="true" /> Download</Button>}
          </div>
        </details>
      </div>
      {error && <p className="forma-step6__video-error" role="alert">{error}</p>}
    </div>
  );
}
