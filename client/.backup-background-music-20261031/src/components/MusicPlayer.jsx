import React, { useEffect, useRef, useState } from 'react';
import { Music2, Pause } from 'lucide-react';

const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];

function playTone(context, output, frequency, duration, volume, type) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const startAt = context.currentTime;

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(volume, startAt + 0.025);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const intervalRef = useRef(null);
  const noteIndexRef = useRef(0);

  const stopMusic = async () => {
    window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (audioContextRef.current?.state === 'running') {
      await audioContextRef.current.suspend();
    }
    setPlaying(false);
  };

  const startMusic = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const context = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = context;
      if (context.state !== 'running') await context.resume();
      if (context.state !== 'running') return;

      const masterGain = context.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(context.destination);

      const playNextNote = () => {
        const noteIndex = noteIndexRef.current % melody.length;
        playTone(context, masterGain, melody[noteIndex], 0.34, 0.075, 'triangle');
        if (noteIndex % 4 === 0) {
          playTone(context, masterGain, melody[noteIndex] / 2, 0.62, 0.045, 'sine');
        }
        noteIndexRef.current += 1;
      };

      playNextNote();
      intervalRef.current = window.setInterval(playNextNote, 460);
      setPlaying(true);
    } catch (error) {
      setPlaying(false);
    }
  };

  useEffect(() => () => {
    window.clearInterval(intervalRef.current);
    audioContextRef.current?.close();
  }, []);

  return (
    <button
      type="button"
      onClick={playing ? stopMusic : startMusic}
      title={playing ? 'Pause background music' : 'Play background music'}
      aria-label={playing ? 'Pause background music' : 'Play background music'}
      aria-pressed={playing}
      className="fixed bottom-24 right-3 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#E10600] text-white shadow-lg shadow-[#E10600]/30 transition hover:bg-[#650000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6"
    >
      {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Music2 className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
